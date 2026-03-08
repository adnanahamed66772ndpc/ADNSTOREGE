import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Setup() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'initialized' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    api.setup.status().then((r) => {
      if (r.initialized) setStatus('initialized')
      else if (r.error) {
        setStatus('error')
        setError(r.error)
      }
      else setStatus('ready')
    }).catch(() => { setStatus('error'); setError('Could not reach server') })
  }, [])

  const handleInit = async () => {
    setInitializing(true)
    setError(null)
    try {
      await api.setup.init()
      setStatus('initialized')
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Initialization failed')
    } finally {
      setInitializing(false)
    }
  }

  if (status === 'initialized') {
    navigate('/', { replace: true })
    return null
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8">
        <h1 className="text-xl font-semibold text-gray-900">Database setup</h1>
        <p className="mt-2 text-sm text-gray-600">
          Initialize the database from the web. You don’t need to run any commands locally or in the dashboard.
        </p>
        {status === 'loading' && <p className="mt-4 text-gray-500">Checking...</p>}
        {status === 'error' && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
            <p className="mt-2 text-gray-600">
              Make sure the project has a D1 database bound as <code className="bg-red-100 px-1 rounded">DB</code> in Cloudflare Pages / Workers settings.
            </p>
          </div>
        )}
        {status === 'ready' && (
          <div className="mt-6">
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button
              type="button"
              onClick={handleInit}
              disabled={initializing}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {initializing ? 'Initializing...' : 'Initialize database'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
