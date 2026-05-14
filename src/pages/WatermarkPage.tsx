import { useState } from 'react'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
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

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { r, g, b }
}

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
      const font = await doc.embedFont(StandardFonts.HelveticaBold)
      const pages = doc.getPages()
      const { r, g, b } = hexToRgb(color)

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()
        const textWidth = font.widthOfTextAtSize(text, fontSize)

        const drawText = (x: number, y: number, rot = rotation) => {
          page.drawText(text, {
            x, y,
            size: fontSize,
            font,
            color: rgb(r, g, b),
            opacity,
            rotate: degrees(rot),
          })
        }

        if (position === 'center') {
          drawText(
            width / 2 - textWidth / 2,
            height / 2 - fontSize / 2,
          )
        } else if (position === 'tiled') {
          const stepX = textWidth + 80
          const stepY = fontSize + 60
          for (let y = 0; y < height + stepY; y += stepY) {
            for (let x = -stepX; x < width + stepX; x += stepX) {
              drawText(x, y)
            }
          }
        } else if (position === 'bottom-right') {
          drawText(width - textWidth - 24, 24, 0)
        } else if (position === 'bottom-left') {
          drawText(24, 24, 0)
        } else if (position === 'top-right') {
          drawText(width - textWidth - 24, height - fontSize - 24, 0)
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
