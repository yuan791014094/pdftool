import './FileList.css'

interface FileItem {
  name: string
  size: number
  id: string
}

interface FileListProps {
  files: FileItem[]
  onRemove?: (id: string) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
  showOrder?: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileList({ files, onRemove, onMoveUp, onMoveDown, showOrder = false }: FileListProps) {
  if (files.length === 0) return null

  return (
    <ul className="file-list">
      {files.map((file, index) => (
        <li key={file.id} className="file-list__item">
          <div className="file-list__info">
            {showOrder && <span className="file-list__order">{index + 1}</span>}
            <svg className="file-list__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1" width="10" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="file-list__name">{file.name}</span>
            <span className="file-list__size">{formatSize(file.size)}</span>
          </div>
          <div className="file-list__actions">
            {onMoveUp && index > 0 && (
              <button className="file-list__btn" onClick={() => onMoveUp(file.id)} title="上移">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 10V4M4 7l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {onMoveDown && index < files.length - 1 && (
              <button className="file-list__btn" onClick={() => onMoveDown(file.id)} title="下移">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 4v6M4 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {onRemove && (
              <button className="file-list__btn file-list__btn--remove" onClick={() => onRemove(file.id)} title="移除">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
