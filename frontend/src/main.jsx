import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ProjectDataProvider } from './context/ProjectDataContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ProjectDataProvider>
        <App />
      </ProjectDataProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

