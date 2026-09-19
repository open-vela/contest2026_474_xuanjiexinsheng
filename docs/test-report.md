# 食衡测试与发布验证报告

## 1. 基线

- 测试更新日期：2026-09-20
- 源码分支：`feat/shihe-mvp`
- 包名：`com.openvela.contest2026.team474.shihe`
- 版本：`1.0.0`（`versionCode: 1`）
- 最终生产包：`com.openvela.contest2026.team474.shihe.release.1.0.0.rpk`
- 文件大小：84,797 bytes
- SHA-256：`341da1032b20fcbd920bf66d89ed2f551be60f8f7f185a8e248026f61ee1c8ee`

本报告只记录已经实际完成的验证。最终生产包已由当前响应式源码重新生成并完成静态发布审计；用户私下配置 `tp-` Key 后的 VelaClaw 成功回复尚未作为通过项，它不是 P0 发布门禁。

## 2. 自动化与构建

在 Ubuntu VM 和 Windows AIoT 工具链执行：

```bash
cd quickapp/shihe
npm test
npm run build
```

结果：

- 食品文本解析、未知项保留、餐食确认与回算测试通过。
- 饮食参考线、已记录摄入、连续记录、7 天饮食趋势、30 天保留和餐时状态测试通过。
- 健康样本归一化、无响应 watchdog、高压力本地建议测试通过。
- VelaClaw 脱敏上下文、基础设施错误识别、空回复和 10 秒超时回退测试通过。
- goldfish 缺少 `system.router` 时的入口降级测试通过。
- debug RPK 构建通过；构建审计确认 index、onboarding、home、meal、confirm、history 六个页面均进入包内。

### 2026-09-20 最终可用性代码回归

- 新用户无需填写体重；旧 V1 中的可选体重和运动记录仍可通过校验，但不显示也不参与新计算。
- 每日饮食参考线编辑范围为 1200–4000 kcal、步长 100 kcal；低于 1500 kcal 显示谨慎提示；1200、2000、4000 与 2000 kcal 标签参考值的相对文案断言通过。
- 首页只保留今日已记录摄入、参考线进度、三餐文字状态和连续记录天数；旧运动记录不改变摄入进度。连续记录已覆盖今日有/无记录、昨日断档和跨月场景。
- 最近 7 天只计算有记录天数、有记录日平均摄入、每日已记录餐数和摄入；空日不进入平均值分母。
- 一句话记餐、四个套餐模板、60 项快捷目录、增减/移除/清空、未知项待确认等原有测试继续通过。
- 全部 8 个 Node 测试文件、六页 bundle 审计和 debug RPK 构建通过；未新增外部 API、权限、存储版本或页面。
- 最新源码的全部 8 个 Node 测试文件通过；debug RPK 构建及 index、onboarding、home、meal、confirm、history 六页 bundle 审计通过。
- 336×480 `xiaomi_band_pro` 真正窄屏 skin 已完成六页检查，响应式布局未见横向溢出，主操作和列表控制均可触达；466×466 比赛健康模拟器关键流程和 480×480 方屏宽布局已完成检查。

Windows 使用本地且被 Git 忽略的签名材料执行 `npm run release` 成功，生成上述最终生产包。签名私钥未复制到 VM、比赛仓或证据目录。发布审计确认 RPK ZIP、CERT、manifest、六页 bundle、包名、版本和秘密扫描通过。

## 3. AIoT 比赛健康模拟器

验证环境：

- AIoT Core / Emulator 1.7.22
- 镜像标签：`vela-miwear-watch-5.0（开发者大赛）`
- image type：`vela-miwear-watch-5.0-beta`
- 实例：`shihe-health-watch`
- 466 × 466 圆屏，density 320

历史 RC1 production RPK 通过 `pm install` 安装，并通过 `am start com.openvela.contest2026.team474.shihe` 启动。当时版本的首次设置、首页、记餐、确认和历史页面均能打开；重启后设置与业务记录保留。最终生产包已完成静态发布审计，AIoT clean-install 结果在截止日最终复核后补记。

2026-09-17 使用最终可用性源码生成的 debug RPK 重新安装并清空旧状态后，实测结果如下：

- 首次设置不再要求体重，页面直接显示 `2000 kcal` 标签参考值的用途和边界；保存后重启仍保留设置。
- 首页空态只显示今日已记录、参考线进度、连续记录和三餐状态；无运动入口、净摄入或食品种类指标。
- “一句话记餐”默认示例“台湾卤肉饭”成功展开为米饭 200g、红烧肉 100g、水煮蛋 50g、清炒青菜 80g，合计 676 kcal，并显示常见份量估算提示。
- 确认页可对每个组成项执行减量、加量和删除；保存后首页立即显示 676 kcal、34% 和连续记录 1 天。
- 最近 7 天页面显示有记录天数 `1/7` 和有记录日平均 `676 kcal`，每日明细只保留餐数和摄入。
- `service.health` 本轮观察到心率/血氧/压力为 101/99/40，并明确标注比赛模拟器中为官方 Mock、不得用于热量计算或诊断。

