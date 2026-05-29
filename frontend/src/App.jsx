import { useEffect, useState } from 'react'
import { healthCheck } from './services/apiClient'

function App() {
  const [healthStatus, setHealthStatus] = useState('unknown')

  useEffect(() => {
    let isMounted = true

    healthCheck()
      .then((response) => {
        if (isMounted) {
          setHealthStatus(response.status)
        }
      })
      .catch(() => {
        if (isMounted) {
          setHealthStatus('offline')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Director Desk</p>
          <h1 className="text-4xl font-semibold sm:text-6xl">AI showrunner workspace scaffold</h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Frontend shell for future script generation, storyboard planning, prompt orchestration,
            and video assembly workflows.
          </p>
          <p className="text-sm text-slate-400">Backend health: {healthStatus}</p>
        </section>
      </div>
    </main>
  )
}

export default App
