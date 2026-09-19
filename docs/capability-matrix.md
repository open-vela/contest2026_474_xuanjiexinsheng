# 食衡能力矩阵（最终定版开发进度）

本文严格区分本机已验证环境事实、已知目标设备约束与计划能力；除明确写为“已验证”的内容外，不代表已实现或跑通。

## 1. 已验证环境事实

- Windows 的 `C:\Users\30537\.vela\sdk\system-images\vela-miwear-watch-5.0` 是普通 2025-07 镜像，不是比赛健康镜像。
- 比赛 UI 标签是 `vela-miwear-watch-5.0（开发者大赛）`，实际 `imageType` 为 `vela-miwear-watch-5.0-beta`；该比赛镜像已安装，466×466 圆屏 VVD `shihe-health-watch` 已创建并成功启动，启动日志出现 `service_health_onRegister`。
- 食衡早期 M1 debug RPK 已在 `shihe-health-watch` 完成安装、重启和持久化验证。最终版已移除不再使用的体重录入，尚须用新 debug RPK 重跑截图审核。
- M3 模拟器验收已完成：新增、编辑、冷重启、历史、删除及即时回算均通过。
- Ubuntu VM 当前开源 goldfish 构建的 `.config` 同时包含 `CONFIG_FEATURE_SYSTEM_ROUTER=y` 与 `CONFIG_FEATURE_SYSTEM_VELACLAW=y`，但运行时日志确认未注册 `system.router`；该现象不代表所有 openvela 真机都缺少 router。
- 当前 goldfish 已运行食衡 debug RPK：QuickApp、`system.velaclaw` 与 `ai_agent` 已启动；同一 RPK 从根 URI 启动时使用 index 验证降级页，完整六页流程以 AIoT 比赛模拟器为准。M4 无 Key 运行验收已通过：应用成功调用 `system.velaclaw`，`ai_agent` 记录 `No available backend` 并返回英文基础设施失败回复，应用识别该回复后显示中文本地降级“AI 暂不可用，已保留本地建议”；相关测试与 debug 构建通过。配置 Key 后的成功路径仍待用户私下验证，不记为通过。
- 2026-09-11 已完成食衡 debug RPK 的比赛健康镜像与普通 `vela-watch-5.0` 镜像双镜像健康运行验收；该结论不等于 release RPK、goldfish 或真机已验证。
- `tp-` key 仅由用户在官方 goldfish `ai_agent` 配置界面私下输入。食衡应用绝不接收或存储 key，也不设计自建后端。

### 2026-09-11 双镜像健康运行验收

**真实运行证据**

- 在比赛健康镜像 `vela-miwear-watch-5.0-beta`（UI 标签 `vela-miwear-watch-5.0（开发者大赛）`）、466×466 圆屏 VVD `shihe-health-watch` 上，食衡 debug RPK 自动订阅 `service.health` 成功。多次观察 HEART_RATE/SPO2/STRESS 分别为 81/99/41、89/98/42、108/99/12，最新修复后复测为 120/97/37，均落在官方 Mock 范围；这些数据仅证明模拟器 Mock 链路跑通，不代表真机验证。
- 压力为 42 时，本地建议自动切换为“先慢慢呼吸一分钟”方向。离开首页进入记餐页再返回后，三项健康数据重新刷新。
- 在普通 `vela-watch-5.0` 镜像上，运行日志明确显示未注册 `service.health`、native feature 找不到，import 结果为 `undefined`。食衡稳定显示心率、血氧、压力三项“当前设备暂不支持”，首页不崩溃，记餐、最近 7 天和设置等主流程入口仍可用。
- debug RPK 在没有 IDE 调试配置时会先等待约 10 秒 inspector，再继续启动；该现象属于工具链调试等待，不是业务崩溃。
- 运行截图和原始模拟器 stdout 证据保存在 Windows 本地、Codex 工作区外部的证据目录；仓库不记录机器绝对路径。

**源代码静态审计**

- 已审计健康订阅生命周期：`onHide` / `onDestroy` 执行退订，并以 session guard 隔离失效会话回调。该项是源码控制流结论；实际离页再返回的数据刷新由上述真实运行证据单独证明。

**复测步骤**

