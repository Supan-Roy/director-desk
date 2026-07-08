import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import ProductionPage from './pages/ProductionPage'
import EditorPage from './pages/EditorPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'
import AgentsPage from './pages/AgentsPage'
import TemplatesPage from './pages/TemplatesPage'
import AssetsPage from './pages/AssetsPage'
import QuotaOverlay from './components/QuotaOverlay'

function App() {
  return (
    <BrowserRouter>
      <QuotaOverlay />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects/:id/production" element={<ProductionPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/assets" element={<AssetsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
