import { useState } from 'react'
import { pdfjs } from '../lib/pdfjs'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'

// ── Text extraction helpers ──────────────────────────────────────────────────

interface RawItem {
  str: string
  x: number
  y: number
  w: number
  fontSize: number
  bold: boolean
  italic: boolean
}

interface DocLine {
  y: number
  x: number
  text: string
  fontSize: number
  bold: boolean
  italic: boolean
}

function extractRawItems(items: unknown[]): RawItem[] {
  const result: RawItem[] = []
  for (const raw of items) {
    // pdfjs returns TextItem | TextMarkedContent — only TextItem has str/transform
    const item = raw as Record<string, unknown>
    if (typeof item.str !== 'string' || item.str === '') continue  // skip truly empty; keep spaces
    if (!Array.isArray(item.transform) || item.transform.length < 6) continue

    const t = item.transform as number[]
    // Primary: pdfjs height field (bounding box height ≈ font size)
    // Fallback: |t[3]| (scaleY), then |t[0]| (scaleX)
    const h = typeof item.height === 'number' ? item.height : 0
    const rawSize = h > 0.5 ? h
      : Math.abs(t[3]) > 0.5 ? Math.abs(t[3])
      : Math.abs(t[0]) > 0.5 ? Math.abs(t[0])
      : 10
    const fontSize = Math.round(rawSize * 10) / 10

    const fontName = typeof item.fontName === 'string' ? item.fontName : ''

    result.push({
      str: item.str,
      x: t[4],
      y: Math.round(t[5] * 10) / 10,
      w: typeof item.width === 'number' ? item.width : 0,
      fontSize,
      bold: /bold|heavy|black/i.test(fontName),
      italic: /italic|oblique/i.test(fontName),
    })
  }
  return result
}

function groupIntoLines(items: RawItem[]): DocLine[] {
  if (items.length === 0) return []
  items.sort((a, b) => b.y - a.y || a.x - b.x)

  const buckets: RawItem[][] = []
  for (const item of items) {
    const bucket = buckets.find(b => Math.abs(b[0].y - item.y) < 2)
    if (bucket) bucket.push(item)
    else buckets.push([item])
  }

  return buckets
    .map(bucket => {
      bucket.sort((a, b) => a.x - b.x)
      const parts: string[] = []
      let prevRight = -Infinity
      for (const it of bucket) {
        const gap = it.x - prevRight
        if (prevRight > -Infinity && gap > it.fontSize * 0.25 && !parts[parts.length - 1]?.endsWith(' ')) {
          parts.push(' ')
        }
        parts.push(it.str)
        prevRight = it.x + it.w
      }
      const text = parts.join('').replace(/\s+/g, ' ').trim()
      if (!text) return null
      const dominant = bucket.reduce((a, b) => a.fontSize >= b.fontSize ? a : b)
      return {
        y: bucket[0].y,
        x: bucket[0].x,
        text,
        fontSize: dominant.fontSize,
        bold: dominant.bold,
        italic: dominant.italic,
      }
    })
    .filter((l): l is DocLine => l !== null)
}

