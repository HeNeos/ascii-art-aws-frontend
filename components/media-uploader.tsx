"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { FileUp, X, ImageIcon, Video, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MediaUploaderProps {
  onUploadStart: () => void
  onProcessingStart: () => void
  onUploadComplete: (url: string, type: "image" | "video") => void
}

export default function MediaUploader({ onUploadStart, onProcessingStart, onUploadComplete }: MediaUploaderProps) {
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Create preview URL when a file is selected
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreviewUrl(objectUrl)

      // Free memory when this component is unmounted
      return () => {
        URL.revokeObjectURL(objectUrl)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [selectedFile])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFile = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4"]
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a PNG, JPG, JPEG, or MP4 file.")
      return false
    }

    // 16MB max size
    if (file.size > 16 * 1024 * 1024) {
      setError("File is too large. Maximum size is 16MB.")
      return false
    }

    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
        setError(null)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
        setError(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setError(null)
      onUploadStart()

      const response = await fetch("/api/get-presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to get presigned URL: ${errorData}`)
      }

      const data = await response.json()

      if (!data.presignedPost || !data.presignedPost.uploadUrl || !data.presignedPost.fields) {
        throw new Error("Invalid presigned post data received")
      }

      const { presignedPost, uploadToken } = data

      const formData = new FormData()
      formData.append("Content-Type", selectedFile.type)
      Object.entries(presignedPost.fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      formData.append("file", selectedFile)

      const uploadResponse = await fetch(presignedPost.uploadUrl, {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Failed to upload file to S3: ${errorText}`)
      }

      onProcessingStart()

      const resultUrl = await pollForResult(uploadToken, selectedFile.name, selectedFile.type)

      const mediaType = selectedFile.type.startsWith("image/") ? "image" : "video"

      onUploadComplete(resultUrl, mediaType)

      setSelectedFile(null)
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      onUploadStart() 
    }
  }

  const pollForResult = async (uploadToken: string, fileName: string, fileType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 60 // 2 minutes of polling at 2-second intervals

      const checkResult = async () => {
        try {
          if (attempts >= maxAttempts) {
            reject(new Error("Processing timed out after 2 minutes"))
            return
          }

          attempts++
          const response = await fetch(`/api/poll-ascii-art`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uploadToken: uploadToken,
              fileName: fileName,
              fileType: fileType,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.warn(`Error checking processing status (attempt ${attempts}): ${errorText}`)
            // Continue polling even on error
            setTimeout(checkResult, 2000)
            return
          }

          const data = await response.json()
          if (data.url) {
            resolve(data.url)
          } else {
            setTimeout(checkResult, 2000)
          }
        } catch (error) {
          console.warn(`Exception during polling (attempt ${attempts}):`, error)
          setTimeout(checkResult, 2000)
        }
      }

      checkResult()
    })
  }

  const removeFile = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleBrowseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (inputRef.current) {
      inputRef.current.click()
    }
  }

  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Input ref={inputRef} type="file" className="hidden" onChange={handleChange} accept=".jpg,.jpeg,.png,.mp4" />

      <div
        className={`relative border border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 ${
          dragActive
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
            : "border-border/50 hover:border-primary/40 dark:hover:border-primary/30 hover:bg-muted/30"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!selectedFile ? handleBrowseClick : undefined}
      >
        {!selectedFile ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowUpCircle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium mb-2">Drop your media here</p>
            <p className="text-sm text-muted-foreground mb-4">PNG, JPG, JPEG, MP4 (Max 16MB)</p>
            <Button
              variant="outline"
              className="rounded-full px-6 border-primary/30 hover:bg-primary/10 hover:text-primary"
              onClick={handleBrowseClick}
            >
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="w-full">
            <div className="absolute top-3 right-3 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="rounded-full h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="h-5 w-5 text-primary" />
              ) : (
                <Video className="h-5 w-5 text-primary" />
              )}
              <span className="text-sm font-medium truncate">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>

            {previewUrl && (
              <div className="mt-4 flex justify-center">
                {selectedFile.type.startsWith("image/") ? (
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Preview"
                    className="max-h-[300px] max-w-full object-contain rounded-md"
                  />
                ) : selectedFile.type === "video/mp4" ? (
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    controls
                    className="max-h-[300px] max-w-full object-contain rounded-md"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onPlay={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile}
            className="rounded-full px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all"
          >
            <FileUp className="mr-2 h-5 w-5" />
            Process Media
          </Button>
        </div>
      )}
    </div>
  )
}
