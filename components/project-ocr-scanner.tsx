"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Check, Edit3, Trash2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Tesseract from "tesseract.js"
import { Label } from "@/components/ui/label"
import { TextDisplay } from "@/components/text-display"
import type { Project } from "@/types/project"
import { PageTitleEditor } from "@/components/page-title-editor"

interface ProcessedPage {
  id: string
  file: File
  imageUrl: string
  ocrText: string
  editedText: string
  title: string
  status: "processing" | "completed" | "approved"
  progress: number
}

interface ProjectOCRScannerProps {
  project?: Project | null
  language: string
  isOpen: boolean
  onClose: () => void
  onPageSaved: (pageId: string) => void
}

const SUPPORTED_LANGUAGES = [
  { code: "ara", name: "Arabic (العربية)", direction: "rtl" as const },
  { code: "eng", name: "English", direction: "ltr" as const },
  { code: "fra", name: "French (Français)", direction: "ltr" as const },
  { code: "spa", name: "Spanish (Español)", direction: "ltr" as const },
  { code: "deu", name: "German (Deutsch)", direction: "ltr" as const },
]

export function ProjectOCRScanner({ project, language, isOpen, onClose, onPageSaved }: ProjectOCRScannerProps) {
  const [pages, setPages] = useState<ProcessedPage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const selectedLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.code === language) || SUPPORTED_LANGUAGES[1]

  // ────────────────────────────────────────────────
  // Prevent runtime errors if the parent renders the
  // scanner before the project object is available.
  // ────────────────────────────────────────────────
  if (!project) {
    // Render nothing (or a tiny placeholder) until the
    // project prop is actually supplied by the caller.
    return null
  }

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      const newPages: ProcessedPage[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        imageUrl: URL.createObjectURL(file),
        ocrText: "",
        editedText: "",
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension for initial title
        status: "processing" as const,
        progress: 0,
      }))

      setPages((prev) => [...prev, ...newPages])
      setIsProcessing(true)

      // Process each image with OCR
      for (const page of newPages) {
        try {
          const result = await Tesseract.recognize(page.file, selectedLanguage.code, {
            logger: (m) => {
              if (m.status === "recognizing text") {
                setPages((prev) =>
                  prev.map((p) => (p.id === page.id ? { ...p, progress: Math.round(m.progress * 100) } : p)),
                )
              }
            },
          })

          setPages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    ocrText: result.data.text,
                    editedText: result.data.text,
                    status: "completed" as const,
                    progress: 100,
                  }
                : p,
            ),
          )
        } catch (error) {
          console.error("OCR Error:", error)
          toast({
            title: "OCR Error",
            description: `Failed to process ${page.file.name}`,
            variant: "destructive",
          })
        }
      }

      setIsProcessing(false)
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${newPages.length} page(s)`,
      })
    },
    [toast, selectedLanguage.code],
  )

  const updateText = (pageId: string, newText: string) => {
    setPages((prev) => prev.map((page) => (page.id === pageId ? { ...page, editedText: newText } : page)))
  }

  const updateTitle = (pageId: string, newTitle: string) => {
    setPages((prev) => prev.map((page) => (page.id === pageId ? { ...page, title: newTitle } : page)))
  }

  const approvePage = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId)
    if (page) {
      try {
        // Create FormData to send both page data and image file
        const formData = new FormData()
        formData.append("fileName", page.file.name)
        formData.append("title", page.title)
        formData.append("originalText", page.ocrText)
        formData.append("editedText", page.editedText)
        formData.append("language", selectedLanguage.code)
        formData.append("status", "approved")
        formData.append("imageFile", page.file)
        formData.append("projectId", project.id)

        // Save page to database with image
        const response = await fetch("/api/pages", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const dbPage = await response.json()
          setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, status: "approved" as const } : p)))
          onPageSaved(dbPage.id)
          toast({
            title: "Page Saved",
            description: `Page and image saved to ${project.title}`,
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to save page")
        }
      } catch (error) {
        console.error("Error saving page:", error)
        toast({
          title: "Error",
          description: "Failed to save page and image",
          variant: "destructive",
        })
      }
    }
  }

  const deletePage = (pageId: string) => {
    setPages((prev) => {
      const pageToDelete = prev.find((p) => p.id === pageId)
      if (pageToDelete) {
        URL.revokeObjectURL(pageToDelete.imageUrl)
      }
      return prev.filter((p) => p.id !== pageId)
    })
  }

  const getStatusBadge = (status: ProcessedPage["status"]) => {
    switch (status) {
      case "processing":
        return <Badge variant="secondary">Processing</Badge>
      case "completed":
        return <Badge variant="outline">Ready for Review</Badge>
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            Saved to Project
          </Badge>
        )
    }
  }

  const handleClose = () => {
    // Clean up any remaining object URLs
    pages.forEach((page) => {
      if (page.imageUrl) {
        URL.revokeObjectURL(page.imageUrl)
      }
    })
    setPages([])
    onClose()
  }

  // Check if we have any processed pages to show the full-width layout
  const hasProcessedPages = pages.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`${hasProcessedPages ? "max-w-[95vw] w-[95vw]" : "max-w-2xl"} max-h-[95vh] overflow-y-auto`}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Add {selectedLanguage.name} Pages to "{project.title}"
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Context Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Project Context:</strong> Pages will be automatically added to "{project.title}" project in{" "}
              {selectedLanguage.name}.
            </p>
          </div>

          {/* Upload Section - Only show if no pages or still processing */}
          {(!hasProcessedPages || isProcessing) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload & Process Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Language</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-600">
                        {selectedLanguage.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">OCR will process images in this language</span>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="project-file-upload"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="project-file-upload"
                      className={`cursor-pointer ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        {isProcessing ? "Processing..." : "Click to upload images"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Upload {selectedLanguage.name} images for OCR processing
                      </p>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {pages.some((page) => page.status === "approved") && (
            <div className="flex gap-4">
              <Button onClick={() => setPages([])} variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload More Images
              </Button>
            </div>
          )}

          {/* Full-Width Pages Display */}
          <div className="space-y-6">
            {pages.map((page) => (
              <div key={page.id} className="space-y-4">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <PageTitleEditor
                      title={page.title}
                      fileName={page.file.name}
                      onSave={(newTitle) => updateTitle(page.id, newTitle)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(page.status)}
                    {page.status === "completed" && (
                      <Button onClick={() => approvePage(page.id)} className="gap-2">
                        <Check className="w-4 h-4" />
                        Save to Project
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePage(page.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Processing Progress */}
                {page.status === "processing" && (
                  <div className="space-y-2">
                    <Progress value={page.progress} className="w-full" />
                    <p className="text-sm text-muted-foreground">Processing... {page.progress}%</p>
                  </div>
                )}

                {/* Full-Width Comparison Layout */}
                {(page.status === "completed" || page.status === "approved") && (
                  <div className="grid grid-cols-2 gap-6 min-h-[70vh]">
                    {/* Image Panel - Left Side */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Original Scan</h4>
                        <Badge variant="outline" className="text-xs">
                          {selectedLanguage.name}
                        </Badge>
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-muted h-full flex items-center justify-center">
                        <img
                          src={page.imageUrl || "/placeholder.svg"}
                          alt={`Scan of ${page.file.name}`}
                          className="max-w-full max-h-full object-contain"
                          style={{ maxHeight: "calc(70vh - 2rem)" }}
                        />
                      </div>
                    </div>

                    {/* Text Panel - Right Side */}
                    <div className="space-y-3 flex flex-col">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        <h4 className="font-medium">Extracted Text</h4>
                        {page.status === "approved" && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Saved to Project
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1">
                        <TextDisplay
                          text={page.editedText}
                          language={selectedLanguage.code}
                          direction={selectedLanguage.direction}
                          editable={page.status !== "approved"}
                          onChange={(newText) => updateText(page.id, newText)}
                          className="h-full"
                          style={{ minHeight: "calc(70vh - 4rem)" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pages.length === 0 && (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No images uploaded yet</h3>
              <p className="text-muted-foreground">
                Upload {selectedLanguage.name} images to add pages to this project
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
