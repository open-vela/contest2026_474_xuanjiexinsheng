# 食衡技术设计（规格冻结版）

版本：`1.0.0`　`versionCode: 1`　工程：`quickapp/shihe`　包名：`com.openvela.contest2026.team474.shihe`

## 1. 原则

离线优先、能力探测、明确降级、确认后写入。P0 不依赖网络、手机、录音、云 ASR、`service.health`、`system.alarm` 或 VelaClaw。系统 feature 的准确 import、manifest、参数、返回结构、错误码和生命周期，以实现时对应版本官方文档及实测为准，不臆测 vendor API，也不声称待验证能力已跑通。

## 2. 页面与模块

七个主要页面保持简单：首次设置、首页、记餐、确认、运动、历史、设置。一句话记餐作为记餐页默认模式，最近项、收藏和目录位于备用的快捷选择模式；建议、餐时胶囊和系统健康数据卡内嵌首页；日明细在历史页内展开。

```text
quickapp/shihe/src/
├── app.ux
├── manifest.json
├── common/
│   ├── state.js             # V1 状态、目标编辑边界与校验
│   ├── state-store.js       # system.storage 单一读写入口
│   ├── meal-domain.js       # 餐食草稿、快照与回算
│   ├── meal-text-parser.js  # 一句话记餐纯确定性解析器
│   ├── energy-domain.js     # 今日三环与 7 天摘要
│   ├── health-service.js    # service.health 生命周期适配
│   └── velaclaw-service.js  # AI 建议与确定性降级
├── data/
│   ├── foods.js             # 固定 60 项只读目录
│   └── meal-templates.js    # 四个复合菜模板，仅引用目录食品
└── pages/
    ├── index/           ├── onboarding/  ├── home/
    ├── meal/            ├── confirm/     ├── exercise/
    └── history/
```

## 3. 数据模型

时间为毫秒 epoch；`localDate` 是保存时设备本地日 `YYYY-MM-DD`；千卡快照四舍五入为整数。

### ProfileV1

```text
ProfileV1 {
  schemaVersion: 1,
  weightKg: number,
  dailyTargetKcal: integer,
  mealWindows: {
    breakfast: { start: "HH:mm", end: "HH:mm" },
    lunch: { start: "HH:mm", end: "HH:mm" },
    dinner: { start: "HH:mm", end: "HH:mm" }
  },
  disclaimerAcceptedAt: number,
  updatedAt: number
}
```

默认 `dailyTargetKcal = 2000`；编辑器产品范围为 1200–4000 kcal、步长 100 kcal，低于 1500 kcal 显示专业指导提示。V1 持久化校验继续兼容历史 800–5000 kcal；历史值只在进入编辑器时定位到最近边界，用户保存后才更新。默认餐段为早餐 07:00–09:30、午餐 11:30–14:00、晚餐 17:30–20:30。`weightKg` 必须由用户有效输入，不提供可让用户静默完成引导的默认体重。Profile 不采集年龄、年龄段或身高。

### FoodV1

```text
FoodV1 {
  id: string, name: string, category: string,
  basisUnit: "g" | "ml",
  energyKcalPer100: number,
  defaultServing: { label: string, amount: number, unit: string },
  parseUnits: object, aliases: string[],
  sourceId: string, sourceNote: string, tags: string[]
}
```

交付目录固定 60 项。`energyKcalPer100` 是唯一能量事实源，所有份量统一换算到 `basisUnit`：

```text
itemKcal = round(energyKcalPer100 * amount / 100)
mealTotal = sum(itemKcal)
```

每项必须可追溯到 `sourceId/sourceNote`；所用第三方数据与素材在交付前汇总到 `THIRD_PARTY_NOTICES`。

### MealRecordV1

```text
MealRecordV1 {
  schemaVersion: 1, id: string, createdAt: number, updatedAt: number,
  localDate: "YYYY-MM-DD", mealType: "breakfast" | "lunch" | "dinner" | "snack",
  source: "catalog" | "recent" | "favorite" | "transcript-demo",
  items: [{ foodId: string, nameSnapshot: string, amount: number,
    basisUnit: "g" | "ml", energyKcalPer100Snapshot: number, kcalSnapshot: integer }],
  totalKcalSnapshot: integer
}
```

