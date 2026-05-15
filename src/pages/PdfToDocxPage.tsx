import { useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import '../components/ToolPage/ToolPage.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function PdfToDocxPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [resultName, setResultName] = useState('')

  const convert = async () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null); setProgress(0)

    try {
      setProgress(10)
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      const url = `${API_BASE}/api/pdf-to-docx`

      const blob = await new Promise<Blob>((resolve, reject) => {
        xhr.open('POST', url)
        xhr.responseType = 'blob'

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round(10 + (e.loaded / e.total) * 40))
          }
        }

        xhr.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round(50 + (e.loaded / e.total) * 45))
          } else {
            setProgress(75)
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response as Blob)
          } else {
            const reader = new FileReader()
            reader.onload = () => {
              try {
                const json = JSON.parse(reader.result as string)
                reject(new Error(json.detail || `服务器错误 (${xhr.status})`))
              } catch {
                reject(new Error(`转换失败 (${xhr.status})`))
              }
            }
            reader.onerror = () => reject(new Error(`转换失败 (${xhr.status})`))
            reader.readAsText(xhr.response as Blob)
          }
        }

        xhr.onerror = () => reject(new Error(
          '无法连接到转换服务。\n\n请确认后端服务已启动：\ncd server && pip install -r requirements.txt && uvicorn main:app'
        ))

        xhr.send(formData)
      })

      const objectUrl = URL.createObjectURL(blob)
      const name = file.name.replace(/\.pdf$/i, '') + '.docx'
      setResult(objectUrl)
      setResultName(name)
      setProgress(100)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      title="PDF 转 Word"
      desc="高保真 PDF 转 DOCX：保留图片、表格、排版、字体样式，生成可编辑的 Word 文档。"
    >
      <div className="tool-card-inner">
        <div className="word-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p style={{ margin: 0 }}>
            <strong>隐私提示：</strong>文件将上传至转换服务器处理，处理完成后立即删除。
            转换质量接近 Word/WPS 原生打开，支持图片、表格和排版还原。
          </p>
        </div>

        <DropZone
          onFiles={f => { setFile(f[0]); setResult(null); setError('') }}
          accept=".pdf"
          sublabel="选择 PDF 文件（最大 50MB）"
        />

        {file && !result && (
          <p style={{ margin: 'var(--space-sm) 0 0', fontSize: 'var(--text-body-sm)', color: 'var(--color-muted)' }}>
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}

        {error && (
          <div className="status-msg status-msg--error" style={{ whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}
        {busy && <ProgressBar value={progress} label="正在转换，请稍候…" />}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={convert} disabled={!file || busy} loading={busy}>
            开始转换
          </Button>
        </div>
      </div>

      {result && (
        <div className="result-box">
          <p className="result-box__label">转换完成</p>
          <p className="result-box__filename">{resultName}</p>
          <Button
            variant="secondary-dark"
            onClick={() => {
              const a = document.createElement('a')
              a.href = result!; a.download = resultName; a.click()
            }}
          >
            下载文件
          </Button>
        </div>
      )}
    </ToolPage>
  )
}
