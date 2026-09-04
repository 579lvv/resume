# GEO-Agent Studio Demo — LLM API 接入说明

这是一个单文件 Vue 3 的 GEO（生成式引擎优化）多智能体工作台演示。
原 demo 中多个模块（场景问题生成、标题生成、正文生成、多渠道排版、AI 可见度诊断）均为内置数据 / `setTimeout` 模拟，
本版本已预留并接入**市面通用 LLM API**，未配置时自动回退为演示数据。

## 快速开始

- **V2.0 Pro 推荐版**：直接用浏览器打开 `index_v2.html`（或访问 `http://localhost:5173/index_v2.html`），拥有更现代的 B2B 视觉、4-Agent 流水线状态流、GEO 算法指标卡、9 平台拟真生态壳与全流程演练。
- **经典版**：用浏览器打开 `index.html`。

无需任何 Key，默认即为全保真实证演示模式。

要接入真实模型：

1. 点击页面右上角 **⚙️ 设置** 按钮。
2. 选择服务商预设，或填写自定义的 `API Base URL`、`API Key`、`模型名称`。
3. 可点击「测试连接」校验，点击「保存并应用」生效（配置保存在浏览器 `localStorage`）。
4. 回到各步点击对应生成按钮，即走真实 LLM；若调用失败会自动用演示数据兜底（可在设置中关闭兜底）。

顶部状态标签会显示「演示模式」或「模型名 · 已配置」。

## 支持的通用接口

本 demo 按 **OpenAI Chat Completions 协议**（`POST {baseUrl}/chat/completions`）对接，因此**所有兼容该协议的厂商/服务均可使用**，内置预设包括：

| 服务商 | Base URL（默认） | 默认模型 |
| --- | --- | --- |
| DeepSeek 深度求索 | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Kimi / Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 通义千问 DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 豆包 / 火山方舟 | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` |
| 百度千帆 | `https://qianfan.baidubce.com/v2` | `ernie-4.0-8k` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Ollama / 本地 | `http://localhost:11434/v1` | `qwen2.5:7b` |
| 自定义 / 其他 | 任意兼容端点 | 自填 |

也可以接 vLLM、LM Studio、各种网关等任何 OpenAI 兼容服务。

## 已接入的模块

- **Step 1 场景问题**：`generateQuestions` → LLM 裂变 20+ 用户高频问题（JSON 解析后填充列表）。
- **Step 2 标题**：`generateTitlesForTopic` / `shuffleTitles` → LLM 生成 4 大高被引标题类型；「AI 生成正文」→ LLM 生成 HTML 正文。
- **Step 3 多渠道排版**：`generatePlatformVersions` → LLM 生成 9 大平台版本（知乎、博客园、百家号、搜狐、今日头条、CSDN博客、个人图书馆、搜狐号、微信公众平台）。
- **Step 4 诊断**：`triggerVisionScan` → 上传 SaaS 截图走 VLM（`image_url`），无截图则按指标文本生成归因结论与周报。

## 本地代理（推荐，规避跨域）

本目录内置零依赖代理 `server.js`，可静态托管 demo 并把 LLM 请求转发到目标服务，从而避开浏览器 CORS：

```bash
node server.js
# 或：LLM_API_KEY=sk-xxxx node server.js   （服务端持有 Key，浏览器无需填 Key）
```

然后打开 `http://localhost:5173`，在 ⚙️ 设置中：

1. 选择服务商预设（或填 Base URL / 模型名）。
2. 开启「启用本地代理」，代理地址保持 `http://localhost:5173/api/llm`。
3. 若已在服务端设置 `LLM_API_KEY`，浏览器里的 Key 可留空；否则在浏览器里填 Key。

用 `npm start` 也可以直接启动（等价于 `node server.js`）。

## 要点提示

- **纯前端演示**：不经代理时 `API Key` 保存在浏览器 `localStorage`，仅适合本地体验；正式产品应改用**后端代理**，避免密钥泄露。
- **CORS**：从浏览器直接请求部分厂商接口可能被同源策略拦截；优先使用本目录的 `server.js` 代理，或用支持 CORS 的网关/本地服务（如 Ollama）。
- `json_object` 不被个别服务支持时，客户端会自动回退为普通文本请求并解析 JSON。
- 配置结构（`geo-agent-demo.llmConfig.v1`）：`provider / baseUrl / apiKey / model / temperature / topP / maxTokens / useFallback / proxyUrl / useProxy`。
