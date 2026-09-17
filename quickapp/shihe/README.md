# 食衡快应用

包名：`com.openvela.contest2026.team474.shihe`

版本：`1.0.0`（`versionCode: 1`）

## 开发命令

```bash
npm ci
npm test
npm run build
```

- `npm test`：运行食品解析、餐食、能量、提醒、健康、VelaClaw 和路由降级测试。
- `npm run build`：生成 debug RPK，并审计六个页面 bundle。
- `npm run release`：使用本地 `sign/` 目录中的签名材料生成 production RPK。

`node_modules/`、`build/`、`dist/`、`sign/` 和 debug RPK 均被忽略。不要提交签名私钥、API Key 或 Token；比赛生产包只复制到 `releases/`。

项目完整说明、模拟器运行步骤和发布审计命令见仓库根 [README](../../README.md)。
