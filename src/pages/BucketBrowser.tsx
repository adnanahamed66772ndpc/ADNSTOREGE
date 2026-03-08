import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, FileEntry } from '../api/client'
import FileList from '../components/FileList'
import PreviewModal from '../components/PreviewModal'
import UploadArea from '../components/UploadArea'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5 MB

export default function BucketBrowser() {
  const { bucketId } = useParams<{ bucketId: string }>()
  const id = bucketId ? parseInt(bucketId, 10) : null
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const load = () => {
    if (id == null) return
    setLoading(true)
    api.files.list(id, path).then((r) => { setEntries(r.entries); setError(null) }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id, path])

  const pathSegments = path === '/' ? [] : path.replace(/^\//, '').split('/').filter(Boolean)
  const breadcrumbs = [{ name: 'Root', path: '/' }, ...pathSegments.map((name, i) => ({ name, path: '/' + pathSegments.slice(0, i + 1).join('/') }))]

  const handleDelete = async (entry: FileEntry) => {
    if (!id || !confirm(`Delete ${entry.name}?`)) return
    try {
      await api.files.delete(id, entry.id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const handleCreateFolder = async (name: string) => {
    if (!id) return
    try {
      await api.files.createFolder(id, path, name)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const uploadFile = async (file: File) => {
    if (!id) return
    const key = `${file.name}-${Date.now()}`
    setUploadProgress((p) => ({ ...p, [key]: 0 }))
    setUploading(true)
    try {
      if (file.size <= CHUNK_SIZE) {
        await api.upload.single(id, path, file)
        setUploadProgress((p) => ({ ...p, [key]: 100 }))
      } else {
        const { uploadId, key: r2Key } = await api.upload.startMultipart(id, path, file.name, file.size)
        const partSize = CHUNK_SIZE
        const partCount = Math.ceil(file.size / partSize)
        const parts: { partNumber: number; etag: string }[] = []
        for (let i = 0; i < partCount; i++) {
          const { url } = await api.upload.getPartUrl(id, uploadId, r2Key, i + 1)
          const start = i * partSize
          const end = Math.min(start + partSize, file.size)
          const chunk = file.slice(start, end)
          const res = await fetch(url, { method: 'PUT', body: chunk })
          const etag = res.headers.get('ETag') ?? ''
          parts.push({ partNumber: i + 1, etag })
          setUploadProgress((p) => ({ ...p, [key]: Math.round(((i + 1) / partCount) * 100) }))
        }
        await api.upload.completeMultipart(id, uploadId, r2Key, parts)
        setUploadProgress((p) => ({ ...p, [key]: 100 }))
      }
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadProgress((p) => {
        const next = { ...p }
        delete next[key]
        return next
      })
      setUploading(false)
    }
  }

  if (id == null || Number.isNaN(id)) {
    return <div className="text-gray-500">Invalid bucket</div>
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">Dashboard</Link>
        <span className="text-gray-400">/</span>
        {breadcrumbs.map((b, i) => (
          <span key={b.path}>
            <button
              type="button"
              onClick={() => setPath(b.path)}
              className={i === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}
            >
              {b.name}
            </button>
            {i < breadcrumbs.length - 1 && <span className="text-gray-400 mx-1">/</span>}
          </span>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <UploadArea onUpload={uploadFile} disabled={uploading} />
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
          {Object.entries(uploadProgress).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="truncate flex-1">{k.replace(/-[0-9]+$/, '')}</span>
              <span>{v}%</span>
              <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <FileList
          entries={entries}
          loading={loading}
          currentPath={path}
          onOpenFolder={(p) => setPath(p)}
          onPreview={setPreviewFile}
          onDelete={handleDelete}
          onCreateFolder={handleCreateFolder}
          onRefresh={load}
        />
      </div>

      {previewFile && (
        <PreviewModal
          file={previewFile}
          bucketId={id}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