实际数量、单位和每百单位能量均保存快照，使历史可解释；合计等于各项 `kcalSnapshot` 之和。未知或待处理文本不得进入正式记录。

### ExerciseRecordV1

```text
ExerciseRecordV1 {
  schemaVersion: 1, id: string, createdAt: number, updatedAt: number,
  localDate: "YYYY-MM-DD",
  activity: "brisk_walk" | "run" | "cycle" | "rope" | "strength" | "yoga",
  metSnapshot: number, weightKgSnapshot: number,
  durationMinutes: integer, kcalSnapshot: integer
}
```

六类及固定演示 MET 值：快走 3.5、跑步 8.0、骑行 6.8、跳绳 10.0、力量训练 5.0、瑜伽 2.5。时长 1–600 分钟；MET 和体重保存快照，参数变化不改历史。

### 根状态与保留

唯一存储键：`shihe_state_v1`。

```text
FavoriteMealV1 {
  id: string, name: string, createdAt: number, updatedAt: number,
  items: [{ foodId: string, amount: number, basisUnit: "g" | "ml" }]
}
```

收藏套餐只保存复用草稿所需字段。复用时必须按当前食品目录重新计算，进入确认页，并在用户确认后才保存为正式餐食。

```text
ShiheStateV1 {
  schemaVersion: 1, profile: ProfileV1 | null,
  meals: MealRecordV1[], exercises: ExerciseRecordV1[],
  recentFoodIds: string[], favoriteMeals: FavoriteMealV1[],
  mealPromptState: {
    localDate: "YYYY-MM-DD",
    breakfast: { status: "pending" | "later" | "skipped" | "completed", remindAt?: number },
    lunch: { status: "pending" | "later" | "skipped" | "completed", remindAt?: number },
    dinner: { status: "pending" | "later" | "skipped" | "completed", remindAt?: number }
  },
  lastMaintenanceAt: number
}
```

系统能力状态仅在运行时探测，不持久化为业务状态。启动、成功保存和跨日恢复时保留今天及之前 29 个本地自然日。解析失败、未知 schema 或校验失败时不覆盖原值，本会话进入安全模式并提示数据损坏与清除选项。写入按“完整对象序列化 → 校验 → 单键替换”；记录 ID 保证幂等。

## 4. 公式与即时回算

```text
exerciseKcal = round(MET * 3.5 * weightKg / 200 * durationMinutes)
intake = sum(meal.totalKcalSnapshot)
exerciseEstimate = sum(exercise.kcalSnapshot)
netIntake = intake - exerciseEstimate
intakeTargetDeltaKcal = dailyTargetKcal - intake
```

MET 为固定估算，不用健康数据修正。初赛运动数据来自用户手动补录，不是系统自动同步。首页以“今日已摄入”为主数字，紧邻显示每日饮食参考目标。下方三环分别由纯计算得出：饮食环为 `intake / dailyTargetKcal`，记录环为今日已记录早餐、午餐、晚餐数除以 3，食物多样环为今日不同 `foodId` 数除以 12；显示百分比时截断在 0–100%，但真实数值不被修改。手动补录运动估算消耗和估算净摄入作为次级信息，只改变 `exerciseEstimate` 和 `netIntake`，不得改变饮食环或目标差值。新增、修改或删除任一餐食/运动记录后立即重新聚合。7 天视图含今天在内连续 7 个本地自然日，并计算有记录天数、有记录日平均摄入与不同食品数；空日补零但不进入平均值分母。

## 5. 确定性文本解析器

输入仅来自记餐页默认打开的“一句话记餐（模拟器转写模式）”；餐次下方以 `entryMode = transcript | quick` 切换默认文本入口与备用快捷选择，切换不得清空文本或已选草稿。初赛界面使用当前比赛镜像稳定支持的文本 picker 选择明确标记的转写示例；本地解析器仍覆盖任意符合语法的字符串。入口醒目标明“不是录音或语音识别”，无麦克风访问。

