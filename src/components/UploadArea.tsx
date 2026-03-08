import { useCallback, useState } from 'react'

interface UploadAreaProps {
  onUpload: (file: File) => void | Promise<void>
  disabled?: boolean
}

export default function UploadArea({ onUpload, disabled }: UploadAreaProps) {
  const [drag, setDrag] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return
      Array.from(files).forEach((file) => {
        void Promise.resolve(onUpload(file))
      })
    },
    [onUpload, disabled]
  )

  return (
    <div
      className={`mb-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        drag && !disabled ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
    >
      <input
        type="file"
        multiple
        className="hidden"
        id="file-upload"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-sm font-medium text-gray-600">Drag and drop files here, or click to select</p>
        <p className="mt-1 text-xs text-gray-500">Large files are uploaded in 5 MB chunks</p>
      </label>
    </div>
  )
}
