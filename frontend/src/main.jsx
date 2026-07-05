import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ProjectDataProvider } from './context/ProjectDataContext'
import { ThemeProvider } from './context/ThemeContext'
import { EditorProvider } from './context/EditorContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ProjectDataProvider>
          <EditorProvider>
            <App />
          </EditorProvider>
        </ProjectDataProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