```text
ParseResult {
  status: "complete" | "needs_review" | "empty",
  recognizedItems: ParsedItem[], unknownSegments: UnresolvedFragment[],
  items: ParsedItem[], unresolved: UnresolvedFragment[], // 兼容字段
  assumptions: [{ templateId, templateName, scale, note, components }]
}
```

1. 输入最多 80 字，切分后最多 12 个片段；空输入返回 `empty`。
2. 先对四个套餐模板及别名做完整片段匹配，再对 60 项规范名和别名做最长别名优先匹配；模板展开为已有 FoodV1 明细，不进入持久化模型。
3. 支持有限中文数字、阿拉伯数字，以及对应 FoodV1 `parseUnits` 明确声明的单位。
4. 只有完全未提供数量时，才以 `defaultServing` 产生候选，且 UI 必须明确展示所用默认份量。
5. 套餐支持未写份量时的一份常见餐厅估算，以及半份、一份、两份整体缩放；结果展示组成项、默认份量和“餐厅配方与实际重量可能不同”的假设。
6. 数字无单位、单位不支持、未知词、中英混合未知内容、否定语义，以及“少饭、不要蛋、加肉”等无法可靠执行的套餐修饰语均放入 `unresolved`，返回 `needs_review`；禁止模糊猜测、静默丢弃或保存。
7. 解析器是无存储副作用的纯函数；模板组成项仍可在确认前增减或删除，只有用户提交后才构造正式记录，`assumptions` 不写入 `MealRecordV1`。

冻结测试样例：

- “一碗米饭、一份番茄炒蛋、一杯无糖豆浆”应完整解析为 `complete`。
- “米饭200克、鸡胸肉150g”应完整解析为 `complete`。
- “台湾卤肉饭”应展开为米饭 200g、红烧肉 100g、水煮蛋 50g、清炒青菜 80g，合计约 676 kcal；半份和两份按整体比例缩放。
- “番茄炒蛋盖饭”“鱼香肉丝盖饭”“牛肉面”分别按冻结模板展开为约 442、606、523 kcal。
- “台湾卤肉饭不要蛋”必须为 `needs_review`，修饰语不得静默忽略。
- “一瓶可乐，没吃米饭”必须为 `needs_review`，且不得误记米饭。
- 含中英混合未知内容的输入必须为 `needs_review`，未知内容进入 `unresolved`。

## 6. 能力探测与降级契约

适配器统一返回 `{ available, status, data?, reason? }`；增强失败不得阻断 P0 账本。

### system.storage

- 探测后读取 `shihe_state_v1`，校验、迁移并执行 30 天维护。
- 不可用或读失败时阻止持久化并醒目标明“记录暂时无法保存”；用户当前页输入仅留在页面草稿中供重试，不伪装成已经保存。
- 写失败保留草稿和重试入口，不显示普通成功；保存成功后读取回验。

### 餐时胶囊与 system.alarm

- 应用每次打开或恢复时，根据本地时间、三个餐段、当天 meals 和 `mealPromptState` 重新计算状态。
- 未记录时展开“现在记录 / 稍后提醒 / 本餐跳过”；已记录时收缩并显示该餐热量。
- “稍后提醒”保存该餐的 `remindAt`。仅当 `system.alarm` 可用时按官方接口申请、更新或取消系统闹钟；本地状态保存与闹钟注册是两个独立结果。
- alarm 不可用或失败时如实提示，不伪造通知，也不承诺进程被回收后触发；下次打开或恢复时仍检查 `remindAt`。
- `system.alarm` 是可选增强，不是 P0 阻塞项。

### service.health

