import { Link } from 'react-router-dom'
import './ToolPage.css'

interface ToolPageProps {
  title: string
  desc?: string
  children: React.ReactNode
}

export function ToolPage({ title, desc, children }: ToolPageProps) {
  return (
    <main className="tool-page">
      <div className="container">
        <Link to="/" className="tool-page__back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 7H4M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          全部工具
        </Link>
        <h1 className="display-md tool-page__title">{title}</h1>
        {desc && <p className="tool-page__desc">{desc}</p>}
        <div className="tool-page__body">{children}</div>
      </div>
    </main>
  )
}
