# 维护文档

本文档面向需要修改、扩展或排查问题的开发者。

---

## 目录

1. [技术栈与关键依赖](#1-技术栈与关键依赖)
2. [项目结构](#2-项目结构)
3. [架构概览](#3-架构概览)
4. [设计系统](#4-设计系统)
5. [核心约定与注意事项](#5-核心约定与注意事项)
6. [如何新增一个工具页](#6-如何新增一个工具页)
7. [部署流程](#7-部署流程)
8. [常见问题排查](#8-常见问题排查)
9. [已知限制](#9-已知限制)

---

## 1. 技术栈与关键依赖

| 包 | 版本 | 用途 |
|---|---|---|
| react | ^19 | UI 框架 |
| react-router-dom | ^7 | SPA 路由 |
| pdf-lib | ^1.17.1 | PDF 写操作：合并、拆分、旋转、提取、加密、水印 |
| pdfjs-dist | ^5.7.284 | PDF 读操作：渲染缩略图、转图片、压缩（先渲染再重建） |
| vite | ^8 | 构建工具 |
| typescript | ~6 | 类型检查 |

**两个 PDF 库职责不同，不能互换：**

- `pdf-lib` 在内存中操作 PDF 结构（低层字节操作），不依赖 Worker，同步性强
- `pdfjs-dist` 用于将 PDF 页面渲染成像素图像，必须初始化 Worker，异步

---

## 2. 项目结构

```
pdftool/
├── public/
│   └── 404.html              # GitHub Pages SPA 路由补丁（见第 5 节）
├── src/
│   ├── main.tsx              # 入口，挂载 React App
│   ├── App.tsx               # BrowserRouter + 所有路由声明
│   ├── lib/
│   │   └── pdfjs.ts          # pdfjs Worker 唯一初始化点，其他文件从这里 import pdfjs
│   ├── hooks/
│   │   └── useObjectUrl.ts   # 自动 revoke Object URL，防内存泄漏
│   ├── styles/
│   │   ├── tokens.css        # CSS 变量（颜色、字体、间距、圆角、阴影）
│   │   └── global.css        # 全局 reset、排版工具类、.container
│   ├── components/
│   │   ├── Button/           # 四种变体：primary / secondary / secondary-dark / text
│   │   ├── DropZone/         # 拖拽 + 点击上传，支持 accept / multiple
│   │   ├── FileList/         # 文件列表，带上移/下移/删除
│   │   ├── Nav/              # 顶部导航栏
│   │   ├── PdfThumbnails/    # PDF 页面缩略图网格（pdfjs 渲染）
│   │   ├── ProgressBar/      # 进度条
│   │   └── ToolPage/         # 工具页通用布局（返回链接 + 标题 + 内容区）
│   └── pages/
│       ├── Home.tsx / Home.css        # 首页工具卡片列表
│       ├── MergePage.tsx              # 合并
│       ├── SplitPage.tsx              # 拆分
│       ├── ExtractPage.tsx            # 提取页面
│       ├── RotatePage.tsx             # 旋转
│       ├── PdfToImagePage.tsx         # PDF 转图片
│       ├── ImageToPdfPage.tsx         # 图片转 PDF
│       ├── ProtectPage.tsx            # 加密 / 解密
│       ├── CompressPage.tsx           # 压缩
│       └── WatermarkPage.tsx          # 水印
├── index.html                # HTML 模板，含 sessionStorage 路由恢复脚本
├── vite.config.ts            # base: '/pdftool/'
├── .github/workflows/deploy.yml  # GitHub Actions 自动部署
└── tsconfig*.json
```

每个 `components/Foo/` 目录结构固定为：
- `Foo.tsx` — 组件实现
- `Foo.css` — 样式
- `index.ts` — `export { Foo } from './Foo'`（统一从 index 导入）

---

## 3. 架构概览

### 路由

```
App.tsx
└── BrowserRouter  basename="/pdftool"
    └── Nav  （始终渲染，在 Routes 外）
    └── Routes
        ├── /           → Home
        ├── /merge      → MergePage
        ├── /split      → SplitPage
        ├── /extract    → ExtractPage
        ├── /rotate     → RotatePage
        ├── /pdf-to-image → PdfToImagePage
        ├── /image-to-pdf → ImageToPdfPage
        ├── /protect    → ProtectPage
        ├── /compress   → CompressPage
        └── /watermark  → WatermarkPage
```

**关键：`basename="/pdftool"` 不能去掉。** 去掉后在 GitHub Pages（`/pdftool/` 子路径）上所有路由会失效，页面空白。本地开发时 `vite dev` 会在根路径 `/` 运行，`basename` 仍然有效（router 会正确剥离前缀）。

### 数据流

所有工具页遵循同一个模式：

```
用户上传文件
  → useState<File>
  → 用户点击执行按钮
  → async 函数（pdf-lib 或 pdfjs 处理）
  → setResult(URL.createObjectURL(blob))
  → useObjectUrl(result) 负责在 result 更换或组件卸载时 revoke
  → 用户点击下载：创建 <a> 标签并 .click()
```

### pdfjs Worker 初始化

```ts
// src/lib/pdfjs.ts — 唯一初始化点
import * as pdfjs from 'pdfjs-dist'
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
export { pdfjs }
```

所有需要 pdfjs 的文件（`PdfThumbnails`、`PdfToImagePage`、`CompressPage`）统一从 `../../lib/pdfjs` 导入，**不要在其他文件再设置 `GlobalWorkerOptions`**，否则多次初始化会出现 Worker 冲突。

---

## 4. 设计系统

样式完全基于 CSS 变量，定义在 `src/styles/tokens.css`，无第三方 UI 框架。

### 常用 token

| 变量 | 值 | 用途 |
|---|---|---|
| `--color-primary` | `#cc785c` | 主色（珊瑚红），按钮、选中态、图标 |
| `--color-canvas` | `#faf9f5` | 页面背景（奶油白） |
| `--color-surface-card` | `#efe9de` | 卡片背景 |
| `--color-ink` | `#141413` | 主要文字 |
| `--color-muted` | `#6c6a64` | 次要文字、说明文字 |
| `--color-error` | `#c64545` | 错误状态 |
| `--font-display` | Cormorant Garamond | 标题字体（衬线） |
| `--font-body` | Inter | 正文字体（无衬线） |

### 排版工具类

在 `global.css` 中定义，直接加 className 使用：

| 类名 | 字号 | 字体 |
|---|---|---|
| `.display-xl` | 64px | display |
| `.display-lg` | 48px | display |
| `.display-md` | 36px | display |
| `.display-sm` | 28px | display |

### ToolPage 提供的通用类

在 `ToolPage.css` 中定义，工具页面直接使用：

```css
.tool-card-inner      /* 操作区白色卡片容器 */
.result-box           /* 深色结果区（下载按钮所在区域） */
.result-box__label    /* "合并完成" 等成功提示 */
.result-box__filename /* 文件名显示 */
.status-msg           /* 状态消息基类 */
.status-msg--error    /* 红色错误消息 */
.status-msg--success  /* 绿色成功消息 */
```

---

## 5. 核心约定与注意事项

### Object URL 内存管理

每次 `URL.createObjectURL()` 必须对应一次 `URL.revokeObjectURL()`，否则会产生内存泄漏。

- **单个结果文件**：使用 `useObjectUrl(result)`，在 result 变化或组件卸载时自动 revoke。
- **多个结果文件（如 SplitPage）**：用 `useEffect` 手动管理：

```ts
useEffect(() => {
  return () => { results.forEach(r => URL.revokeObjectURL(r.url)) }
}, [results])
```

- **PdfToImagePage**（每页渲染 dataURL）：用 `canvas.toDataURL()` 返回的是 base64 字符串，不是 Object URL，**不需要 revoke**。

### Blob 构建

TypeScript 严格模式下，`pdf-lib` 的 `save()` 返回 `Uint8Array<ArrayBufferLike>`，不能直接传给 `new Blob()`。必须取底层 buffer 并强转：

```ts
const bytes = await doc.save()
const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
```

### pdf-lib 加密选项类型

`pdf-lib` 的 TypeScript 类型定义不完整，`SaveOptions` 和 `LoadOptions` 缺少加密相关字段，需要 `as any`：

```ts
await doc.save({ userPassword: pw, ownerPassword: pw } as any)
await PDFDocument.load(bytes, { password: pw } as any)
```

### pdfjs v5 render API

pdfjs v5 的 `page.render()` 需要同时传 `canvas` 和 `canvasContext`：

```ts
page.render({ canvas, canvasContext: ctx, viewport: vp })
```

只传 `canvasContext` 不传 `canvas` 会报 `RenderParameters` 类型错误（v4 以前只需要 `canvasContext`）。

### PdfThumbnails 取消渲染

缩略图组件在 unmount 或 file 变更时必须取消正在进行的渲染任务，否则会向已卸载组件的 ref 写入数据：

```ts
useEffect(() => {
  let renderTask: { promise: Promise<void>; cancel: () => void } | null = null
  let cancelled = false
  doc.getPage(i + 1).then(page => {
    if (cancelled || !canvasRef.current) return
    renderTask = page.render(...)
    renderTask.promise.catch(() => {})  // 取消后 promise reject，需要静默处理
  })
  return () => { cancelled = true; renderTask?.cancel() }
}, [doc, pageIndex])
```

---

## 6. 如何新增一个工具页

以新增"PDF 转 Word"（假设）为例，完整步骤如下：

### 步骤 1：新建页面文件

`src/pages/FooPage.tsx`：

```tsx
import { useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'

export function FooPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  useObjectUrl(result)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null)
    try {
      // ... 处理逻辑 ...
      const blob = new Blob([...], { type: 'application/pdf' })
      setResult(URL.createObjectURL(blob))
    } catch (e: unknown) {
      setError(`失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="新工具" desc="功能描述">
      <div className="tool-card-inner">
        <DropZone onFiles={f => { setFile(f[0]); setResult(null) }} accept=".pdf" />
        {error && <div className="status-msg status-msg--error">{error}</div>}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={run} disabled={!file || busy} loading={busy}>开始</Button>
        </div>
      </div>
      {result && (
        <div className="result-box">
          <p className="result-box__label">完成</p>
          <Button variant="secondary-dark" onClick={() => {
            const a = document.createElement('a'); a.href = result; a.download = 'output.pdf'; a.click()
          }}>下载文件</Button>
        </div>
      )}
    </ToolPage>
  )
}
```

### 步骤 2：注册路由

`src/App.tsx`：

```tsx
import { FooPage } from './pages/FooPage'
// 在 Routes 内添加：
<Route path="/foo" element={<FooPage />} />
```

### 步骤 3：首页添加卡片

`src/pages/Home.tsx` 的 `tools` 数组末尾添加：

```ts
{
  path: '/foo',
  icon: ( <svg>...</svg> ),
  title: '新工具',
  desc: '工具功能简述',
},
```

### 步骤 4：README 更新工具数量和使用说明

---

## 7. 部署流程

### 自动部署

推送到 `main` 分支后，GitHub Actions 自动触发：

```
push to main
  → actions/checkout
  → node 20 + npm ci
  → npm run build  （tsc + vite build → dist/）
  → upload-pages-artifact（上传 dist/）
  → deploy-pages（部署到 GitHub Pages）
```

部署完成约 1–2 分钟，地址：`https://yuan791014094.github.io/pdftool/`

### 本地构建验证

```bash
npm run build       # 构建到 dist/，会先跑 tsc 类型检查
npm run preview     # 本地预览 dist/（需要在 http://localhost:4173/pdftool/ 访问）
```

### GitHub Pages SPA 路由原理

GitHub Pages 是纯静态文件服务，不支持 SPA 路由（访问 `/pdftool/merge` 时找不到文件，返回 404）。通过以下机制解决：

1. `public/404.html` — GitHub Pages 返回 404 时改为提供此文件，其中的脚本将当前 URL 存入 `sessionStorage.redirect`，然后跳转到 `/pdftool/`
2. `index.html` — React 应用加载时，检测 `sessionStorage.redirect`，调用 `history.replaceState` 恢复原始路径
3. `BrowserRouter basename="/pdftool"` — 让 React Router 正确识别 `/pdftool/` 子路径下的路由

---

## 8. 常见问题排查

### 页面白屏 / 工具卡片不显示

**原因**：`BrowserRouter` 的 `basename` 与实际部署路径不符，所有路由失配。

**检查**：`src/App.tsx` 中是否有 `basename="/pdftool"`。本地开发时如果用非根路径运行也需要对应修改。

### pdfjs Worker 报错 / PDF 不渲染

**原因**：`GlobalWorkerOptions.workerSrc` 未设置或重复设置。

**检查**：确认所有 pdfjs 用法都从 `src/lib/pdfjs.ts` 导入 `{ pdfjs }`，不要在其他文件 `import * as pdfjs from 'pdfjs-dist'`。

### TypeScript 构建报 `Uint8Array` 不兼容 `BlobPart`

`pdf-lib` 的 `save()` 返回值需要取 `.buffer as ArrayBuffer`：

```ts
// 错误：new Blob([bytes], ...)
// 正确：
new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
```

### 压缩后文件反而变大

压缩的原理是把每页渲染成 JPEG 再重建 PDF。如果原 PDF 全是矢量文字/线条而没有嵌入图片，JPEG 编码的结果可能比原始体积更大。这是正常现象，工具 UI 中有 `+X%（已是最优）` 的提示。

### git push 失败（网络问题）

本项目开发环境需要通过本地代理访问 GitHub：

```bash
git -c http.proxy=http://127.0.0.1:7897 push
```

---

## 9. 已知限制

| 限制 | 原因 | 可行方案 |
|---|---|---|
| PDF 转 Word / Word 转 PDF 不支持 | 需要 LibreOffice 或商业 OCR，无法纯浏览器实现 | 需要后端服务（Node + LibreOffice） |
| 压缩只对含图片的 PDF 有效 | 压缩原理是降低嵌入图片分辨率；纯文字 PDF 无法有效压缩 | 真正的 PDF 优化需要 Ghostscript 等工具 |
| PdfThumbnails 默认最多显示 20 页 | 避免大文件时浏览器渲染过多 canvas 卡顿 | `maxPages` prop 可调，或改为懒加载 |
| 加密 PDF 的解密依赖用户提供正确密码 | pdf-lib 不支持暴力破解，也不应该支持 | — |
| 水印只支持文字，不支持图片水印 | pdf-lib 的图片水印需要额外处理透明度和平铺逻辑 | 可扩展：用 `page.drawImage()` 实现 |
| 超大文件（>200MB）处理慢或内存不足 | 浏览器内存限制，所有操作都在内存中完成 | 无法在纯客户端解决 |
