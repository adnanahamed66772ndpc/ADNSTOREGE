import { useState } from 'react'
import { FileEntry } from '../api/client'

function formatSize(bytes: number) {
  if (bytes === 0) return '—'
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}

interface FileListProps {
  entries: FileEntry[]
  loading: boolean
  currentPath: string
  onOpenFolder: (path: string) => void
  onPreview: (entry: FileEntry) => void
  onDelete: (entry: FileEntry) => void
  onCreateFolder: (name: string) => void
  onRefresh: () => void
}

export default function FileList({
  entries,
  loading,
  currentPath,
  onOpenFolder,
  onPreview,
  onDelete,
  onCreateFolder,
  onRefresh,
}: FileListProps) {
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  const submitFolder = () => {
    const name = newFolderName.trim()
    if (name) {
      onCreateFolder(name)
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">Files</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNewFolder((v) => !v)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            New folder
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>
      {showNewFolder && (
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitFolder()}
            placeholder="Folder name"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={submitFolder}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
      {loading ? (
        <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">No files or folders</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  {entry.is_folder ? (
                    <button
                      type="button"
                      onClick={() => onOpenFolder(currentPath === '/' ? '/' + entry.name : currentPath + '/' + entry.name)}
                      className="text-primary-600 font-medium hover:underline flex items-center gap-2"
                    >
                      <FolderIcon />
                      {entry.name}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPreview(entry)}
                      className="text-gray-900 hover:text-primary-600 flex items-center gap-2 text-left"
                    >
                      <FileIcon mime={entry.mime_type} />
                      {entry.name}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">{formatSize(entry.size)}</td>
                <td className="px-4 py-2 text-right">
                  {!entry.is_folder && (
                    <button
                      type="button"
                      onClick={() => onPreview(entry)}
                      className="text-primary-600 hover:underline text-sm mr-2"
                    >
                      Preview
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function FileIcon({ mime }: { mime: string | null }) {
  const isImage = mime?.startsWith('image/')
  const isPdf = mime === 'application/pdf'
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {isImage ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
      ) : isPdf ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      )}
    </svg>
  )
}
