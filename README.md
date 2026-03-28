# 意念科技 - AI API 订阅平台

一个类似 Crunchbase 的订阅系统 + AI API Token 计费平台。

## 🌐 在线访问

- **电商首页**: https://13888285815.github.io/huimart-ecommerce/
- **订阅平台**: https://13888285815.github.io/huimart-ecommerce/platform.html

## ✨ 功能特性

### 🔐 用户认证系统
- JWT Token 认证
- API Key 管理
- 安全密码验证（8位+大小写+数字）

### 💳 订阅计划 (类似 Crunchbase)
| 计划 | 价格 | 积分/月 | 特性 |
|------|------|---------|------|
| 免费版 | $0 | 100 | 社区支持 |
| 基础版 | $9.99 | 1,000 | 邮件支持 |
| 专业版 | $49.99 | 10,000 | 优先支持 |
| 企业版 | $199.99 | 100,000 | 专属支持 |

### 🤖 AI API 计费
- 支持 GPT-4、Claude 等模型
- 按 Token 精准计费
- 实时余额查询

### 🛡️ 安全防护
- XSS 防护
- CSRF 防护
- SQL 注入防护
- 内容安全策略 (CSP)
- HTTP 安全头

### 🌍 多语言支持
- 🇨🇳 中文
- 🇺🇸 English
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇯🇵 日本語
- 🇸🇦 العربية (RTL)

### 📱 全平台兼容
- Windows / macOS / Linux
- iPhone / iPad
- Android / Android Pad
- 鸿蒙系统
- 自动响应式布局

## 📁 项目结构

```
├── index.html          # 电商首页
├── platform.html       # 订阅平台
├── api/
│   ├── auth.js         # 用户认证 API
│   ├── ai.js           # AI 计费 API
│   ├── shop.js         # 商城 API
│   └── subscribe.js    # 订阅 API
├── vercel.json         # Vercel 配置
└── package.json        # 项目配置
```

## 🚀 部署

### GitHub Pages
已自动部署到: https://13888285815.github.io/huimart-ecommerce/

### Vercel 部署
1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库 `13888285815/huimart-ecommerce`
3. 点击 Deploy

## 📖 API 文档

### 认证 API
```
POST /api/auth/register  - 注册
POST /api/auth/login     - 登录
POST /api/auth/api-key   - 生成 API Key
GET  /api/auth/me        - 获取用户信息
```

### AI API
```
POST /api/ai/chat        - AI 聊天 (需 API Key)
POST /api/ai/embeddings  - 文本嵌入
GET  /api/ai/models      - 模型列表
GET  /api/ai/usage       - 使用统计
```

### 订阅 API
```
GET  /api/subscribe/plans    - 计划列表
POST /api/subscribe/create   - 创建订阅
GET  /api/subscribe/status   - 订阅状态
POST /api/subscribe/cancel   - 取消订阅
```

## 🔒 安全特性

- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Strict-Transport-Security
- ✅ Content-Security-Policy
- ✅ 输入验证和清理
- ✅ SQL 注入防护
- ✅ XSS 攻击防护

## 📄 License

MIT License
