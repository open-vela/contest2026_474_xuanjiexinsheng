# 食衡

> 一款通过餐时主动提醒、30 秒快捷记餐和能量反馈，帮助用户低负担了解每日饮食状态的 openvela 腕上快应用。

食衡参加 2026 首届 openvela AI 硬件开发者大赛“快应用 / 手表应用创新”方向。它围绕“到饭点提醒 → 一句话记录一餐 → 计算已记录热量 → 结合系统健康状态给出建议”形成离线可用的完整闭环。

## 核心功能

- 首次设置每日饮食参考线和三餐时间段；默认 2000 kcal 是成人食品营养标签对照值，不是个人处方，也不要求必须吃满。
- 应用打开或恢复时展示餐时胶囊，支持现在记录、稍后提醒和本餐跳过。
- 约 60 项本地食品、最近吃过、收藏套餐、分类选择和份量调整。
- “一句话记餐（模拟器转写模式）”使用本地规则解析；可将台湾卤肉饭等常见套餐展开为可调整的组成项，未知食品和个性化要求不会被静默丢弃。
- 餐食确认、保存、修改、删除及热量即时回算。
- 首页用一条摄入进度条展示“今日已记录 / 每日饮食参考线”，同时显示三餐状态和连续记录天数。
- 最近 7 天只回顾饮食记录：有记录天数、有记录日平均摄入、每日已记录餐数和摄入。
- 通过 `service.health` 展示心率、血氧和压力；比赛模拟器中使用官方 Mock，能力缺失时不影响记餐主流程。
- 始终可用的本地规则建议；可选的 `system.velaclaw` AI 建议失败或超时后立即回退。
- 本地保存最近 30 天记录，断网时除可选 AI 建议外均可使用。

所有热量和健康信息仅供生活管理参考，不构成医疗、诊断、治疗或减重建议。

## 项目边界

当前比赛版本不实现腕上录音、云端 ASR、手机伴侣、蓝牙同步、云账号、拍照识餐、系统级灵动岛或后台常驻。比赛开放的 `service.health` 当前只提供心率、血氧和压力，无法读取系统步数、运动记录或活动热量。食衡因此不伪造自动运动同步，也不用心率或原始传感器数据推算消耗。

## 目录结构

```text
quickapp/shihe/                  食衡快应用源码、测试与构建配置
quickapp/shihe/releases/         生产签名 RPK
docs/01-prd.md                   产品需求文档
docs/02-tech-design.md           技术方案
docs/capability-matrix.md        openvela 能力与降级矩阵
docs/test-report.md              构建、模拟器和稳定性验证报告
logs/AuroraZW/                   官方格式 AI Coding 日志
.claude/skills/
  vela-quickapp-release-auditor/ 自建发布审计 Skill
THIRD_PARTY_NOTICES.md           食品数据与套餐估算边界说明
LICENSE                          Apache License 2.0
```

## 本地构建与测试

已验证工具链为 Node.js 22/24、npm 11、AIoT Toolkit 2.0.5，以及 AIoT Core / Emulator 1.7.22。

```bash
cd quickapp/shihe
npm ci
npm test
npm run build
```

`npm run build` 会生成 debug RPK，并自动审计六个路由页面是否均进入包内。生产构建需要将自己的测试签名材料放在被忽略的 `quickapp/shihe/sign/` 目录，再执行：

```bash
npm run release
```

签名私钥、API Key 和 Token 均不得提交到仓库。仓内生产包由最终响应式源码重新签名生成，并已完成 ZIP、CERT、manifest、六页 bundle、日志和秘密审计：

```text
quickapp/shihe/releases/com.openvela.contest2026.team474.shihe.release.1.0.0.rpk
文件大小: 84,803 bytes
SHA-256: 5de212c75943e345a207c830e98c8ad373cfa4625d6535dc380bbf020ea62502
```

## AIoT 比赛模拟器运行

