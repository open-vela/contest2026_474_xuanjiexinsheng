# 食衡官方提交要求检查表

更新日期：2026-09-20

本表依据比赛分支的[《大赛总览》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/contest_overview.md#L87-L121)、[《参赛代码提交指南》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/code_submission_guide.md#L51-L75)、[《快应用手动开发指南》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_manual.md#L231-L243)和[《AI Coding 日志归集与提交手册》](https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/ai_coding_log_guide.md#L263-L300)核对。状态只记录已经验证的事实。

## 1. 官方硬交付

| 项目 | 当前证据 | 状态 |
| --- | --- | --- |
| 快应用源码工程 | `quickapp/shihe/src/`、`package.json`、`package-lock.json`、`src/manifest.json`、测试与构建脚本 | 完成 |
| production `release.rpk` | 最终响应式源码已重新签名生成；84,797 bytes，SHA-256 `341da103...c8ee`；ZIP、CERT、manifest、六页 bundle 与秘密扫描通过 | 完成；待 AIoT clean-install 冒烟 |
| AI Coding 日志 | `logs/AuroraZW/` 当前 34 份 JSONL、1,383 个事件，2026-09-20 使用官方 `validate-log.py` 复核为 `ALL OK` | 完成 |
| 至少一个有效 Skill | `.claude/skills/vela-quickapp-release-auditor/` 已实际审计最终 RPK，结果 0 failures / 0 warnings | 完成 |
| 作品介绍文档 | 官方模板与固定信息已核对，最终截图已归档 | 正在按官方模板生成 DOCX/PDF |
| 不超过 5 分钟演示视频 | 已锁定真实操作画面加字幕的兜底方案 | 技术报告完成后立即制作并播放复核 |
| 专属仓地址 | `https://github.com/open-vela/contest2026_474_xuanjiexinsheng` | 已确定 |

## 2. GitHub 提交链

| 项目 | 当前状态 | 关闭条件 |
| --- | --- | --- |
| fork 开发分支 | 远程为 `d94e019`；最终窄屏适配、RPK与发布证据正在本分支收口 | 使用 Signed-off-by 提交并推送 |
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
- [x] 最终定版 production RPK 重新生成，并通过 ZIP、CERT、manifest、六页 bundle、日志和秘密审计。
- [x] 已删除手动运动补录和净摄入；当前无可靠系统步数/运动记录/活动热量接口，不伪造自动同步。
- [x] 六页功能与主视觉冻结；336×480 窄屏阻断问题已修复并完成逐页检查。
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

1. 对最终 RPK 执行 AIoT clean-install 冒烟，并保留既有有效 20 分钟稳定性证据。
2. 使用 Signed-off-by 提交、推送，立即完成团队专属仓 PR 与合入。
3. 严格按官方模板生成并检查技术报告 DOCX/PDF。
4. 制作不超过 5 分钟的字幕版真实功能演示视频并完整播放复核。
5. 从团队仓独立复核，生成官方命名压缩包并完成官网提交。
