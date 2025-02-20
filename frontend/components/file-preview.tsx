import { FileIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
      <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
        <FileIcon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-gray-700">{file.name}</p>
        <p className="text-xs text-gray-500">PDF</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-500 hover:text-gray-900"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

