import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
