# 食衡官方提交要求检查表

更新日期：2026-09-20

本表依据比赛分支的[《大赛总览》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/contest_overview.md#L87-L121)、[《参赛代码提交指南》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/code_submission_guide.md#L51-L75)、[《快应用手动开发指南》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_manual.md#L231-L243)和[《AI Coding 日志归集与提交手册》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/ai_coding_log_guide.md#L263-L300)核对。状态只记录已经验证的事实。

## 1. 官方硬交付

| 项目 | 当前证据 | 状态 |
| --- | --- | --- |
| 快应用源码工程 | `quickapp/shihe/src/`、`package.json`、`package-lock.json`、`src/manifest.json`、测试与构建脚本 | 完成 |
| production `release.rpk` | 最终响应式源码已重新签名生成；84,803 bytes，SHA-256 `5de212c7...62502`；ZIP、CERT、manifest、六页 bundle、秘密扫描、AIoT clean-install 与 20 分钟回归通过 | 完成 |
| AI Coding 日志 | `logs/AuroraZW/` 当前 34 份 JSONL、1,383 个事件，2026-09-20 使用官方 `validate-log.py` 复核为 `ALL OK` | 完成 |
| 至少一个有效 Skill | `.claude/skills/vela-quickapp-release-auditor/` 已实际审计最终 RPK，结果 0 failures / 0 warnings | 完成 |
| 作品介绍文档 | 严格按官方模板完成 12 页 A4 DOCX/PDF；信息表、摘要及 3.1—3.7 完整，DOCX 内部关系零缺失，PDF 逐页检查通过 | 完成 |
| 不超过 5 分钟演示视频 | 真实模拟器截图与字幕版，H.264、1920×1080、270 秒；已替换最终窄屏证据并完成全文件解码 | 完成 |
| 专属仓地址 | `https://github.com/open-vela/contest2026_474_xuanjiexinsheng` | 已确定 |

## 2. GitHub 提交链

| 项目 | 当前状态 | 关闭条件 |
| --- | --- | --- |
| fork 开发分支 | `AuroraZW:feat/shihe-mvp` 已推送最终 Signed-off-by 提交 | 完成 |
| Signed-off-by | 最终发布提交 `1499057` 含 `AuroraZW <3053750681@qq.com>` | 完成 |
| 最终 PR | [PR #3](https://github.com/open-vela/contest2026_474_xuanjiexinsheng/pull/3) 已发向团队专属仓 `dev-ai-contest-2026` | 完成 |
| CLA / CI | PR #3 的 `cla/signature` / `cla-check` 为 success | 完成 |
| 自行 review / 合入 | PR #3 已以仓库允许的 rebase 方式合入，官方分支提交为 `9a5986d` | 完成 |
| 独立复现 | 已从官方分支全新 clone：`9a5986d`；源码、六页、RPK、哈希、34 份日志、Skill 与 LICENSE 均存在，日志验证 `ALL OK` | 完成 |
| 官方提交与回执 | 官网尚未上传 | 用户上传最终 ZIP 与仓库地址后保存回执 |

## 3. 发布质量门禁

- [x] P0 主闭环：设置、餐时胶囊、一句话/快捷记餐、确认、修改、删除、摄入回算和最近 7 天。
- [x] 断网或 VelaClaw 不可用时，本地建议和主流程继续工作。
- [x] `service.health` 官方 Mock 成功路径与普通镜像不支持路径均已验证。
- [x] 历史 RC1 production RPK 通过 package/version、CERT、ZIP、当时版本 bundle 和秘密扫描；不作为最终交付包。
- [x] 最终定版 production RPK 重新生成，并通过 ZIP、CERT、manifest、六页 bundle、日志和秘密审计。
- [x] 已删除手动运动补录和净摄入；当前无可靠系统步数/运动记录/活动热量接口，不伪造自动同步。
- [x] 六页功能与主视觉冻结；336×480 窄屏阻断问题已修复并完成逐页检查。
- [x] 最终 production RPK 连续运行 1,200.4 秒，21/21 检查点保持“食衡 · 今日”，运行问题计数为 0。
- [ ] VelaClaw 有 Key 成功路径由用户私下验证；此项失败不阻塞 P0 发布。
- [x] 官方模板 DOCX/PDF 已定稿，12 页逐页渲染检查通过，信息表无“待填”。
- [x] 字幕版 H.264 演示视频已制作，时长 270 秒（小于 5 分钟），ffprobe 检查和全文件解码均通过。

## 4. 安全、版权与范围

- [x] 根 `LICENSE` 为 Apache License 2.0。
- [x] `THIRD_PARTY_NOTICES.md` 说明食品参考值、产品默认配方和使用边界。
- [x] Git 跟踪文件和 RPK 不包含高置信度 `tp-`、`sk-` 或私钥头。
- [x] `sign/`、`node_modules/`、`build/`、`dist/` 和本地临时目录不入仓。
- [x] 不提交个人健康原始数据；健康 Mock 不外推为真机数据。
- [x] 初赛不新增腕上录音、云 ASR、手机伴侣、蓝牙同步、拍照识餐或系统级灵动岛。

## 5. 当前最短关键路径

1. 将最终验证记录通过补充 PR 合入团队专属仓。
2. 用户立即在官网上传已校验的官方命名 ZIP、填写官方团队仓地址并保存回执。