1. 在 AIoT-IDE 的 Vela 模拟器管理中创建 `vela-miwear-watch-5.0（开发者大赛）` 实例；实际 image type 为 `vela-miwear-watch-5.0-beta`。
2. 启动模拟器，确认 `adb devices` 出现设备。
3. 安装并启动生产 RPK：

```bash
adb push quickapp/shihe/releases/com.openvela.contest2026.team474.shihe.release.1.0.0.rpk /data/quickapp/app/com.openvela.contest2026.team474.shihe.release.1.0.0.rpk
adb shell "pm install /data/quickapp/app/com.openvela.contest2026.team474.shihe.release.1.0.0.rpk"
adb shell "am start com.openvela.contest2026.team474.shihe"
```

AIoT Toolkit 1.7.22 会把比赛 beta 镜像误判为旧镜像，直接使用 `npm start` 可能走入不匹配的 `vapp` 部署路径；上述 `pm install` / `am start` 是本项目在比赛镜像上实测通过的安装方式。

首次启动进入设置页。保存饮食参考线和餐时后进入首页；比赛健康镜像会持续提供官方心率、血氧和压力 Mock 数据。

## openvela goldfish 验证

本项目使用比赛分支 `dev-ai-contest-2026` 的 64 位 goldfish 构建进行系统侧验证。启动 goldfish 后，在 Linux 主机执行：

```bash
rm -rf /tmp/com.openvela.contest2026.team474.shihe
mkdir /tmp/com.openvela.contest2026.team474.shihe
unzip -q quickapp/shihe/releases/com.openvela.contest2026.team474.shihe.release.1.0.0.rpk \
  -d /tmp/com.openvela.contest2026.team474.shihe
adb push /tmp/com.openvela.contest2026.team474.shihe /data/app
```

再在 goldfish 串口执行：

```text
vapp hap://app/com.openvela.contest2026.team474.shihe
```

生产 RPK 已用上述路径实际启动。当前开源 goldfish 运行时未注册 `system.router`，因此完整六页业务流程以 AIoT 比赛模拟器为准；goldfish 用于验证生产 RPK 可启动、VelaClaw 调用和本地降级。详细结果见 [测试报告](docs/test-report.md) 和 [能力矩阵](docs/capability-matrix.md)。

VelaClaw 的 `tp-` Key 只允许由用户在 goldfish 的 `ai_agent` 中私下配置，应用不接收、不持久化，也不把 Key 写入源码、RPK、日志、截图或视频。未配置 Key 时，食衡保持本地建议可用。

## 发布审计

仓库提供了实际用于发布前检查的 Skill：

```bash
python3 .claude/skills/vela-quickapp-release-auditor/scripts/audit_release.py \
  --repo . \
  --app quickapp/shihe \
  --rpk quickapp/shihe/releases/com.openvela.contest2026.team474.shihe.release.1.0.0.rpk
```

审计覆盖源码与包内 manifest 一致性、六页 bundle、RPK ZIP 完整性、生产签名标记、许可证、AI 日志、自建 Skill，以及高置信度密钥和私钥模式。截止日审计使用官方日志验证器复核 34 份 JSONL、1,383 个事件，结果为 `0 failures / 0 warnings`。

## AI Coding 使用说明

AI 参与了官方资料核对、需求拆解、技术方案、数据与降级设计、代码实现、测试用例、模拟器诊断、界面精修和发布审计。正式开发会话由比赛 hook 归档到 `logs/AuroraZW/`，并使用官方 `validate-log.py` 校验。

应用运行时的“AI 建议”和开发过程中的 AI Coding 是两条独立链路：前者是可选增强，失败时回退到本地规则；后者的日志和自建 Skill 是比赛交付的一部分。

## 许可证与数据来源

项目源码以 [Apache License 2.0](LICENSE) 发布。食品参考值、复合套餐默认份量及使用边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
