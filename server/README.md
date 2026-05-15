# PDF to DOCX 转换后端

基于 `pdf2docx`（PyMuPDF）的高保真 PDF 转 Word 服务。

## 本地运行

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload
```

服务启动在 `http://localhost:8000`。

## 前端配置

前端默认连接 `http://localhost:8000`。如需修改，在项目根目录 `.env` 中设置：

```
VITE_API_URL=https://your-server.com
```

## Docker 部署（免费方案推荐）

```bash
cd server
docker build -t pdftool-api .
docker run -p 8000:8000 pdftool-api
```

### 免费部署选项

1. **Render.com** — 免费 Web Service，支持 Docker，每月 750 小时
2. **Railway.app** — 免费额度 $5/月，支持 Docker 一键部署
3. **Fly.io** — 免费 3 个小型 VM，适合轻量 API

以 Render 为例：
1. 将 `server/` 推送到 GitHub 仓库
2. 在 Render 创建 Web Service，选择该仓库
3. Root Directory 设为 `server`
4. 自动检测 Dockerfile 并部署
5. 拿到 URL 后设置 `VITE_API_URL`

## API

### POST /api/pdf-to-docx

上传 PDF 文件，返回转换后的 .docx 文件。

- Content-Type: `multipart/form-data`
- 字段: `file` (PDF 文件，最大 50MB)
- 返回: `.docx` 文件流
