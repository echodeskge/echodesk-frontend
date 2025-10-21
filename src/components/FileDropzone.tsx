"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, FileText, FileImage, FileArchive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UploadedFile {
  file: File
  preview?: string
  progress?: number
  error?: string
}

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  files?: UploadedFile[]
  onRemoveFile?: (index: number) => void
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: Record<string, string[]>
  className?: string
  disabled?: boolean
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) {
    return FileImage
  }
  if (file.type.startsWith('text/')) {
    return FileText
  }
  if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z')) {
    return FileArchive
  }
  return File
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function FileDropzone({
  onFilesSelected,
  files = [],
  onRemoveFile,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept,
  className,
  disabled = false
}: FileDropzoneProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${formatFileSize(maxSize)}`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('File type is not supported')
      } else {
        setError('File upload failed')
      }
      return
    }

    if (files.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    onFilesSelected(acceptedFiles)
  }, [files.length, maxFiles, maxSize, onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    maxFiles,
    accept,
    disabled,
    multiple: true
  })

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragActive && !disabled && 'hover:border-primary/50',
          error && 'border-destructive'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn(
          'mx-auto h-12 w-12 mb-4',
          isDragActive ? 'text-primary' : 'text-muted-foreground'
        )} />

        {isDragActive ? (
          <p className="text-primary font-medium">Drop files here...</p>
        ) : (
          <div className="space-y-2">
            <p className="font-medium">Drag & drop files here, or click to select</p>
            <p className="text-sm text-muted-foreground">
              Maximum {maxFiles} files, up to {formatFileSize(maxSize)} each
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </p>
          <div className="space-y-2">
            {files.map((uploadedFile, index) => {
              const FileIcon = getFileIcon(uploadedFile.file)

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg group"
                >
                  {uploadedFile.preview && uploadedFile.file.type.startsWith('image/') ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>

                    {uploadedFile.progress !== undefined && uploadedFile.progress < 100 && (
                      <div className="mt-2 h-1 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        />
                      </div>
                    )}

                    {uploadedFile.error && (
                      <p className="text-xs text-destructive mt-1">
                        {uploadedFile.error}
                      </p>
                    )}
                  </div>

                  {onRemoveFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
