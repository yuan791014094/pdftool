import { useState, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { FileList } from '../components/FileList'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import '../components/ToolPage/ToolPage.css'

interface FileItem {
  id: string
  name: string
  size: number
  file: File
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export function MergePage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [resultName, setResultName] = useState('')

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (!pdfs.length) { setError('请选择 PDF 文件'); return }
    setError('')
    setResult(null)
    setFiles(prev => [...prev, ...pdfs.map(f => ({ id: uid(), name: f.name, size: f.size, file: f }))])
  }, [])

  const remove = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))
  const moveUp = (id: string) => setFiles(prev => {
    const i = prev.findIndex(f => f.id === id)
    if (i <= 0) return prev
    const next = [...prev]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next
  })
  const moveDown = (id: string) => setFiles(prev => {
    const i = prev.findIndex(f => f.id === id)
    if (i >= prev.length - 1) return prev
    const next = [...prev]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; return next
  })

  const merge = async () => {
    if (files.length < 2) { setError('请至少添加 2 个 PDF 文件'); return }
    setBusy(true); setError(''); setResult(null); setProgress(0)
    try {
      const merged = await PDFDocument.create()
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].file.arrayBuffer()
        const doc = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach(p => merged.addPage(p))
        setProgress(Math.round(((i + 1) / files.length) * 90))
      }
      const bytes = await merged.save()
      setProgress(100)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const name = 'merged.pdf'
      setResult(url); setResultName(name)
    } catch (e: unknown) {
      setError(`合并失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result; a.download = resultName; a.click()
  }

  return (
    <ToolPage title="合并 PDF" desc="将多个 PDF 文件合并为一个。拖拽调整顺序，然后点击合并。">
      <div className="tool-card-inner">
        <DropZone onFiles={addFiles} multiple accept=".pdf" sublabel="支持多选 PDF 文件" />
        <FileList files={files} onRemove={remove} onMoveUp={moveUp} onMoveDown={moveDown} showOrder />
        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label="合并中..." />}
        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
          <Button onClick={merge} disabled={busy || files.length < 2} loading={busy}>
            合并 PDF
          </Button>
          {files.length > 0 && (
            <Button variant="secondary" onClick={() => { setFiles([]); setResult(null); setError('') }} disabled={busy}>
              清空
            </Button>
          )}
        </div>
      </div>
      {result && (
        <div className="result-box">
          <p className="result-box__label">合并完成</p>
          <p className="result-box__filename">{resultName}</p>
          <Button variant="secondary-dark" onClick={download}>下载文件</Button>
        </div>
      )}
    </ToolPage>
  )
}
