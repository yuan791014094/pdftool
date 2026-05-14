import { useState, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { FileList } from '../components/FileList'
import { Button } from '../components/Button'
import '../components/ToolPage/ToolPage.css'

interface FileItem { id: string; name: string; size: number; file: File }
function uid() { return Math.random().toString(36).slice(2) }

const ACCEPTED = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

export function ImageToPdfPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)

  const addFiles = useCallback((incoming: File[]) => {
    const imgs = incoming.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) { setError('请选择图片文件（JPG/PNG）'); return }
    setError(''); setResult(null)
    setFiles(prev => [...prev, ...imgs.map(f => ({ id: uid(), name: f.name, size: f.size, file: f }))])
  }, [])

  const remove = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))
  const moveUp = (id: string) => setFiles(prev => {
    const i = prev.findIndex(f => f.id === id); if (i <= 0) return prev
    const next = [...prev]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next
  })
  const moveDown = (id: string) => setFiles(prev => {
    const i = prev.findIndex(f => f.id === id); if (i >= prev.length - 1) return prev
    const next = [...prev]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; return next
  })

  const convert = async () => {
    if (!files.length) return
    setBusy(true); setError(''); setResult(null)
    try {
      const doc = await PDFDocument.create()
      for (const item of files) {
        const buf = await item.file.arrayBuffer()
        let img
        if (item.file.type === 'image/png') {
          img = await doc.embedPng(buf)
        } else {
          img = await doc.embedJpg(buf)
        }
        const page = doc.addPage([img.width, img.height])
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
      }
      const out = await doc.save()
      const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
      setResult({ url: URL.createObjectURL(blob), name: 'images.pdf' })
    } catch (e: unknown) {
      setError(`转换失败：${e instanceof Error ? e.message : String(e)}`)
    } finally { setBusy(false) }
  }

  return (
    <ToolPage title="图片转 PDF" desc="将多张图片按顺序合成一个 PDF 文件。支持 JPG、PNG 格式。">
      <div className="tool-card-inner">
        <DropZone onFiles={addFiles} accept={ACCEPTED} multiple sublabel="支持 JPG / PNG，可多选" />
        <FileList files={files} onRemove={remove} onMoveUp={moveUp} onMoveDown={moveDown} showOrder />
        {error && <div className="status-msg status-msg--error">{error}</div>}
        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
          <Button onClick={convert} disabled={busy || !files.length} loading={busy}>生成 PDF</Button>
          {files.length > 0 && (
            <Button variant="secondary" onClick={() => { setFiles([]); setResult(null) }} disabled={busy}>清空</Button>
          )}
        </div>
      </div>
      {result && (
        <div className="result-box">
          <p className="result-box__label">转换完成</p>
          <p className="result-box__filename">{result.name}</p>
          <Button variant="secondary-dark" onClick={() => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }}>
            下载文件
          </Button>
        </div>
      )}
    </ToolPage>
  )
}
