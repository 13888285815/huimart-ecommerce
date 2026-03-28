# 惠购商城 - 响应式电商平台

一个类似拼多多风格的响应式电商首页，支持全平台访问和多语言切换。

## ✨ 特性

- 🎨 **拼多多风格设计** - 红色主题 + 阶梯价格 + 拼团标签
- 📱 **全平台兼容** - Windows/macOS/Linux/iOS/Android/鸿蒙
- 🌍 **6种语言支持** - 中文/英语/法语/德语/日语/阿拉伯语
- 📐 **响应式布局** - 自动适配手机/平板/电脑/超大屏
- ⚡ **纯前端实现** - 无需后端，可直接部署到 GitHub Pages 或 Vercel
- 🎯 **性能优化** - CSS 变量、动画优化、字体预加载

## 🚀 部署方式

### 方式一：GitHub Pages

1. 创建 GitHub 仓库
2. 上传 `index.html` 文件
3. Settings → Pages → 选择分支 → Save
4. 访问 `https://yourusername.github.io/repo-name`

### 方式二：Vercel

**方法 A：通过 CLI**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录执行
vercel

# 按提示操作即可
```

**方法 B：通过 GitHub 导入**
1. 将代码推送到 GitHub
2. 登录 [vercel.com](https://vercel.com)
3. Import Project → 选择 GitHub 仓库
4. 自动部署完成

### 方式三：本地预览

```bash
# 方式1: 直接打开
open index.html

# 方式2: 使用本地服务器
python3 -m http.server 8080
# 访问 http://localhost:8080

# 方式3: 使用 Node.js
npx serve .
```

## 🌐 浏览器兼容性

| 浏览器 | 支持版本 |
|--------|----------|
| Chrome | 80+ |
| Safari | 13+ |
| Firefox | 75+ |
| Edge | 80+ |
| 微信浏览器 | ✅ |
| QQ浏览器 | ✅ |
| UC浏览器 | ✅ |
| 华为浏览器 | ✅ |
| 三星浏览器 | ✅ |

## 📱 设备兼容性

- ✅ iPhone (SE ~ 15 Pro Max)
- ✅ iPad (Mini ~ Pro)
- ✅ Android 手机 (各种尺寸)
- ✅ Android 平板
- ✅ 华为设备 (鸿蒙系统)
- ✅ Windows 电脑
- ✅ MacBook
- ✅ Linux 桌面

## 🌍 多语言支持

| 语言 | 代码 | 文字方向 |
|------|------|----------|
| 中文 | zh | LTR |
| English | en | LTR |
| Français | fr | LTR |
| Deutsch | de | LTR |
| 日本語 | ja | LTR |
| العربية | ar | RTL |

阿拉伯语支持 RTL (从右到左) 布局。

## 📁 文件结构

```
pinduoduo-clone/
├── index.html      # 主页面 (包含 HTML + CSS + JS)
├── README.md       # 说明文档
├── vercel.json     # Vercel 配置
└── .gitignore      # Git 忽略文件
```

## 🔧 自定义修改

### 修改颜色主题

在 `index.html` 中找到 `:root` 部分的 CSS 变量：

```css
:root {
  --primary: #e53935;        /* 主色调 */
  --primary-dark: #c62828;   /* 深色 */
  --secondary: #ff7043;      /* 辅助色 */
  /* ... */
}
```

### 修改商品数据

在 `<script>` 标签内找到 `products` 数组：

```javascript
const products = [
  { id: 1, name: '商品名称', price: 89, originalPrice: 299, sales: 12580, badge: '热卖' },
  // 添加更多商品...
];
```

### 添加真实图片

将商品图片替换为真实 URL：

```javascript
// 在 productImage 部分修改
<div class="product-image">
  <img src="https://your-image-url.jpg" alt="${product.name}">
</div>
```

## 📄 License

MIT License - 可自由使用和修改

---

**注意**: 本项目仅供学习和参考，不可用于商业用途。不复制任何特定平台的设计代码。
