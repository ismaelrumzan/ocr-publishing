"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, FileText, Trash2, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProjectOCRScanner } from "@/components/project-ocr-scanner"
import { TextDisplay } from "@/components/text-display"
import type { Project, Page } from "@/types/project"

interface ProjectDetailViewProps {
  project: Project
  onBack: () => void
}

const SUPPORTED_LANGUAGES = [
  { code: "ara", name: "Arabic (العربية)", direction: "rtl" as const, flag: "🇸🇦" },
  { code: "eng", name: "English", direction: "ltr" as const, flag: "🇺🇸" },
  { code: "fra", name: "French (Français)", direction: "ltr" as const, flag: "🇫🇷" },
  { code: "spa", name: "Spanish (Español)", direction: "ltr" as const, flag: "🇪🇸" },
  { code: "deu", name: "German (Deutsch)", direction: "ltr" as const, flag: "🇩🇪" },
]

export function ProjectDetailView({ project, onBack }: ProjectDetailViewProps) {
  const [pagesByLanguage, setPagesByLanguage] = useState<Record<string, Page[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [ocrScannerOpen, setOcrScannerOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    fetchProjectPages()
  }, [project.id])

  const fetchProjectPages = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`)
      if (response.ok) {
        const data = await response.json()
        setPagesByLanguage(data.pagesByLanguage)
      }
    } catch (error) {
      console.error("Error fetching project pages:", error)
      toast({
        title: "Error",
        description: "Failed to fetch project pages",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRootLanguagePage = () => {
    setSelectedLanguage(project.rootLanguage)
    setOcrScannerOpen(true)
  }

  const handlePageSaved = (pageId: string) => {
    fetchProjectPages()
  }

  const handleRemovePage = async (pageId: string, language: string) => {
    if (!confirm("Are you sure you want to remove this page from the project?")) return

    try {
      const response = await fetch(`/api/projects/${project.id}/pages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, language }),
      })

      if (response.ok) {
        await fetchProjectPages()
        toast({
          title: "Success",
          description: "Page removed from project",
        })
      }
    } catch (error) {
      console.error("Error removing page:", error)
      toast({
        title: "Error",
        description: "Failed to remove page",
        variant: "destructive",
      })
    }
  }

  const getLanguageInfo = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading project details...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.description && <p className="text-muted-foreground">{project.description}</p>}
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Root Language:</span>
                <Badge variant="default" className="bg-blue-600">
                  {getLanguageInfo(project.rootLanguage)?.flag} {getLanguageInfo(project.rootLanguage)?.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Translation Languages:</span>
                <div className="flex gap-1">
                  {project.translationLanguages.map((langCode) => {
                    const langInfo = getLanguageInfo(langCode)
                    return (
                      <Badge key={langCode} variant="outline" className="text-xs">
                        {langInfo?.flag} {langInfo?.name || langCode}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm">{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root Language Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default" className="bg-blue-600">
                ROOT
              </Badge>
              {getLanguageInfo(project.rootLanguage)?.flag} {getLanguageInfo(project.rootLanguage)?.name} Pages
            </CardTitle>
            <Button onClick={handleAddRootLanguagePage} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pagesByLanguage[project.rootLanguage]?.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No root language pages yet</h3>
              <p className="text-muted-foreground mb-4">
                Add pages in {getLanguageInfo(project.rootLanguage)?.name} to get started
              </p>
              <Button onClick={handleAddRootLanguagePage} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload & OCR Images
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {pagesByLanguage[project.rootLanguage]?.map((page) => {
                const langInfo = getLanguageInfo(page.language)
                return (
                  <Card key={page.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{page.fileName}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{page.status}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePage(page.id, page.language)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <TextDisplay
                        text={page.editedText}
                        language={page.language}
                        direction={langInfo?.direction || "ltr"}
                        className="min-h-32"
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Translation Languages Sections */}
      {project.translationLanguages.map((langCode) => {
        const langInfo = getLanguageInfo(langCode)
        const pagesForLang = pagesByLanguage[langCode] || []

        return (
          <Card key={langCode}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">TRANSLATION</Badge>
                {langInfo?.flag} {langInfo?.name} Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pagesForLang.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No {langInfo?.name} translations yet. Add translated content here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pagesForLang.map((page) => (
                    <Card key={page.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{page.fileName}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {page.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePage(page.id, page.language)}
                              className="text-destructive hover:text-destructive h-6 w-6"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <TextDisplay
                          text={page.editedText}
                          language={page.language}
                          direction={langInfo?.direction || "ltr"}
                          className="min-h-24 text-sm"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* OCR Scanner Dialog */}
      <ProjectOCRScanner
        project={project}
        language={selectedLanguage}
        isOpen={ocrScannerOpen}
        onClose={() => setOcrScannerOpen(false)}
        onPageSaved={handlePageSaved}
      />
    </div>
  )
}
