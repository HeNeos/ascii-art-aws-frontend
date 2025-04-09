"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaPreviewProps {
  url: string
  type: "image" | "video"
}

export default function MediaPreview({ url, type }: MediaPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
  }, [url])

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    setLoading(false)
    setError("Failed to load media. Please try again.")
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = url.split("/").pop() || `processed-${type}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full flex flex-col items-center">
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Loading your processed media...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
        </div>
      )}

      <div className={loading ? "hidden" : "w-full"}>
        <div className="relative w-full flex justify-center bg-black/5 dark:bg-white/5 rounded-xl p-2 backdrop-blur-sm">
          {type === "image" ? (
            <img
              src={url || "/placeholder.svg"}
              alt="Processed result"
              className="max-w-full rounded-lg object-contain"
              style={{ maxHeight: "500px" }}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <video
              ref={videoRef}
              src={url}
              controls
              className="max-w-full rounded-lg object-contain"
              style={{ maxHeight: "500px" }}
              onLoadedData={handleLoad}
              onError={handleError}
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
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleDownload}
            className="rounded-full px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all"
          >
            <Download className="mr-2 h-5 w-5" />
            Download {type === "image" ? "Image" : "Video"}
          </Button>
        </div>
      </div>
    </div>
  )
}
