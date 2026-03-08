import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import BucketBrowser from './pages/BucketBrowser'
import Settings from './pages/Settings'
import Setup from './pages/Setup'
import { api } from './api/client'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [setupChecked, setSetupChecked] = useState(false)
  const [initialized, setInitialized] = useState(true)

  useEffect(() => {
    if (location.pathname === '/setup') {
      setSetupChecked(true)
      return
    }
    api.setup.status().then((r) => {
      setInitialized(r.initialized)
      setSetupChecked(true)
      if (!r.initialized && location.pathname !== '/setup') navigate('/setup', { replace: true })
    }).catch(() => {
      setSetupChecked(true)
      setInitialized(false)
      if (location.pathname !== '/setup') navigate('/setup', { replace: true })
    })
  }, [location.pathname, navigate])

  if (!setupChecked || !initialized) {
    if (location.pathname === '/setup') {
      return (
        <div className="min-h-screen flex flex-col bg-gray-50">
          <header className="border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <span className="text-xl font-semibold text-gray-900">ADN Storage</span>
            </div>
          </header>
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Setup />
          </main>
        </div>
      )
    }
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <NavLink to="/" className="text-xl font-semibold text-gray-900">
                ADN Storage
              </NavLink>
              <nav className="flex gap-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  Settings
                </NavLink>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bucket/:bucketId/*" element={<BucketBrowser />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/setup" element={<Setup />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
