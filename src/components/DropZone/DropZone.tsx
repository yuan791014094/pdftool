import React from 'react'
import './DropZone.css'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  label?: string
  sublabel?: string
  disabled?: boolean
}

export function DropZone({
  onFiles,
  accept = '.pdf',
  multiple = false,
  label,
  sublabel,
  disabled = false,
}: DropZoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--dragging' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="dropzone__icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 4v16M10 10l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="dropzone__label">{label ?? (multiple ? '拖入文件或点击选择' : '拖入文件或点击选择')}</p>
      {sublabel && <p className="dropzone__sublabel">{sublabel}</p>}
    </div>
  )
}
