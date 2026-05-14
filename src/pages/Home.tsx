import { Link } from 'react-router-dom'
import './Home.css'

const tools = [
  {
    path: '/merge',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="14" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="8" y="14" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6.5 12v2.5M17.5 12v2.5M6.5 14.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: '合并 PDF',
    desc: '将多个 PDF 文件按顺序合并为一个文件，支持拖拽排序',
  },
  {
    path: '/split',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="8" y="2" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="3" y="14" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="14" y="14" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 12v2.5M12 14.5H6.5M12 14.5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: '拆分 PDF',
    desc: '将 PDF 按页码范围拆分为多个独立文件',
  },
  {
    path: '/extract',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7h6M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 17l3 3m0 0l3-3m-3 3V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: '提取页面',
    desc: '从 PDF 中提取指定页面，生成新文件',
  },
  {
    path: '/rotate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 3.5A9 9 0 0120.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M17 3.5l3-.5-.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: '旋转页面',
    desc: '对 PDF 页面进行 90°/180°/270° 旋转',
  },
  {
    path: '/pdf-to-image',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="8" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="15.5" cy="13" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M11 18l3-2.5 2 1.5 2-2.5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'PDF 转图片',
    desc: '将 PDF 每页导出为 PNG 或 JPG 图片',
  },
  {
    path: '/image-to-pdf',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="11" y="3" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="15.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M11 13l3-2.5 2 1.5 2-2.5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="8" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 12h4M7 15h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    title: '图片转 PDF',
    desc: '将多张图片（JPG/PNG）合并成一个 PDF 文件',
  },
  {
    path: '/protect',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 3L4 6v5.5C4 15.9 7.5 19.9 12 21c4.5-1.1 8-5.1 8-9.5V6L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="9" y="11" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M10 11V9a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    title: '加密 / 解密',
    desc: '为 PDF 设置密码保护，或移除已有密码',
  },
  {
    path: '/compress',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7h6M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 18l4-4m0 0l-2-2m2 2l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'PDF 压缩',
    desc: '降低内嵌图片分辨率，缩小 PDF 文件体积',
  },
  {
    path: '/watermark',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="15" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 9l10-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".5"/>
        <path d="M7 12l10-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".5"/>
        <path d="M7 15l7-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
    title: 'PDF 水印',
    desc: '在每页添加文字水印，支持位置、透明度、颜色自定义',
  },
  {
    path: '/docx-to-pdf',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M5 8l1.5 4L8 9l1.5 3L11 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 10l2.5 2.5L14 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="17" y="9" width="5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M19 12h2M19 14h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Word 转 PDF',
    desc: '将 .docx 文件转为 PDF，文字内容可正常保留',
  },
  {
    path: '/pdf-to-docx',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4 5.5h3M4 7.5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M9 7l2.5 2.5L9 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="12" y="7" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15 13l1.5 4 1.5-3 1.5 3 1.5-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'PDF 转 Word',
    desc: '从 PDF 提取文字内容，生成可编辑的 .docx 文件',
  },
]

export function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__text">
            <h1 className="display-lg hero__title">PDF 工具箱</h1>
            <p className="hero__desc">
              纯浏览器端处理，文件不上传服务器。<br />
              开源、免费、保护隐私。
            </p>
            <div className="hero__badges">
              <span className="badge-pill">开源免费</span>
              <span className="badge-pill">本地处理</span>
              <span className="badge-pill">无需注册</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="tools-section">
        <div className="container">
          <p className="tools-section__label">全部工具</p>
          <div className="tools-grid">
            {tools.map(tool => (
              <Link key={tool.path} to={tool.path} className="tool-card">
                <div className="tool-card__icon">{tool.icon}</div>
                <h2 className="tool-card__title">{tool.title}</h2>
                <p className="tool-card__desc">{tool.desc}</p>
                <span className="tool-card__arrow">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