- P1 覆盖官方 Mock 的 HEART_RATE、SPO2、STRESS；本次比赛 `service.health` 只开放这三类，无法读取系统步数、运动记录或活动热量汇总。“系统健康数据”卡仅在首页可见期间自动读取或订阅，页面隐藏/销毁时立即取消订阅，不声明后台 health。
- 心率和血氧只展示；压力只允许触发温和的本地建议，例如先呼吸一分钟、避免情绪化进食。
- 三类数据均不进入热量公式、不持久化、不用于诊断；不得构造接口未返回的数据。
- 来源恒定标为“由 service.health 自动读取；比赛模拟器中为官方 Mock”。能力检测明确为 false 或错误码 203 时显示“当前设备暂不支持”；订阅 fail、同步异常等读取错误显示“健康数据暂时读取失败”；callback 收到形状错误、非有限值或超出官方 Mock 范围的样本显示“暂无有效健康数据”。三类状态均不影响记餐主流程，后续有效样本正常覆盖。

长期产品方向是在系统能力开放后优先同步步数、运动记录和活动热量。本次初赛以明确标注的手动补录 / MET 估算降级，不生成运动 Mock、不从健康数据反推热量，也不宣称已完成系统运动同步。

### system.velaclaw

- P1，仅由用户主动触发并确认实际发送的最小文字摘要。
- 使用官方 `@system.velaclaw` 接口和独立 10 秒计时器；失败、拒绝、离线、非法响应或超时均立即回退确定性本地建议，忽略迟到回调和页面销毁后的更新。
- 对接口成功回调中的正文执行基础设施失败回复 guard：若回复是后端/Key 未配置等基础设施故障文本（包括本次无 Key 运行返回的英文失败回复），不得当作 AI 建议展示，统一显示“AI 暂不可用，已保留本地建议”并保留确定性本地建议。
- 回复标“AI 生成，仅供参考”，不得写成事实或医疗结论，也不得发送不存在、推断出的健康或个人数据。
- 应用绝不接收、读取或存储 key；用户只在 goldfish `ai_agent` 官方配置界面私下输入 `tp-` key。仓库与 RPK 不含 `tp-`/`sk-` key。
- M4 goldfish 已验证无 Key 路径：应用成功调用 `system.velaclaw`，`ai_agent` 记录 `No available backend`，基础设施失败回复 guard 生效并显示上述中文本地降级；相关测试与 debug 构建通过。配置 Key 后的成功路径仍待用户私下验证，不记为通过。

## 7. 页面与记录行为

- 未完成首次设置时只进入 onboarding；体重无有效输入或免责声明未接受不得完成。
- 编辑只改 draft，返回即丢弃；确认页从不可变 draft 渲染并重算。
- 保存生成唯一 ID、幂等写入并读取回验，成功后才导航；双击只写一条。
- 餐食和运动记录均提供修改与删除。修改复用确认流程；删除需确认。成功后 store 立即回算首页与历史。
- 最近吃过与收藏套餐均为 P0；收藏套餐不超过 3 次点击进入确认，但绝不跳过确认写入。

## 8. 安全、隐私与视觉

- 无账户、自建后端、手机伴侣 App、蓝牙同步或小米运动健康写入；业务数据仅存本地。
- 日志不输出档案、饮食明细、健康值、AI 正文、密钥或完整存储对象。
- 输入做长度、类型、枚举、有限数和范围校验；纯文本绑定，禁止动态执行。
- 清除数据须二次确认并尝试取消已注册闹钟，取消失败须告知。
- 视觉采用接近纯黑表盘背景、深灰卡片、米白主文字、灰色辅助文字、暖橙主操作与饮食状态、绿色完成状态、低饱和蓝多样性指标、大数字和统一圆角。以 466×466 比赛圆屏为主验收，同时检查 480×480、方屏和 336 宽窄屏布局不溢出。

## 9. 测试计划