1. 在 `shihe-health-watch` 启动食衡 debug RPK，确认自动订阅成功、三项官方 Mock 数据出现；进入记餐页再返回首页，确认数据重新刷新，并检查压力值触发的本地建议方向。
2. 在普通 `vela-watch-5.0` 启动同一 debug RPK，确认日志中的 feature 缺失和 `undefined` import；确认三项统一显示“当前设备暂不支持”，且首页、记餐、最近 7 天和设置入口可继续使用。
3. 无 IDE 调试配置时允许约 10 秒 inspector 等待，以等待结束后应用能否继续启动判断结果。

## 2. 已知目标设备约束（非本机环境事实）

- Smart Band 10 Pro 是已知目标设备约束，不是初赛验收设备。
- 已知该目标设备不具备录音器/语音助手，因此食衡不把真实腕上录音或语音助手列为能力；这不等同于已在该设备完成食衡验收。

## 3. 交付与验证矩阵

| capability | delivery priority | validation environment / current state | fallback | blocking |
| --- | --- | --- | --- | --- |
| 本地存储（`system.storage`） | P0，已实现 | 比赛 VVD 已验证首次设置和餐食持久化，冷重启后保留 | 写失败保留草稿并明确提示；内存态只用于继续演示 | 是；已通过 RC1 验证 |
| 餐时胶囊 | P0，已实现 | 应用打开/恢复计算 pending/later/skipped/completed，已记录时显示餐次与热量 | 无系统闹钟时仍按本地状态在下次打开/恢复判断 | 是；已通过功能测试 |
| 最近吃过 / 收藏套餐 | P0，已实现 | 最近项、整餐收藏和分类选择已进入六页业务流程 | 目录选择；仍须确认后保存 | 是；已通过构建与模拟器验证 |
| 一句话记餐与食品目录 | P0，已实现 | 一句话记餐为默认入口；60 项本地食品、四个常见套餐模板、半份/一份/两份缩放及冻结解析样例通过自动测试。466×466 实测文本 picker、台湾卤肉饭展开、确认页，以及快捷目录 60 项、加入和移除均正常 | 最近项、收藏和手动目录位于备用的“快捷选择”；套餐假设和待处理内容明确展示，禁止静默保存 | 是；自动测试、debug 构建与 466×466 关键流程通过 |
| 今日记录与 7 天摘要 | P0，已实现 | 首页只使用已保存餐食计算摄入进度、三餐状态和连续记录；7 天摘要只计算有记录天数、有记录日平均摄入与每日餐数 | 数据不足时如实显示零值和“仅根据已记录餐食”提示 | 是；纯计算测试与六页 debug 构建通过，新版 466×466 截图待审核 |
| 餐食修改与删除 | P0，已实现 | 首页和历史即时回算、冷重启保留已通过模拟器验收 | 操作失败保留原记录并提示 | 是；已通过模拟器验证 |
| 系统运动数据 | 当前不可用 | 本次比赛 `service.health` 仅开放 HEART_RATE/SPO2/STRESS，无法取得系统步数、运动记录或活动热量汇总 | 不生成 Mock，不用心率反推，不提供可被误解为系统数据的手动入口 | 否；未纳入初赛范围 |
| goldfish RPK | P0 部署证据 | 历史 production RC1 已解包推送并由 `vapp` 启动；最终响应式源码的 production RPK 已重新生成并通过静态发布审计，但截止日 VM SSH 超时，尚未将最终包重新部署到 goldfish | index 明示环境边界并提供 VelaClaw 无 Key 降级验证；VM 不可用时如实保留历史运行证据，不伪造最终复验 | 否；初赛完整流程以 AIoT 比赛模拟器为准 |
| 比赛健康镜像与 VVD | P1 验证载体 | `vela-miwear-watch-5.0-beta` 已安装；466×466 圆屏 `shihe-health-watch` 已创建并成功启动，ADB 为 `emulator-5554` | 健康卡能力未接入或不可用时显示不可用 | 否 |
| `service.health` HEART_RATE/SPO2/STRESS | P1，可选增强 | 2026-09-11 已在比赛健康镜像完成 debug RPK 官方 Mock 运行验收；普通 `vela-watch-5.0` 无此 feature 的降级运行验收亦通过；真机未验证 | “系统健康数据”卡明确由 `service.health` 自动读取；不支持显示“当前设备暂不支持”，读取错误显示“健康数据暂时读取失败”，无效样本显示“暂无有效健康数据”；主流程照常 | 否 |
| `system.alarm` | 可选增强，待验证 | 支持该 feature 的 VVD/真机；当前环境未验证 | 保存该餐稍后时间，仅在下次打开/恢复时提示 | 否；不是 P0 阻塞项 |
| VelaClaw | P1，可选增强 | goldfish 已注册 `system.velaclaw` 且 `ai_agent` 已启动；M4 已验证无 Key 时调用到达系统、后端不可用回复被拦截并显示中文本地降级；测试与 debug 构建通过。配置 Key 后成功路径仍待用户私下验证，不记为通过 | 用户确认全零脱敏汇总后调用；能力缺失、失败、空回复、基础设施失败回复或 10 秒超时显示“AI 暂不可用，已保留本地建议” | 否 |
| 真实腕上录音 / 云端 ASR | P2，明确不做 | 无交付验证环境 | 明示边界的模拟器转写文本选择与本地确定性解析 | 否；禁止宣称 |
| 自建云服务器 / 云账号 / 多设备同步 | P2，明确不做 | 无交付验证环境 | 设备本地独立运行、30 天保留 | 否；禁止宣称 |
| 手机伴侣 App / 蓝牙同步 / 小米运动健康写入 | P2，明确不做 | 无交付验证环境 | 设备本地独立运行 | 否；禁止宣称 |
| 拍照识餐 / 条码扫描 | P2，明确不做 | 无交付验证环境 | 本地目录、最近项、收藏和文本演示 | 否；禁止宣称 |
| 系统级灵动岛 / 后台常驻 | P2，明确不做 | 餐时胶囊仅为应用前台组件 | 应用打开/恢复时刷新 | 否；禁止宣称 |
| 医疗诊断 / 减重疗效 / 精确代谢预测 | P2，明确不做 | 所有界面只提供生活管理估算 | 固定免责声明 | 否；禁止宣称 |

