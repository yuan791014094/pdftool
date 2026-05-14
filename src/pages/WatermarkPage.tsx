import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'
import './WatermarkPage.css'

type Position = 'center' | 'tiled' | 'bottom-right' | 'bottom-left' | 'top-right'

const POSITIONS: { key: Position; label: string }[] = [
  { key: 'center',       label: '居中' },
  { key: 'tiled',        label: '平铺' },
  { key: 'bottom-right', label: '右下角' },
  { key: 'bottom-left',  label: '左下角' },
  { key: 'top-right',    label: '右上角' },
]

export function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('仅供内部使用')
  const [position, setPosition] = useState<Position>('center')
  const [opacity, setOpacity] = useState(0.25)
  const [fontSize, setFontSize] = useState(48)
  const [color, setColor] = useState('#cc785c')
  const [rotation, setRotation] = useState(30)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)
  useObjectUrl(result?.url)

  const onFile = (files: File[]) => {
    const f = files[0]; if (!f) return
    setFile(f); setError(''); setResult(null)
  }

  const applyWatermark = async () => {
    if (!file || !text.trim()) { setError('请输入水印文字'); return }
    setBusy(true); setError(''); setResult(null); setProgress(0)
    try {
      const bytes = await file.arrayBuffer()
      const doc = await PDFDocument.load(bytes)
      const pages = doc.getPages()

      // Render text to canvas (supports Chinese / any Unicode via browser fonts)
      // Rotation is baked into the PNG so pdf-lib just stamps the image.
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const fontSpec = `bold ${fontSize}px "PingFang SC","Noto Sans SC","Microsoft YaHei","Heiti SC",Arial,sans-serif`
      ctx.font = fontSpec
      const textW = ctx.measureText(text).width
      const textH = fontSize * 1.2

      // Canvas must be large enough to contain the rotated bounding box
      const rad = Math.abs(rotation) * Math.PI / 180
      const bboxW = Math.ceil(textW * Math.cos(rad) + textH * Math.sin(rad)) + 24
      const bboxH = Math.ceil(textW * Math.sin(rad) + textH * Math.cos(rad)) + 24
      canvas.width = bboxW
      canvas.height = bboxH

      // Draw centered; negate rotation to match PDF counterclockwise convention
      ctx.clearRect(0, 0, bboxW, bboxH)
      ctx.font = fontSpec
      ctx.fillStyle = color
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.translate(bboxW / 2, bboxH / 2)
      ctx.rotate(-rotation * Math.PI / 180)
      ctx.fillText(text, 0, 0)

      const base64 = canvas.toDataURL('image/png').split(',')[1]
      const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const pdfImg = await doc.embedPng(imgBytes)
      const iw = pdfImg.width
      const ih = pdfImg.height

      const drawAt = (page: (typeof pages)[0], cx: number, cy: number) => {
        page.drawImage(pdfImg, {
          x: cx - iw / 2,
          y: cy - ih / 2,
          width: iw,
          height: ih,
          opacity,
        })
      }

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()

        if (position === 'center') {
          drawAt(page, width / 2, height / 2)
        } else if (position === 'tiled') {
          const stepX = iw + 60
          const stepY = ih + 50
          for (let y = ih / 2; y < height + ih; y += stepY) {
            for (let x = -iw; x < width + iw * 2; x += stepX) {
              drawAt(page, x, y)
            }
          }
        } else if (position === 'bottom-right') {
          drawAt(page, width - iw / 2 - 28, ih / 2 + 20)
        } else if (position === 'bottom-left') {
          drawAt(page, iw / 2 + 28, ih / 2 + 20)
        } else if (position === 'top-right') {
          drawAt(page, width - iw / 2 - 28, height - ih / 2 - 20)
        }

        setProgress(Math.round(((i + 1) / pages.length) * 90))
      }

      const out = await doc.save()
      setProgress(100)
      const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
      const name = file.name.replace(/\.pdf$/i, '') + '_watermarked.pdf'
      setResult({ url: URL.createObjectURL(blob), name })
    } catch (e: unknown) {
      setError(`添加水印失败：${e instanceof Error ? e.message : String(e)}`)
    } finally { setBusy(false) }
  }

  return (
    <ToolPage title="PDF 水印" desc="在 PDF 每页添加文字水印，支持自定义位置、透明度和样式。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />

        {file && (
          <div className="wm-options">
            <p className="wm-filename">{file.name}</p>

            <div className="wm-field">
              <label className="wm-label">水印文字</label>
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="输入水印文字"
                className="wm-input"
              />
            </div>

            <div className="wm-field">
              <label className="wm-label">位置</label>
              <div className="wm-btn-group">
                {POSITIONS.map(p => (
                  <button
                    key={p.key}
                    className={`wm-btn ${position === p.key ? 'wm-btn--active' : ''}`}
                    onClick={() => setPosition(p.key)}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            <div className="wm-row">
              <div className="wm-field">
                <label className="wm-label">透明度 {Math.round(opacity * 100)}%</label>
                <input
                  type="range" min={5} max={80} value={Math.round(opacity * 100)}
                  onChange={e => setOpacity(parseInt(e.target.value) / 100)}
                  className="wm-range"
                />
              </div>
              <div className="wm-field">
                <label className="wm-label">字号 {fontSize}px</label>
                <input
                  type="range" min={12} max={120} value={fontSize}
                  onChange={e => setFontSize(parseInt(e.target.value))}
                  className="wm-range"
                />
              </div>
              {(position === 'center' || position === 'tiled') && (
                <div className="wm-field">
                  <label className="wm-label">旋转 {rotation}°</label>
                  <input
                    type="range" min={-90} max={90} value={rotation}
                    onChange={e => setRotation(parseInt(e.target.value))}
                    className="wm-range"
                  />
                </div>
              )}
              <div className="wm-field">
                <label className="wm-label">颜色</label>
                <div className="wm-color-row">
                  {['#cc785c', '#141413', '#c64545', '#5db8a6', '#3d3d3a'].map(c => (
                    <button
                      key={c}
                      className={`wm-swatch ${color === c ? 'wm-swatch--active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="wm-color-picker" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label="添加水印中..." />}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={applyWatermark} disabled={!file || busy || !text.trim()} loading={busy}>
            添加水印
          </Button>
        </div>
      </div>

      {result && (
        <div className="result-box">
          <p className="result-box__label">水印添加完成</p>
          <p className="result-box__filename">{result.name}</p>
          <Button
            variant="secondary-dark"
            onClick={() => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }}
          >下载文件</Button>
        </div>
      )}
    </ToolPage>
  )
}
