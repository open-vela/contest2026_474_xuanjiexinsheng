#!/usr/bin/env python3
"""Deterministic pre-release audit for a Vela QuickApp repository."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path


SECRET_PATTERNS = (
    re.compile(rb"tp-[A-Za-z0-9_-]{16,}"),
    re.compile(rb"sk-[A-Za-z0-9_-]{16,}"),
    re.compile(rb"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----"),
)
TEXT_SUFFIXES = {
    ".c", ".cc", ".cpp", ".css", ".h", ".html", ".js", ".json",
    ".md", ".mjs", ".py", ".sh", ".toml", ".ts", ".ux", ".xml",
    ".yaml", ".yml",
}


class Audit:
    def __init__(self) -> None:
        self.failures = 0
        self.warnings = 0

    def pass_(self, message: str) -> None:
        print(f"PASS  {message}")

    def fail(self, message: str) -> None:
        self.failures += 1
        print(f"FAIL  {message}")

    def warn(self, message: str) -> None:
        self.warnings += 1
        print(f"WARN  {message}")

    def check(self, condition: bool, success: str, failure: str) -> None:
        self.pass_(success) if condition else self.fail(failure)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--app", required=True, type=Path)
    parser.add_argument("--rpk", required=True, type=Path)
    return parser.parse_args()


def read_json(path: Path, audit: Audit, label: str) -> dict | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        audit.fail(f"{label} is not valid UTF-8 JSON: {path} ({error})")
        return None
    if not isinstance(value, dict):
        audit.fail(f"{label} root is not an object: {path}")
        return None
    audit.pass_(f"{label} is valid UTF-8 JSON")
    return value


def git_tracked_files(repo: Path, audit: Audit) -> list[Path]:
    result = subprocess.run(
        ["git", "-C", str(repo), "ls-files", "-z"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        audit.fail("repository is not readable by git")
        return []
    paths = [repo / raw.decode("utf-8") for raw in result.stdout.split(b"\0") if raw]
    audit.pass_(f"git tracked-file inventory is readable ({len(paths)} files)")
    return paths


def scan_secrets(paths: list[Path], audit: Audit) -> None:
    hits: list[str] = []
    for path in paths:
        if path.suffix.lower() not in TEXT_SUFFIXES or not path.is_file():
            continue
        try:
            data = path.read_bytes()
        except OSError:
            continue
        if any(pattern.search(data) for pattern in SECRET_PATTERNS):
            hits.append(str(path))
    audit.check(not hits, "tracked text contains no high-confidence secret pattern", "secret pattern found in: " + ", ".join(hits))


def find_log_validator(repo: Path) -> Path | None:
    configured = os.environ.get("OPENVELA_LOG_VALIDATOR")
    candidates = tuple(
        candidate for candidate in (
            Path(configured) if configured else None,
            repo / ".claude/skills/contest-log-collector/tools/validate-log.py",
            repo.parent / ".claude/skills/contest-log-collector/tools/validate-log.py",
        )
        if candidate is not None
    )
    return next((candidate for candidate in candidates if candidate.is_file()), None)


def audit_logs(repo: Path, audit: Audit) -> None:
    logs = repo / "logs"
    files = list(logs.rglob("*.jsonl")) if logs.is_dir() else []
    audit.check(bool(files), f"AI coding logs present ({len(files)} JSONL files)", "AI coding logs are missing")
    validator = find_log_validator(repo)
    if not files or validator is None:
        if validator is None:
            audit.warn("official AI log validator was not found; run it manually")
        return
    result = subprocess.run(
        [sys.executable, str(validator), str(logs)], check=False,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        encoding="utf-8", errors="replace",
    )
    audit.check(result.returncode == 0, "official AI log validation passed", "official AI log validation failed")


def audit_rpk(rpk: Path, source_manifest: dict | None, audit: Audit) -> None:
    audit.check(rpk.is_file(), f"RPK exists: {rpk}", f"RPK is missing: {rpk}")
    if not rpk.is_file():
        return
    audit.check(".release." in rpk.name and ".debug." not in rpk.name, "RPK filename identifies a production release", "RPK filename is not a production release")
    digest = hashlib.sha256(rpk.read_bytes()).hexdigest()
    audit.pass_(f"RPK SHA-256 {digest}")
    audit.pass_(f"RPK size {rpk.stat().st_size} bytes")
    try:
        with zipfile.ZipFile(rpk) as archive:
            bad = archive.testzip()
            names = set(archive.namelist())
            audit.check(bad is None, "RPK ZIP integrity passed", f"RPK ZIP member is corrupt: {bad}")
            for required in ("manifest.json", "manifest-watch.json", "META-INF/CERT"):
                audit.check(required in names, f"RPK contains {required}", f"RPK is missing {required}")
            packaged = json.loads(archive.read("manifest.json").decode("utf-8")) if "manifest.json" in names else None
            if isinstance(packaged, dict) and source_manifest:
                for field in ("package", "versionName", "versionCode"):
                    audit.check(packaged.get(field) == source_manifest.get(field), f"packaged {field} matches source", f"packaged {field} differs from source")
                pages = source_manifest.get("router", {}).get("pages", {})
                for route in pages:
                    bundle = f"{route}/{route.rsplit('/', 1)[-1]}.js"
                    audit.check(bundle in names, f"RPK contains route bundle {bundle}", f"RPK is missing route bundle {bundle}")
            else:
                audit.fail("packaged manifest could not be compared with source")
            zip_hits = []
            for name in names:
                if Path(name).suffix.lower() not in TEXT_SUFFIXES:
                    continue
                data = archive.read(name)
                if any(pattern.search(data) for pattern in SECRET_PATTERNS):
                    zip_hits.append(name)
            audit.check(not zip_hits, "RPK text contains no high-confidence secret pattern", "secret pattern found in RPK entries: " + ", ".join(zip_hits))
    except (OSError, zipfile.BadZipFile, KeyError, UnicodeError, json.JSONDecodeError) as error:
        audit.fail(f"RPK inspection failed: {error}")


def main() -> int:
    args = parse_args()
    repo = args.repo.resolve()
    app = (repo / args.app).resolve() if not args.app.is_absolute() else args.app.resolve()
    rpk = args.rpk.resolve()
    audit = Audit()

    audit.check((repo / ".git").exists(), f"git repository found: {repo}", f"not a git repository: {repo}")
    for name in ("README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"):
        audit.check((repo / name).is_file(), f"repository contains {name}", f"repository is missing {name}")
    license_text = (repo / "LICENSE").read_text(encoding="utf-8", errors="ignore") if (repo / "LICENSE").is_file() else ""
    audit.check("Apache License" in license_text and "Version 2.0" in license_text, "LICENSE declares Apache-2.0", "LICENSE is not recognizable as Apache-2.0")
    for relative in ("package.json", "package-lock.json", "src/app.ux", "src/manifest.json"):
        audit.check((app / relative).is_file(), f"app contains {relative}", f"app is missing {relative}")

    source_manifest = read_json(app / "src/manifest.json", audit, "source manifest") if (app / "src/manifest.json").is_file() else None
    if source_manifest:
        audit.check(bool(source_manifest.get("package")), "source manifest has package", "source manifest package is missing")
        audit.check(source_manifest.get("versionCode") == 1, "source versionCode is 1", "source versionCode is not 1")
        pages = source_manifest.get("router", {}).get("pages", {})
        audit.check(isinstance(pages, dict) and len(pages) >= 1, f"source manifest declares {len(pages) if isinstance(pages, dict) else 0} pages", "source manifest has no routes")

    tracked = git_tracked_files(repo, audit)
    private_paths = [path for path in tracked if path.name.lower() in {"private.pem", "id_rsa", "id_ed25519"}]
    audit.check(not private_paths, "no signing private key is tracked", "tracked private key path found: " + ", ".join(map(str, private_paths)))
    scan_secrets(tracked, audit)
    skills = list((repo / ".claude/skills").glob("*/SKILL.md")) if (repo / ".claude/skills").is_dir() else []
    audit.check(bool(skills), f"project Skill present ({len(skills)})", "project Skill is missing")
    audit_logs(repo, audit)
    audit_rpk(rpk, source_manifest, audit)

    print(f"SUMMARY failures={audit.failures} warnings={audit.warnings}")
    return 1 if audit.failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