本轮审核截图保存在工作区外的证据目录，待用户集中确认后再选取不含桌面背景的页面截图进入 `docs/screenshots/`。

`service.health` 实际订阅得到官方 Mock 数据。历次观察包括 HEART_RATE/SPO2/STRESS 为 81/99/41、89/98/42、108/99/12、120/97/37，以及 RC1 验收时的 97/98/34。数值仅证明模拟器 Mock 链路，不代表真实健康测量。压力较高时本地建议会切换为一分钟呼吸提醒；离开首页后退订，返回首页重新建立一组订阅。

在普通 `vela-watch-5.0` 镜像中，运行日志确认 `service.health` 未注册。食衡稳定显示“当前设备暂不支持”，记餐、历史和设置仍可使用。

### 20 分钟稳定性

历史有效复测持续 1,566.5 秒，21 个页面检查点均匹配预期页面标题；未观察到应用崩溃、黑屏或数据损坏。该结果完成于响应式窄屏补丁前，补丁后的最终包需再完成一次聚焦三尺寸冒烟测试；报告不把历史结果表述成最终包重跑结果。

稳定性脚本每轮显式启动食衡并验证页面标题，避免把系统表盘误计为通过。最终发布仍以最新包的三尺寸冒烟和 clean-install 为停止线。

## 4. openvela goldfish

构建目标：`vendor/openvela/boards/vela/configs/goldfish-arm64-v8a-ap/`。

已验证配置包含：

```text
CONFIG_QUICKAPP=y
CONFIG_QUICKAPP_VAPP=y
CONFIG_FEATURE_SYSTEM_VELACLAW=y
CONFIG_EXAMPLES_AI_AGENT_VELA=y
CONFIG_MQ_MAXMSGSIZE=4096
```

已完成 debug RPK 启动和 VelaClaw 无 Key 降级验证：调用到达 `system.velaclaw` 和 `ai_agent`，后端返回不可用时，食衡识别基础设施错误并显示“AI 暂不可用，已保留本地建议”。

RC1 production RPK 也已完成实际验证：RPK 解包为 14 个文件并推送到 `/data/app/com.openvela.contest2026.team474.shihe`，串口执行 `vapp hap://app/com.openvela.contest2026.team474.shihe` 后，日志确认：

- 从生产包目录初始化，识别包名 `com.openvela.contest2026.team474.shihe` 和版本 `1.0.0`；
- `system.storage` 与 `system.velaclaw` 成功加载；
- `pages/index` 完成 build、ready 和 show；
- 应用持续运行且未自行退出，随后由测试人员正常中止并返回 `goldfish-armv8a-ap>` 提示符。

当前开源 goldfish 虽在构建配置中启用了 router，运行时仍未注册 `system.router`；根 URI 因此展示 index 验证页，完整六页流程由 AIoT 比赛模拟器承担。goldfish 输出中的 LVGL `CRIT [User]` 是该端口的 framebuffer 初始化日志级别，后续显示初始化和 QuickApp 启动均继续成功，不能单独按崩溃解读。

## 5. 数据与降级验证

- 空状态：首次启动进入设置，不要求与当前功能无关的体重数据。
- 损坏存储：提示用户并允许明确重建，不静默覆盖。
- 未知食品：展示待处理文本，必须替换或明确忽略后才能确认。
- 断网或 AI 不支持：本地食品库、记餐、历史和规则建议继续工作。
- 健康能力缺失、暂时失败、无有效样本：分别显示对应状态，不阻塞主流程。
- 系统运动边界：当前公开接口无法读取系统步数、运动记录或活动热量；应用不伪造此类数据，也不提供易被误解的手动替代值。
- 修改和删除：餐食变更后，首页已记录摄入、参考线进度和最近 7 天立即重算。

## 6. 安全与隐私

- Git 跟踪文件和 RPK 文本均扫描高置信度 `tp-`、`sk-` 和私钥头模式。
- `sign/`、`node_modules/`、`build/` 和 `dist/` 被忽略。
- VelaClaw 只发送当天汇总和布尔状态，不发送原始健康样本；调用前要求用户确认。
- `tp-` Key 仅由用户在 goldfish `ai_agent` 中私下配置，不进入应用、仓库、AI 日志、截图或视频。
- 官方 `validate-log.py` 用于校验 `logs/AuroraZW/`；不得手工改写 JSONL。
- 2026-09-20 使用比赛分支最新官方验证器检查 34 份 JSONL、1,383 个事件，结果为 `ALL OK`。
- 自建发布审计 Skill 对最终 RPK 实际执行，结果为 `0 failures / 0 warnings`。

## 7. 尚未关闭的非 P0 项

- VelaClaw 有 Key 成功回复需要用户私下完成一次最终验证；失败时保留本地建议，不阻塞发布。
- `system.alarm` 未纳入发布基线；餐时胶囊在应用打开或恢复时判断。
- 初赛不依赖真机、系统运动数据同步、手机伴侣或云服务。
- 336×480 窄屏、466×466 圆屏和 480×480 方屏均已完成布局检查；最终包仍须完成 AIoT clean-install 冒烟，VM 不可用时不得把历史 goldfish 结果写成最终包复验。
