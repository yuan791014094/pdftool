import { useState } from 'react'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'

export function DocxToPdfPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [resultName, setResultName] = useState('')
  useObjectUrl(result)

  const convert = async () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null); setProgress(0); setStatusMsg('读取文件…')

    let container: HTMLDivElement | null = null

    try {
      const buffer = await file.arrayBuffer()
      setProgress(15); setStatusMsg('解析 Word 文档…')

      const { default: mammoth } = await import('mammoth')
      const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer: buffer })
      if (messages.some(m => m.type === 'error')) {
        const msg = messages.find(m => m.type === 'error')!.message
        throw new Error(msg)
      }
      setProgress(35); setStatusMsg('渲染页面布局…')

      // Mount HTML in a hidden off-screen container for html2canvas to render
      container = document.createElement('div')
      container.style.cssText = [
        'position:fixed', 'left:-9999px', 'top:0',
        'width:740px', 'padding:60px 72px',
        'font-family:Georgia,"Noto Serif",serif',
        'font-size:14px', 'line-height:1.75',
        'background:#fff', 'color:#000', 'box-sizing:border-box',
      ].join(';')
      container.innerHTML = html
      document.body.appendChild(container)

      setProgress(45); setStatusMsg('生成 PDF，大文件可能需要较长时间…')

      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      await new Promise<void>((resolve, reject) => {
        ;(pdf as any).html(container!, {
          callback(doc: typeof pdf) {
            try {
              if (container && document.body.contains(container)) {
                document.body.removeChild(container)
                container = null
              }
              const blob = doc.output('blob')
              const url = URL.createObjectURL(blob)
              const name = file.name.replace(/\.docx?$/i, '') + '.pdf'
              setResult(url)
              setResultName(name)
              setProgress(100)
              setStatusMsg('')
              resolve()
            } catch (e) {
              reject(e)
            }
          },
          margin: [15, 15, 15, 15],
          autoPaging: 'text',
          html2canvas: { scale: 1.5, useCORS: true, logging: false },
          width: 170,
          windowWidth: 740,
          x: 20,
          y: 20,
        })
      })
    } catch (e: unknown) {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container)
      }
      setError(`转换失败：${e instanceof Error ? e.message : String(e)}`)
      setStatusMsg('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="Word 转 PDF" desc="将 .docx 文件转为 PDF，全程在浏览器本地完成，文件不上传服务器。">
      <div className="tool-card-inner">
        <div className="word-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p style={{ margin: 0 }}>
            <strong>转换质量提示：</strong>文字、段落、标题等基本内容可正常保留，
            但复杂排版、精确字体、页眉页脚、艺术字、图表等效果可能与原文件有出入。
            如需完整还原，建议在 Word 或 WPS 中直接另存为 PDF。
          </p>
        </div>

        <DropZone
          onFiles={f => { setFile(f[0]); setResult(null); setError('') }}
          accept=".docx,.doc"
          sublabel="选择 Word 文件（.docx）"
        />

        {file && !result && (
          <p style={{ margin: 'var(--space-sm) 0 0', fontSize: 'var(--text-body-sm)', color: 'var(--color-muted)' }}>
            {file.name}
          </p>
        )}

        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label={statusMsg || '处理中…'} />}

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