`blocking` 表示冻结交付门禁，不代表所有硬件具备对应系统能力。探测成功前，UI 不得展示成功状态或虚构数据。

## 4. 验证约束

- 比赛健康镜像上的 `service.health` 官方 Mock 订阅与普通镜像 feature 缺失降级均已完成 debug RPK 真实运行验收；源码生命周期审计与运行证据分别记录，二者不能互相替代。
- 历史 RC1 production RPK 已在 AIoT 比赛健康镜像完成当时版本的业务验收，并在 goldfish 完成解包、推送和 index 启动；最终定版源码的 production RPK 已重新生成并通过静态审计，AIoT clean-install 作为最终冒烟，goldfish 因 VM 不可用则如实记录未复验。初赛不要求真机，任何模拟器结论也不外推为真机验证。
- “官方文档支持”不等于当前固件启用；须记录镜像/固件、权限、调用结果、日志或截图。
- 模拟器 HEART_RATE、SPO2、STRESS 是官方 Mock 数据，必须标注模拟来源，不能外推为真机验证；只在页面可见时读取/订阅，离页取消。
- 心率和血氧只展示；压力仅可触发温和本地建议。三类健康数据均不持久化、不进热量公式、不诊断。
- 长期产品方向是在官方提供可靠读取接口后接入系统步数、运动记录或活动热量；初赛不伪造运动数据，也不宣称系统运动同步。
- goldfish 的编译配置不等于运行时 feature 已注册；本次 `ROUTER=y` 但 `system.router` 未注册是当前开源 goldfish 构建的实测结果，不能外推至所有 openvela 真机。
- VelaClaw 无 Key 降级已完成 goldfish 实际验收；配置 Key 后的成功路径仍待用户在官方界面私下验证，当前不得宣称成功。应用不得接收 key，不得发送不存在或推断的健康/个人数据。
- 核心验收以断网且所有可选能力关闭时仍可记录、确认保存、修改、删除、聚合并查看历史为准。
- 视觉以比赛镜像的 466×466 圆屏为优先验收环境：接近纯黑背景、深灰卡片、暖橙主操作、绿色完成状态、大数字与统一圆角。466×466 圆屏、480×480 方屏和真正的 `xiaomi_band_pro` 336×480 窄屏均已完成布局复核；审核截图已归档到 `docs/screenshots/`。

## 5. 官方链接

- [大赛总览](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/contest_overview.md)
- [手表应用赛道指引](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/watch_app_track_guide.md)
- [快应用手动开发指南](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_manual.md)
- [service.health 手册](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/service_health_guide.md)
- [system.velaclaw 教程](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_velaclaw.md)
- [Xiaomi Vela system.velaclaw 接口](https://iot.mi.com/vela/quickapp/zh/features/other/velaclaw.html)
