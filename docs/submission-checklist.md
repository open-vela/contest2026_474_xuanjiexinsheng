# 食衡官方提交要求检查表

更新日期：2026-09-17

本表依据比赛分支的[《大赛总览》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/contest_overview.md#L87-L121)、[《参赛代码提交指南》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/code_submission_guide.md#L51-L75)、[《快应用手动开发指南》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_manual.md#L231-L243)和[《AI Coding 日志归集与提交手册》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/ai_coding_log_guide.md#L263-L300)核对。状态只记录已经验证的事实。

## 1. 官方硬交付

| 项目 | 当前证据 | 状态 |
| --- | --- | --- |
| 快应用源码工程 | `quickapp/shihe/src/`、`package.json`、`package-lock.json`、`src/manifest.json`、测试与构建脚本 | 完成 |
| production `release.rpk` | 仓内 RC1 已通过当时版本的 AIoT 与 goldfish 验证，但早于最终定版源码 | 待界面审核后重新生成、复测并替换 |
| AI Coding 日志 | `logs/AuroraZW/` 当前 34 份 JSONL，官方 `validate-log.py` 通过 | 完成；最终提交前须再次清查 |
| 至少一个有效 Skill | `.claude/skills/vela-quickapp-release-auditor/` 已实际审计 RC1，结果 0 failures / 0 warnings | 完成 |
| 作品介绍文档 | 本地保留旧 14 页 A4 RC1 审阅稿，未纳入版本控制 | 待界面审核后更新截图并重新生成、终审 |
| 不超过 5 分钟演示视频 | 用户要求先审核功能、界面与作品介绍文档 | 未开始；审核通过前禁止制作 |
| 专属仓地址 | `https://github.com/open-vela/contest2026_474_xuanjiexinsheng` | 已确定 |

## 2. GitHub 提交链

| 项目 | 当前状态 | 关闭条件 |
| --- | --- | --- |
| fork 开发分支 | 远程基线为 `65cf5db`；最终可用性修订正在本分支收口 | 新版 debug RPK、截图审核与文档核对后使用 Signed-off-by 提交并推送 |
| Signed-off-by | 当前 RC1 提交含 `AuroraZW <3053750681@qq.com>` | 最终新增提交继续使用 `git commit -s` |
| 最终 PR | 尚未发起 | PDF、界面与稳定性通过后发向团队专属仓 `dev-ai-contest-2026` |
| CLA / CI | 预检阶段已签署并通过；最终 PR 尚未检查 | 最终 PR 的 checks 与 `cla/signature` 全绿 |
| 自行 review / 合入 | 尚未执行 | 最终 PR 通过后合入团队专属仓 |
| 独立复现 | 尚未执行最终版本 | 9 月 19 日从团队仓新 clone，按 README 复现 |
| 官方提交与回执 | 尚未执行 | 9 月 19 日中午前提交仓库、PDF、视频并保存回执 |

## 3. 发布质量门禁

- [x] P0 主闭环：设置、餐时胶囊、一句话/快捷记餐、确认、修改、删除、摄入回算和最近 7 天。
- [x] 断网或 VelaClaw 不可用时，本地建议和主流程继续工作。
- [x] `service.health` 官方 Mock 成功路径与普通镜像不支持路径均已验证。
- [x] 历史 RC1 production RPK 通过 package/version、CERT、ZIP、当时版本 bundle 和秘密扫描；不作为最终交付包。
- [ ] 最终定版 production RPK 重新生成，并通过同等审计与双模拟器复测。
- [x] 已删除手动运动补录和净摄入；当前无可靠系统步数/运动记录/活动热量接口，不伪造自动同步。
- [ ] 用户逐页审核当前功能、文案和苹果式极简视觉。
- [ ] 使用页面标题识别重新执行有效的 20 分钟稳定性回归；前一版只检查截图大小且误滑出应用，已作废。
- [ ] VelaClaw 有 Key 成功路径由用户私下验证；此项失败不阻塞 P0 发布。
- [ ] PDF 根据用户意见修订并定稿。
- [ ] 视频在用户明确批准后制作并控制在 5 分钟以内。

## 4. 安全、版权与范围

- [x] 根 `LICENSE` 为 Apache License 2.0。
- [x] `THIRD_PARTY_NOTICES.md` 说明食品参考值、产品默认配方和使用边界。
- [x] Git 跟踪文件和 RPK 不包含高置信度 `tp-`、`sk-` 或私钥头。
- [x] `sign/`、`node_modules/`、`build/`、`dist/` 和本地临时目录不入仓。
- [x] 不提交个人健康原始数据；健康 Mock 不外推为真机数据。
- [x] 初赛不新增腕上录音、云 ASR、手机伴侣、蓝牙同步、拍照识餐或系统级灵动岛。

## 5. 当前最短关键路径

1. 完成最终定版 debug RPK 的 466×466 截图与三尺寸检查，由用户集中审核应用界面。
2. 根据审核只修必要的界面、文案或阻断问题，随后重新生成 production RPK。
3. 严谨重跑 20 分钟稳定性测试，并再次执行发布审计。
4. 更新并定稿作品介绍 PDF；用户明确通过应用和 PDF 后再制作演示视频。
5. 推送最终提交，完成 PR、CLA/CI 和自行合入。
6. 从团队仓独立复核并完成官方提交。
