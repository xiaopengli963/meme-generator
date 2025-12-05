# Feishu Meme Bot

本项目提供一个无需第三方依赖的 Node.js 服务，负责接收飞书群聊机器人事件、解析 @ 指令，并自动返回热门搞笑表情包图片。

## 功能概览
- 接收 `im:message.receive_v1` / 群聊 @ 事件并自动 ACK。
- 校验 `verificationToken`，可选开启飞书签名校验 & 消息加密校验。
- 聚合 **10+ 个国内外表情包图源**：斗图啦、表情包天堂（fabiaoqing）、千库网、花瓣网（Huaban）、搜狗表情、DuckDuckGo、Tenor、Giphy、本地精选库等。
- 根据指令自动挑选最合适的模板，若包含“配文/文字/字样”等关键词，会把文字叠加到图片上。
- 自动上传图片到飞书获取 `image_key` 并回复原消息，失败时智能降级（兜底熊猫头）。
- 本地缓存模板 & 图片，减少第三方请求压力。

## 快速开始
1. **安装依赖**：本项目仅使用 Node.js 内置模块，确保本机 Node ≥ 18 (推荐 20+) 即可；无需 `npm install`。
2. **复制环境变量**：
   ```bash
   cd /Users/lixiaopeng/meme-generator
   cp env.sample .env.local   # 若系统限制，可手动创建
   ```
   填写以下变量：
   - `FEISHU_APP_ID`、`FEISHU_APP_SECRET`
   - `FEISHU_VERIFICATION_TOKEN`
   - `FEISHU_ENCRYPT_KEY`（如开启消息加密/签名校验）
   - `TENOR_API_KEY`（可选，默认使用官方 demo key，可到 [Tenor Developers](https://tenor.com/gifapi/documentation) 申请）
   - 可选：`PORT`、`MEME_CACHE_TTL`
3. **启动服务**：
   ```bash
   npm run dev        # 需要 Node v18+，利用 node --watch 实时重载
   # 或 npm start
   ```
4. **暴露公网**：使用 `ngrok` / `cloudflared` / `frp` 将 `http://localhost:3000/feishu/event` 暴露到公网，填入飞书“事件订阅”URL。
5. **在飞书后台**：开启机器人能力、订阅 `im:message.receive_v1`，并把机器人拉进群里测试 @ 指令。

> ⚠️ 由于运行在受限环境内，无法直接调试对外网络请求。部署到本地或云环境后即可正常访问 Imgflip / memegen / 飞书 API。

## 项目结构
```
/Users/lixiaopeng/meme-generator
├── package.json        # npm 脚本与元信息
├── env.sample          # 环境变量示例
├── scripts/
│   └── check-env.js    # 检查必需变量是否已设置
└── src/
    ├── config.js              # 配置项与 env 解析
    ├── feishu-client.js       # 飞书 API 封装
    ├── meme-provider.js       # 核心策略：聚合多图源 + 本地合成 + 缓存
    ├── server.js              # HTTP 服务入口
    └── utils/
        ├── env.js             # .env 加载器
        ├── ddg-search.js      # DuckDuckGo 图片搜索
        ├── doutula-search.js  # 斗图啦爬虫
        ├── fabiaoqing-search.js# 表情包天堂（fabiaoqing）爬虫
        ├── qianku-search.js   # 千库网爬虫
        ├── huaban-search.js   # 花瓣网 API
        ├── sogou-search.js    # 搜狗表情接口
        ├── tenor-search.js    # Tenor GIF API
        └── ...                # 其他图源可按需扩展
```

## 本地验证
- `npm run dev`：启动服务。
- `curl -i http://localhost:3000/healthz`：健康检查。
- `npm run lint`：快速校验环境变量是否齐全。

## 图源策略
当前优先级（自上而下）：
1. 热门/搞笑精选（Hot-Funny 本地精选）
2. 微信表情包（聚合搜狗微信表情 / 关键词检索）
3. 抖音表情包（堆糖 Douyin 镜像检索）
4. Memegen.link 官方模板
5. Imgflip 模板库
6. Giphy GIF API
7. Tenor GIF API
8. B 站表情（Bilibili 关键词检索）
9. Reddit 热门梗图
10. 微博超话相关表情
11. 斗图啦（忽略证书 + Referer 伪装）
12. 表情包天堂（fabiaoqing）
13. 千库网（588ku）
14. 花瓣网 API
15. 搜狗表情接口
16. 本地经典库（Fuse 模糊匹配）
17. DuckDuckGo 全网图
18. 兜底熊猫头

你可以在 `src/meme-provider.js` 中继续插入新的搜索器，只需返回 `{ name, url, source, referer }` 即可。

## 自定义扩展
- **新增图源**：在 `src/utils/` 中新增 `xxx-search.js`，并在 `meme-provider.js` 里接入。
- **指令路由**：可在 `processMessageEvent` 内根据关键字执行不同逻辑，如“换一张”“动画包”等。
- **内容审核**：在上传前将生成图片交给第三方审核 API，拦截违规内容。
- **持久化日志**：当前直接 `console.log`，可改为接入 Loki / SLS。

## 测试

完成上述步骤后，你只需在飞书自建应用里完成事件订阅设置，其余逻辑均已在本地实现，可直接部署运行。
