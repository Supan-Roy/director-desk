import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ProjectDataProvider } from './context/ProjectDataContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProjectDataProvider>
      <App />
    </ProjectDataProvider>
  </React.StrictMode>,
)
