import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import ProductionPage from './pages/ProductionPage'
import EditorPage from './pages/EditorPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'
import { EditorProvider } from './context/EditorContext'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects/:id/production" element={<ProductionPage />} />
        <Route path="/editor" element={
          <EditorProvider>
            <EditorPage />
          </EditorProvider>
        } />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