- 目录：恰好 60 项；稳定唯一 ID；字段完整；每项有来源；仅 `energyKcalPer100` 为能量事实源；第三方清单完整。
- 食品公式：g/ml 两类、默认份量、边界值、四舍五入及合计误差不超过 1 kcal。
- 运动：六类固定 MET、体重/时长边界、估算标签；确认没有其他运动混入。
- 目标：编辑器 1200–4000、步长 100、低于 1500 提示；历史 800–5000 值读取兼容且不静默迁移。
- 解析：80 字与 12 片段边界、最长别名优先、只整段消费、有限数字/单位、无数量默认份量、数字无单位、不支持单位、未知词、否定、四个套餐的组成/缩放/热量，以及套餐修饰语进入待确认。
- 快捷选择：全部 60 项与分类计数一致；重复选择合并；增量、减量、移除、清空均可在确认前撤销。
- 存储：取消零写、双击单写、写失败不报成功、修改/删除即时回算、7/30 天跨月年、本地午夜、重启保留、损坏 JSON、未知 schema、ID 幂等。
- 首页聚合：今日已摄入、每日饮食参考目标、饮食/记录/多样三环、手动补录运动消耗、估算净摄入计算正确；摄入 1200、运动 110、目标 2000 时目标差值为 800、净摄入为 1090，增加运动不得改变饮食环；三餐记录数与食品 ID 去重随保存、修改、删除即时更新。
- 7 天摘要：有记录天数、仅有记录日参与的平均摄入、跨天不同食品 ID 去重正确；空日不进入平均值分母。
- 胶囊：每次打开/恢复重算；pending/later/skipped/completed；稍后到期；当天跳过；保存、修改和删除后的状态变化；alarm success/unavailable/fail。
- 健康：三类官方 Mock；仅可见时订阅、离页取消；不可用文案；心率/血氧仅展示；压力仅触发温和本地建议；均不持久化、不进公式。
- AI：9.9 秒成功、10 秒超时、失败、拒绝、基础设施失败回复 guard、迟到回调和页面销毁；确认应用无 key 输入/存储，并且只发送实际存在且用户确认的字段。M4 无 Key goldfish 降级、相关测试与 debug 构建已通过；配置 Key 后成功路径仍待用户私下验证。
- 视觉：466×466 比赛圆屏为主，兼查 480×480、方屏和窄屏；记餐页首屏直接出现一句话入口；无文字、卡片或按钮溢出；深色、暖橙、绿色、大数字和圆角卡片符合冻结视觉。
- 环境：现有普通 `vela-watch-5` VVD 验 P0，不据此宣称 health；比赛镜像 VVD 验 `service.health`；当前开源 goldfish 虽配置 `ROUTER=y` 但运行时未注册 `system.router`，故以 index 降级页验 RPK 与 VelaClaw 无 Key 回退，完整七页流程以 AIoT 比赛模拟器为准；真机另验，Mock 不算真机。

## 10. VM 事实源 / Windows 构建 Git 工作流

VM 比赛仓 `/home/ubuntu/openvela/contest2026_474_xuanjiexinsheng` 是唯一源码事实源，正式开发分支为 `feat/shihe-mvp`，负责所有正式修改、审查和提交；每日正式提交使用 `git commit -s` 并推送个人 fork。Windows 仅承担拉取、构建和模拟器验证。

1. 所有源码修改只在 VM 完成并形成可拉取的提交。
2. Windows 只执行 `git pull --ff-only` 获取 VM 提交，不产生源码修复，也不得用 Windows 工作区反向覆盖 VM。
3. Windows 在 AIoT IDE 构建 debug/release RPK 并运行 VVD；发现问题后把现象、日志和截图反馈到 VM，由 VM 修改后再次提交，Windows 再次 `git pull --ff-only`。
4. Windows 生成最终 RPK 后，通过 `multipass transfer` 将产物传回 VM，由 VM 纳入最终提交。
5. 不复制 `.git`、密钥、`node_modules` 或缓存；冲突和正式历史只在 VM 管理。

## 11. 官方依据

- [大赛总览](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/contest_overview.md)
- [手表应用赛道指引](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/watch_app_track_guide.md)
- [快应用 AI 工作流](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_ai_workflow.md)
- [快应用手动开发指南](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_manual.md)
- [service.health 手册](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/service_health_guide.md)
- [system.velaclaw 教程](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_velaclaw.md)
- [Xiaomi Vela system.velaclaw 接口](https://iot.mi.com/vela/quickapp/zh/features/other/velaclaw.html)
