import { useEffect, useState } from 'react'
import { api, FileEntry } from '../api/client'

interface PreviewModalProps {
  file: FileEntry
  bucketId: number
  onClose: () => void
}

export default function PreviewModal({ file, bucketId, onClose }: PreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.presign(bucketId, file.id).then((r) => { setUrl(r.url); setError(null) }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [bucketId, file.id])

  const isImage = file.mime_type?.startsWith('image/')
  const isPdf = file.mime_type === 'application/pdf'
  const isText = file.mime_type?.startsWith('text/') || file.mime_type === 'application/json'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-4xl max-h-[90vh] w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                download={file.name}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {loading && <div className="text-gray-500">Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {url && !loading && (
            <>
              {isImage && <img src={url} alt={file.name} className="max-w-full h-auto mx-auto" />}
              {isPdf && <iframe src={url} title={file.name} className="w-full h-[80vh] rounded-lg border border-gray-200" />}
              {isText && <TextView url={url} />}
              {!isImage && !isPdf && !isText && (
                <p className="text-gray-500">Preview not available. Use Download to get the file.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TextView({ url }: { url: string }) {
  const [text, setText] = useState<string>('')
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText)
  }, [url])
  return <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono p-2 bg-gray-50 rounded-lg overflow-auto max-h-[70vh]">{text}</pre>
}
