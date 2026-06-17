import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import EditorPage from './pages/EditorPage'
import { EditorProvider } from './context/EditorContext'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/editor" element={
          <EditorProvider>
            <EditorPage />
          </EditorProvider>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
