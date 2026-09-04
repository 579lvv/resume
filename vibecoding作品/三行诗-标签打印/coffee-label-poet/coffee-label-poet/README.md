# 杯签诗生成器

这是一个静态网页原型，用于咖啡店生成并预览个性化三行杯签诗。

完整交付、使用和部署说明请查看：[HANDOFF_GUIDE.md](./HANDOFF_GUIDE.md)。

## 使用方式

不接 AI 时，直接用浏览器打开：

```text
D:\CodexProjects\coffee-label-poet\index.html
```

## 当前能力

- 输入昵称和今日心情
- 选择心情快捷项
- 选择中文诗或英文诗
- 切换现代、古风、治愈、俏皮诗签风格
- 模拟咖啡杯身标签预览
- 切换奶白、牛皮、黑白标签纸样式
- 保留多次生成记录
- 单选或多选诗卡
- 复制诗句
- 导出标签图片
- 导出选中诗卡图片
- 打印 40mm x 30mm 标签预览

## 后续接入真实 AI

当前版本内置本地生成逻辑，方便无后端快速试用。

## 接入 DeepSeek API

不要把 DeepSeek API Key 写进前端页面。项目已经内置一个 Node 代理服务，前端请求 `/api/poem`，后端再请求 DeepSeek。

1. 安装 Node.js 18 或更高版本。
2. 在 `coffee-label-poet` 目录下复制 `.env.example` 为 `.env`。
3. 把 `.env` 里的 `DEEPSEEK_API_KEY` 改成你的 DeepSeek API Key。
4. 运行：

```bash
npm start
```

5. 打开：

```text
http://localhost:3000
```

网页默认使用高质量模型：

```text
deepseek-v4-pro
```

网页中也可以切换为响应更快的模型：

```text
deepseek-v4-flash
```

`.env` 里的 `DEEPSEEK_MODEL` 是后端兜底值，支持 `deepseek-v4-pro` 和 `deepseek-v4-flash`。

如果你已有自己的后端，也可以在页面加载前设置：

```html
<script>
  window.COFFEE_POET_API_ENDPOINT = "https://your-api.example.com/poems";
</script>
```

接口返回：

```json
{
  "lines": ["第一行", "第二行", "第三行"]
}
```

页面会优先使用接口返回的三行诗，接口不可用时自动回退到本地生成逻辑。

## Render 测试部署

Render 部署需要把项目放到 GitHub 仓库里，然后创建 Web Service。

### 方式一：用 Dashboard 手动创建

1. 登录 Render。
2. 点击 `New +`，选择 `Web Service`。
3. 连接 GitHub 仓库。
4. 如果仓库根目录就是本项目，Root Directory 留空；如果本项目在仓库子目录，Root Directory 填：

```text
coffee-label-poet
```

5. 配置：

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

6. 添加环境变量：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-pro
ACCESS_CODE=你设置的访问码
ACCESS_TOKEN=一串随机字符
ALLOWED_ORIGINS=https://你的-render域名.onrender.com
```

7. 点击 `Create Web Service`。

部署完成后，Render 会给出一个类似这样的公网地址：

```text
https://coffee-label-poet.onrender.com
```

### 方式二：使用 render.yaml

项目里已经包含 `render.yaml`。在 Render 创建服务时选择 Blueprint，可以让 Render 读取这个配置。仍然需要在 Render 后台手动填写 `DEEPSEEK_API_KEY`，不要提交到 GitHub。

### 注意

- Render 免费 Web Service 闲置一段时间会休眠，首次打开可能需要等待。
- `.env` 不要提交到 GitHub，线上 API Key 只放在 Render 的 Environment Variables 里。
- 线上部署时服务会自动绑定 Render 提供的 `PORT` 和 `0.0.0.0`。
- `ACCESS_CODE` 是给测试用户输入的访问码。
- `ACCESS_TOKEN` 建议设置为随机长字符串，不需要告诉测试用户。
- `ALLOWED_ORIGINS` 填 Render 部署后的完整域名，例如 `https://coffee-label-poet.onrender.com`。
