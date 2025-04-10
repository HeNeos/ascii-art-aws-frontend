"use client"

import { useState } from "react"
import { Check, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MediaUploader from "@/components/media-uploader"
import MediaPreview from "@/components/media-preview"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("upload")
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)

  const handleUploadComplete = (url: string, type: "image" | "video") => {
    setResultUrl(url)
    setMediaType(type)
    setIsProcessing(false)
    setActiveTab("result")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-12 bg-gradient-to-br from-background to-background/80 transition-colors duration-300">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          Ascii Art
        </h1>
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-4xl shadow-xl border-border/50 backdrop-blur-sm bg-background/80 overflow-hidden">
        <CardHeader className="space-y-1 pb-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-medium">
                {activeTab === "upload" ? "Upload Media" : "Processing Result"}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {activeTab === "upload"
                  ? "Upload images or videos to process"
                  : "View and download your processed media"}
              </CardDescription>
            </div>
            {resultUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 hover:bg-primary/10"
                onClick={() => setActiveTab(activeTab === "upload" ? "result" : "upload")}
              >
                {activeTab === "upload" ? (
                  <>
                    View Result <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Upload New <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="result">Result</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="p-6 m-0">
              <MediaUploader
                onUploadStart={() => setIsUploading(true)}
                onProcessingStart={() => {
                  setIsUploading(false)
                  setIsProcessing(true)
                }}
                onUploadComplete={handleUploadComplete}
              />
            </TabsContent>

            <TabsContent value="result" className="p-6 m-0">
              {resultUrl && mediaType && <MediaPreview url={resultUrl} type={mediaType} />}
            </TabsContent>
          </Tabs>
        </CardContent>

        {(isUploading || isProcessing || (resultUrl && activeTab === "upload")) && (
          <div className="px-6 py-4 border-t border-border/30 bg-muted/30">
            {isUploading && (
              <div className="flex items-center text-amber-600 dark:text-amber-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm">Uploading your media...</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center text-primary">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
            {!isUploading && !isProcessing && resultUrl && activeTab === "upload" && (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <Check className="mr-2 h-4 w-4" />
                <span className="text-sm">Processing complete. View your result.</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </main>
  )
}
