import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Bucket } from '../api/client'

export default function Dashboard() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.buckets.list().then((r) => { setBuckets(r.buckets); setError(null) }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500">Loading...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>

  const formatBytes = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (n / 1e6).toFixed(1) + ' MB')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      {buckets.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No buckets yet. Add one in <Link to="/settings" className="text-primary-600 font-medium hover:underline">Settings</Link>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((b) => (
            <Link
              key={b.id}
              to={`/bucket/${b.id}/`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow transition"
            >
              <h2 className="font-semibold text-gray-900">{b.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{b.bucket_name}</p>
              <p className="mt-2 text-sm text-gray-600">
                {formatBytes(b.used_bytes)} / {b.storage_limit_gb} GB
              </p>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: `${Math.min(100, (b.used_bytes / (b.storage_limit_gb * 1e9)) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
