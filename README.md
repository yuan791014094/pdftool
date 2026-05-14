# PDF 工具箱

> 免费、开源的在线 PDF 工具，纯浏览器端处理，文件不上传服务器。

## 功能

| 工具 | 说明 |
|------|------|
| 合并 PDF | 将多个 PDF 文件合并为一个，支持拖拽排序 |
| 拆分 PDF | 按页码范围拆分为多个独立文件 |
| 提取页面 | 从 PDF 中提取指定页面 |
| 旋转页面 | 对页面进行 90°/180°/270° 旋转 |
| PDF 转图片 | 将每页渲染为 PNG 或 JPG |
| 图片转 PDF | 将多张图片合成一个 PDF |
| 加密 / 解密 | 设置或移除 PDF 密码保护 |

## 特点

- **本地处理** — 所有操作在浏览器内完成，文件不上传任何服务器
- **开源免费** — MIT 协议
- **无需注册** — 直接使用

## 技术栈

- **框架**: React + TypeScript (Vite)
- **PDF 处理**: [pdf-lib](https://pdf-lib.js.org/)（合并/拆分/旋转/加密）+ [pdfjs-dist](https://mozilla.github.io/pdf.js/)（渲染/转图片）
- **样式**: 纯 CSS，参照 Anthropic Claude 暖色编辑风格设计系统

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## License

MIT
