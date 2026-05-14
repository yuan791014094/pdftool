import { useState } from 'react'
import { pdfjs } from '../lib/pdfjs'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'

export function PdfToDocxPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [resultName, setResultName] = useState('')
  useObjectUrl(result)

  const convert = async () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null); setProgress(0)

    try {
      const buffer = await file.arrayBuffer()
      const pdfDoc = await pdfjs.getDocument({ data: buffer }).promise
      const pageCount = pdfDoc.numPages
      setProgress(10)

      const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx')
      type DocParagraph = InstanceType<typeof Paragraph>
      const paragraphs: DocParagraph[] = []

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()

        // Group text items by rounded Y position (PDF Y-axis is bottom-up)
        const byY = new Map<number, { x: number; str: string }[]>()
        for (const item of textContent.items) {
          if (!('str' in item) || !(item as { str: string }).str.trim()) continue
          const t = (item as { transform: number[] }).transform
          const y = Math.round(t[5])
          const x = Math.round(t[4])
          if (!byY.has(y)) byY.set(y, [])
          byY.get(y)!.push({ x, str: (item as { str: string }).str })
        }

        // Sort by Y descending, then by X within each line
        const lines = [...byY.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, items]) =>
            items.sort((a, b) => a.x - b.x).map(i => i.str).join('')
          )
          .filter(l => l.trim())

        for (const line of lines) {
          paragraphs.push(new Paragraph({ children: [new TextRun(line)] }))
        }

        if (i < pageCount) {
          paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
        }

        setProgress(Math.round(10 + (i / pageCount) * 80))
      }

      const doc = new Document({ sections: [{ children: paragraphs }] })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const name = file.name.replace(/\.pdf$/i, '') + '.docx'
      setResult(url); setResultName(name)
      setProgress(100)
    } catch (e: unknown) {
      setError(`转换失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="PDF 转 Word" desc="从 PDF 中提取文字内容，生成可编辑的 .docx 文件，全程在浏览器本地完成。">
      <div className="tool-card-inner">
        <div className="word-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p style={{ margin: 0 }}>
            <strong>转换质量提示：</strong>仅提取 PDF 中的文字内容，按原始阅读顺序排列。
            原始排版、图片、表格、页眉页脚等均无法还原。扫描件（图片型 PDF）无法提取文字。
            如需高精度转换，建议使用 Adobe Acrobat 或其他专业工具。
          </p>
        </div>

        <DropZone
          onFiles={f => { setFile(f[0]); setResult(null); setError('') }}
          accept=".pdf"
          sublabel="选择 PDF 文件"
        />

        {file && !result && (
          <p style={{ margin: 'var(--space-sm) 0 0', fontSize: 'var(--text-body-sm)', color: 'var(--color-muted)' }}>
            {file.name}
          </p>
        )}

        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label="提取文字中…" />}

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
