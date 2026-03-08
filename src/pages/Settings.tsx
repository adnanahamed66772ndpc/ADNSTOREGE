import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Bucket, CreateBucketBody } from '../api/client'

export default function Settings() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateBucketBody & { id?: number }>({
    name: '',
    endpoint: '',
    access_key: '',
    secret_key: '',
    bucket_name: '',
    storage_limit_gb: 9,
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => api.buckets.list().then((r) => { setBuckets(r.buckets); setError(null) }).catch((e) => setError(e.message))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.buckets.update(editingId, {
          name: form.name,
          endpoint: form.endpoint,
          access_key: form.access_key || undefined,
          secret_key: form.secret_key || undefined,
          bucket_name: form.bucket_name,
          storage_limit_gb: form.storage_limit_gb,
        })
      } else {
        await api.buckets.create(form)
      }
      setForm({ name: '', endpoint: '', access_key: '', secret_key: '', bucket_name: '', storage_limit_gb: 9 })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteBucket = async (id: number) => {
    if (!confirm('Delete this bucket? All file metadata will be removed.')) return
    setSaving(true)
    try {
      await api.buckets.delete(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (b: Bucket) => {
    setForm({
      name: b.name,
      endpoint: b.endpoint,
      access_key: '',
      secret_key: '',
      bucket_name: b.bucket_name,
      storage_limit_gb: b.storage_limit_gb,
    })
    setEditingId(b.id)
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-medium text-gray-900">Database</h2>
        <p className="mt-1 text-sm text-gray-500">Initialize or re-run migrations from the web.</p>
        <Link to="/setup" className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">Open database setup</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{editingId ? 'Edit bucket' : 'Add bucket'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="My R2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">R2 endpoint (e.g. https://ACCOUNT_ID.r2.cloudflarestorage.com)</label>
            <input
              type="text"
              required
              value={form.endpoint}
              onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="https://xxx.r2.cloudflarestorage.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access key</label>
            <input
              type="password"
              value={form.access_key}
              onChange={(e) => setForm((f) => ({ ...f, access_key: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder={editingId ? 'Leave blank to keep current' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret key</label>
            <input
              type="password"
              value={form.secret_key}
              onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder={editingId ? 'Leave blank to keep current' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bucket name (R2)</label>
            <input
              type="text"
              required
              value={form.bucket_name}
              onChange={(e) => setForm((f) => ({ ...f, bucket_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage limit (GB)</label>
            <input
              type="number"
              min={1}
              max={9}
              value={form.storage_limit_gb}
              onChange={(e) => setForm((f) => ({ ...f, storage_limit_gb: parseInt(e.target.value, 10) || 9 }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {editingId ? 'Update' : 'Add'} bucket
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm({ name: '', endpoint: '', access_key: '', secret_key: '', bucket_name: '', storage_limit_gb: 9 }) }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="text-lg font-medium text-gray-900 mb-3">Buckets</h2>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bucket</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {buckets.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{b.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{b.bucket_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(b.used_bytes / 1e9).toFixed(2)} / {b.storage_limit_gb} GB
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(b)} className="text-primary-600 hover:underline text-sm mr-3">Edit</button>
                  <button onClick={() => deleteBucket(b.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