function detectBodySize(lines: DocLine[]): number {
  if (lines.length === 0) return 12
  const freq = new Map<number, number>()
  for (const l of lines) {
    const s = Math.round(l.fontSize)
    freq.set(s, (freq.get(s) ?? 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function mergeIntoParagraphs(lines: DocLine[], bodySize: number): DocLine[] {
  const merged: DocLine[] = []
  let buffer: DocLine[] = []

  const flush = () => {
    if (buffer.length === 0) return
    merged.push({ ...buffer[0], text: buffer.map(l => l.text).join(' ') })
    buffer = []
  }

  for (const line of lines) {
    const isHeading = line.fontSize >= bodySize * 1.12 || (line.bold && line.fontSize >= bodySize)
    if (isHeading) { flush(); merged.push(line); continue }

    if (buffer.length === 0) { buffer.push(line); continue }

    const prev = buffer[buffer.length - 1]
    const gap = prev.y - line.y
    const normalLineHeight = Math.max(prev.fontSize, line.fontSize) * 1.5
    if (gap <= normalLineHeight) buffer.push(line)
    else { flush(); buffer.push(line) }
  }
  flush()
  return merged
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PdfToDocxPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [resultName, setResultName] = useState('')
  const [paraCount, setParaCount] = useState(0)
  useObjectUrl(result)

  const convert = async () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null); setProgress(0); setParaCount(0)

    try {
      const buffer = await file.arrayBuffer()
      const pdfDoc = await pdfjs.getDocument({ data: buffer }).promise
      const pageCount = pdfDoc.numPages
      setProgress(5)

      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak,
      } = await import('docx')

      type DocParagraph = InstanceType<typeof Paragraph>
      const docParagraphs: DocParagraph[] = []

      // Pass 1: extract all lines (needed to compute global body font size)
      const allLines: DocLine[] = []
      const perPage: DocLine[][] = []
      for (let p = 1; p <= pageCount; p++) {
        const page = await pdfDoc.getPage(p)
        const tc = await page.getTextContent()
        const lines = groupIntoLines(extractRawItems(tc.items as unknown[]))
        allLines.push(...lines)
        perPage.push(lines)
        setProgress(Math.round(5 + (p / pageCount) * 40))
      }

      if (allLines.length === 0) {
        throw new Error(
          '未能提取到任何文字内容。\n\n' +
          '该 PDF 可能是：\n' +
          '① 扫描件（图片型 PDF）— 浏览器端无法识别图片文字\n' +
          '② 加密/受权限保护的 PDF\n' +
          '③ 字体嵌入异常，文字无法解码'
        )
      }

      const bodySize = detectBodySize(allLines)
      let textParaCount = 0

      // Pass 2: build docx
      for (let p = 0; p < pageCount; p++) {
        const paragraphLines = mergeIntoParagraphs(perPage[p], bodySize)

        for (const line of paragraphLines) {
          if (!line.text.trim()) continue

          const ratio = line.fontSize / bodySize
          const isHeading = ratio >= 1.12 || (line.bold && line.fontSize >= bodySize)

          let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined
          if (isHeading) {
            if (ratio >= 1.6) headingLevel = HeadingLevel.HEADING_1
            else if (ratio >= 1.3) headingLevel = HeadingLevel.HEADING_2
            else headingLevel = HeadingLevel.HEADING_3
          }

          const halfPts = Math.round(Math.max(8, Math.min(144, line.fontSize)) * 2)

          docParagraphs.push(new Paragraph({
            ...(headingLevel !== undefined ? { heading: headingLevel } : {}),
            children: [new TextRun({
              text: line.text,
              bold: line.bold,
              italics: line.italic,
              ...(headingLevel === undefined ? { size: halfPts } : {}),
            })],
          }))
          textParaCount++
        }

        if (p < pageCount - 1) {
          docParagraphs.push(new Paragraph({ children: [new PageBreak()] }))
        }
        setProgress(Math.round(45 + ((p + 1) / pageCount) * 50))
      }

      const doc = new Document({ sections: [{ children: docParagraphs }] })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const name = file.name.replace(/\.pdf$/i, '') + '.docx'
      setResult(url); setResultName(name); setParaCount(textParaCount); setProgress(100)
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
      desc="从 PDF 提取文字，自动识别标题层级、加粗、斜体，合并段落，生成可编辑的 .docx 文件。"
    >
      <div className="tool-card-inner">
        <div className="word-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p style={{ margin: 0 }}>
            <strong>转换质量提示：</strong>可识别正文、多级标题、加粗与斜体，段落自动合并。
            图片、表格、精确排版、页眉页脚无法还原。扫描件（图片型 PDF）无法提取文字。
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

        {error && (
          <div className="status-msg status-msg--error" style={{ whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}
        {busy && <ProgressBar value={progress} label="分析文档结构中…" />}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={convert} disabled={!file || busy} loading={busy}>
            开始转换
          </Button>
        </div>
      </div>

      {result && (
        <div className="result-box">
          <p className="result-box__label">
            转换完成 · 共提取 {paraCount} 个段落
          </p>
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
