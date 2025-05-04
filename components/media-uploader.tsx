"use client"

import type React from "react"

import { v4 as uuidv4 } from "uuid"
import { useState, useRef, useEffect } from "react"
import { FileUp, X, ImageIcon, Video, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const imageResolutions = ['240p', '480p', '720p', '1080p', '1440p', '2160p', '2880p'];
const videoResolutions = ['240p', '480p', '720p', '1080p'];
const ditheringOptions = ['atkinson', 'floyd-steinberg', 'jarvis-judice-ninke', 'riemersma', 'riemersma-naive']
const imageOutputOptions = ['color', 'gray-scale', 'black-and-white']

interface MediaUploaderProps {
  onUploadStart: () => void
  onProcessingStart: () => void
  onUploadComplete: (url: string, type: "image" | "video") => void
}

const getVideoMetadata = (file: File): Promise<{ duration: number, width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    
    video.addEventListener('loadedmetadata', () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      })
      URL.revokeObjectURL(url)
    })

    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video metadata'))
    })

    video.src = url
  })
}

export default function MediaUploader({ onUploadStart, onProcessingStart, onUploadComplete }: MediaUploaderProps) {
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [selectedDithering, setSelectedDithering] = useState('atkinson');
  const [edgeDetection, setEdgeDetection] = useState<boolean>(false);
  const [selectedResolution, setSelectedResolution] = useState('240');
  const [selectedOutput, setSelectedOutput] = useState('color');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setSelectedResolution('720p');
      } else {
        setSelectedResolution('480p');
      }
    }
  }, [selectedFile]);

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreviewUrl(objectUrl)

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

  const validateFile = async (file: File): Promise<boolean> => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4"]
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Please upload a PNG, JPG, JPEG, or MP4 file.")
    }

    if (file.size > 32 * 1024 * 1024) {
      throw new Error("File is too large. Maximum size is 32MB.")
    }

    if (file.type.startsWith('video/')) {
      try {
        const metadata = await getVideoMetadata(file)
        
        // Check duration (2min)
        if (metadata.duration > 120) {
          throw new Error("Video exceeds maximum allowed duration of 120s")
        }

        // Check resolution (1080p = 1920x1080)
        if (metadata.height > 1080 || metadata.width > 1920) {
          throw new Error("Video resolution exceeds maximum allowed 1080p")
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Invalid video file")
      }
    }

    return true
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      try {
        setIsAnalyzing(true)
        await validateFile(file)
        setSelectedFile(file)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid file")
        setSelectedFile(null)
      } finally {
        setIsAnalyzing(false)
      }
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      try {
        setIsAnalyzing(true)
        await validateFile(file)
        setSelectedFile(file)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid file")
        setSelectedFile(null)
      } finally {
        setIsAnalyzing(false)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setError(null)
      onUploadStart()
      const uuid = uuidv4()
      const dithering = selectedDithering.replace(/-/g, "_")
      const resolution = selectedResolution.replace(/p/g, "")
      const output = selectedOutput.replace(/-/g, "_").toUpperCase()
      const edges = edgeDetection;
      const response = await fetch(
        `https://${process.env.NEXT_PUBLIC_API_GENERATE_URL}/generate-upload-url?uploadToken=${uuid}&dithering=${dithering}&resolution=${resolution}&output=${output}&edge_detection=${edges}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            contentType: selectedFile.type,
            dithering: dithering,
            resolution: resolution,
            output: output,
            edge_detection: edges,
          })
      })
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to get presigned URL: ${errorData}`)
      }

      const json = await response.json()

      if (!json.uploadUrl || !json.jobId) {
        throw new Error("Invalid presigned post data received")
      }
      
      const presignedPost = {
        uploadUrl: json.uploadUrl,
        fields:    json.fields,
      }
      const uploadToken = json.jobId

      const formData = new FormData()
      formData.append("Content-Type", selectedFile.type)
      Object.entries(presignedPost.fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      formData.append("file", selectedFile)
      formData.append("x-amz-meta-dithering", selectedDithering);
      formData.append("x-amz-meta-resolution", selectedResolution);
      formData.append("x-amz-meta-output", selectedOutput);
      formData.append("x-amz-meta-edge-detection", String(edges));

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

  const pollForResult = async (uploadToken: string, fileName: string, contentType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const isVideo = contentType.startsWith("video/");
      let retryInterval = isVideo ? 7000 : 1400;
      const maxAttempts = isVideo ? 90 : 40;

      const checkResult = async () => {
        try {
          if (attempts >= maxAttempts) {
            reject(new Error("Processing timed out"))
            return
          }
          attempts++

          const queryParams = new URLSearchParams({
            uploadToken,
            fileName,
            contentType
          }).toString()
          const response = await fetch(`https://${process.env.NEXT_PUBLIC_API_POLL_URL}/poll-ascii-art?uploadToken=${encodeURIComponent(uploadToken)}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" }
          })
          if (!response.ok) {
            const errorText = await response.text()
            console.warn(`Error checking processing status (attempt ${attempts}): ${errorText}`)
            // Continue polling even on error
            setTimeout(checkResult, retryInterval)
            retryInterval -= (isVideo ? 800 : 200);
            retryInterval = Math.max(retryInterval, isVideo ? 1500 : 800);
            return
          }

          const data = await response.json()
          if (data.url) {
            resolve(data.url)
          } else {
            setTimeout(checkResult, retryInterval)
          }
        } catch (error) {
          console.warn(`Exception during polling (attempt ${attempts}):`, error)
          setTimeout(checkResult, retryInterval)
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
        } ${isAnalyzing ? "opacity-50 cursor-wait" : ""}`}
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
            <p className="text-sm text-muted-foreground mb-4">PNG, JPG, JPEG, MP4 (Max 32MB)</p>
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
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Dithering Strategy</label>
                <Select 
                  value={selectedDithering} 
                  onValueChange={setSelectedDithering}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select dithering" />
                  </SelectTrigger>
                  <SelectContent>
                    {ditheringOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Output Resolution</label>
                <Select
                  value={selectedResolution}
                  onValueChange={setSelectedResolution}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedFile.type.startsWith('image/') 
                      ? imageResolutions 
                      : videoResolutions
                    ).map((res) => (
                      <SelectItem key={res} value={res}>
                        {res}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            {selectedFile.type.startsWith("image") && <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Output</label>
                <Select 
                  value={selectedOutput} 
                  onValueChange={setSelectedOutput}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select output" />
                  </SelectTrigger>
                  <SelectContent>
                    {imageOutputOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>}
            <div className="space-y-2">
              <Label
                htmlFor="edge-detection"
                className="text-sm font-medium text-foreground/80 block mb-1"
              >
                Edge Detection
              </Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edge-detection"
                  type="checkbox"
                  checked={edgeDetection}
                  onCheckedChange={setEdgeDetection}
                  aria-label="Toggle edge detection"
                />
                <span className="text-sm text-muted-foreground">
                  {edgeDetection ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            </div>
            <Button
              onClick={handleUpload}
              className="rounded-full px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all w-full"
            >
              <FileUp className="mr-2 h-5 w-5" />
              Process Media
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
