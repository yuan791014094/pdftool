import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Home } from './pages/Home'
import { MergePage } from './pages/MergePage'
import { SplitPage } from './pages/SplitPage'
import { ExtractPage } from './pages/ExtractPage'
import { RotatePage } from './pages/RotatePage'
import { PdfToImagePage } from './pages/PdfToImagePage'
import { ImageToPdfPage } from './pages/ImageToPdfPage'
import { ProtectPage } from './pages/ProtectPage'
import './styles/global.css'

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/split" element={<SplitPage />} />
        <Route path="/extract" element={<ExtractPage />} />
        <Route path="/rotate" element={<RotatePage />} />
        <Route path="/pdf-to-image" element={<PdfToImagePage />} />
        <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
        <Route path="/protect" element={<ProtectPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
