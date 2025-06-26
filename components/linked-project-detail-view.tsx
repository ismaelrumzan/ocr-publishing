"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Plus, FileText, Trash2, Upload, Link, Unlink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProjectOCRScanner } from "@/components/project-ocr-scanner"
import { EditableTextDisplay } from "@/components/editable-text-display"
import type { Project, LinkedPageGroup } from "@/types/project"
import { PageTitleEditor } from "@/components/page-title-editor"

interface LinkedProjectDetailViewProps {
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

export function LinkedProjectDetailView({ project, onBack }: LinkedProjectDetailViewProps) {
  const [linkedPageGroups, setLinkedPageGroups] = useState<LinkedPageGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [ocrScannerOpen, setOcrScannerOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("")
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedRootPageId, setSelectedRootPageId] = useState<string>("")
  const [availableTranslationPages, setAvailableTranslationPages] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchLinkedPageGroups()
  }, [project.id])

  const fetchLinkedPageGroups = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`)
      if (response.ok) {
        const data = await response.json()

        // Transform the data to linked page groups format
        const groups: LinkedPageGroup[] = []
        const rootPages = data.pagesByLanguage[project.rootLanguage] || []

        for (const rootPage of rootPages) {
          const translations: Record<string, any> = {}

          // Find linked translation pages
          if (rootPage.translationPages) {
            for (const translationPageId of rootPage.translationPages) {
              // Find the translation page in other languages
              for (const [lang, pages] of Object.entries(data.pagesByLanguage)) {
                if (lang !== project.rootLanguage) {
                  const translationPage = (pages as any[]).find((p) => p.id === translationPageId)
                  if (translationPage) {
                    translations[lang] = translationPage
                  }
                }
              }
            }
          }

          groups.push({
            rootPage,
            translations,
          })
        }

        setLinkedPageGroups(groups)
      }
    } catch (error) {
      console.error("Error fetching linked page groups:", error)
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

  const handlePageSaved = () => {
    fetchLinkedPageGroups()
  }

  const handleUpdatePageText = async (pageId: string, newText: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedText: newText }),
      })

      if (response.ok) {
        await fetchLinkedPageGroups()
        toast({
          title: "Success",
          description: "Page text updated successfully",
        })
      } else {
        throw new Error("Failed to update page")
      }
    } catch (error) {
      console.error("Error updating page:", error)
      toast({
        title: "Error",
        description: "Failed to update page text",
        variant: "destructive",
      })
    }
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
        await fetchLinkedPageGroups()
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

  const openLinkDialog = (rootPageId: string) => {
    setSelectedRootPageId(rootPageId)
    fetchAvailableTranslationPages()
    setLinkDialogOpen(true)
  }

  const fetchAvailableTranslationPages = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`)
      if (response.ok) {
        const data = await response.json()

        // Get all unlinked translation pages
        const unlinkedPages: any[] = []
        for (const lang of project.translationLanguages) {
          const pagesInLang = data.pagesByLanguage[lang] || []
          const unlinkedInLang = pagesInLang.filter((page: any) => !page.rootPageId)
          unlinkedPages.push(...unlinkedInLang)
        }

        setAvailableTranslationPages(unlinkedPages)
      }
    } catch (error) {
      console.error("Error fetching available translation pages:", error)
    }
  }

  const handleLinkPages = async (translationPageId: string) => {
    try {
      const response = await fetch("/api/pages/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPageId: selectedRootPageId, translationPageId }),
      })

      if (response.ok) {
        await fetchLinkedPageGroups()
        setLinkDialogOpen(false)
        toast({
          title: "Success",
          description: "Pages linked successfully",
        })
      }
    } catch (error) {
      console.error("Error linking pages:", error)
      toast({
        title: "Error",
        description: "Failed to link pages",
        variant: "destructive",
      })
    }
  }

  const handleUnlinkPages = async (rootPageId: string, translationPageId: string) => {
    try {
      const response = await fetch("/api/pages/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPageId, translationPageId }),
      })

      if (response.ok) {
        await fetchLinkedPageGroups()
        toast({
          title: "Success",
          description: "Pages unlinked successfully",
        })
      }
    } catch (error) {
      console.error("Error unlinking pages:", error)
      toast({
        title: "Error",
        description: "Failed to unlink pages",
        variant: "destructive",
      })
    }
  }

  const getLanguageInfo = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
  }

  const handleUpdatePageTitle = async (pageId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })

      if (response.ok) {
        await fetchLinkedPageGroups()
        toast({
          title: "Success",
          description: "Page title updated successfully",
        })
      } else {
        throw new Error("Failed to update page title")
      }
    } catch (error) {
      console.error("Error updating page title:", error)
      toast({
        title: "Error",
        description: "Failed to update page title",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading project details...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Project Context:</strong> Pages will be automatically added to "{project.title}" project.
        </p>
      </div>
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

      {/* Add Root Page Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Linked Page Groups</h2>
        <Button onClick={handleAddRootLanguagePage} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Root Page
        </Button>
      </div>

      {/* Linked Page Groups */}
      {linkedPageGroups.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No pages yet</h3>
          <p className="text-muted-foreground mb-4">
            Add pages in {getLanguageInfo(project.rootLanguage)?.name} to get started
          </p>
          <Button onClick={handleAddRootLanguagePage} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload & OCR Images
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {linkedPageGroups.map((group, index) => {
            const rootLangInfo = getLanguageInfo(group.rootPage.language)

            return (
              <Card key={group.rootPage.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-blue-600">
                          ROOT
                        </Badge>
                      </div>
                      <PageTitleEditor
                        title={group.rootPage.title || ""}
                        fileName={group.rootPage.fileName}
                        onSave={(newTitle) => handleUpdatePageTitle(group.rootPage.id, newTitle)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLinkDialog(group.rootPage.id)}
                        className="gap-2"
                      >
                        <Link className="w-3 h-3" />
                        Link Translation
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePage(group.rootPage.id, group.rootPage.language)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Root Page */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="default" className="bg-blue-600">
                        {rootLangInfo?.flag} {rootLangInfo?.name}
                      </Badge>
                      <Badge variant="outline">{group.rootPage.status}</Badge>
                    </div>
                    <EditableTextDisplay
                      text={group.rootPage.editedText}
                      language={group.rootPage.language}
                      direction={rootLangInfo?.direction || "ltr"}
                      onSave={(newText) => handleUpdatePageText(group.rootPage.id, newText)}
                    />
                  </div>

                  {/* Translation Pages */}
                  <div className="space-y-3">
                    {project.translationLanguages.map((langCode) => {
                      const langInfo = getLanguageInfo(langCode)
                      const translationPage = group.translations[langCode]

                      return (
                        <div key={langCode} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {langInfo?.flag} {langInfo?.name}
                              </Badge>
                              {translationPage && <Badge variant="outline">{translationPage.status}</Badge>}
                            </div>
                            {translationPage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnlinkPages(group.rootPage.id, translationPage.id)}
                                className="gap-2 text-destructive hover:text-destructive"
                              >
                                <Unlink className="w-3 h-3" />
                                Unlink
                              </Button>
                            )}
                          </div>

                          {translationPage ? (
                            <EditableTextDisplay
                              text={translationPage.editedText}
                              language={translationPage.language}
                              direction={langInfo?.direction || "ltr"}
                              onSave={(newText) => handleUpdatePageText(translationPage.id, newText)}
                            />
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">
                              <p>No {langInfo?.name} translation linked</p>
                              <p className="text-sm">Use "Link Translation" to connect a page</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* OCR Scanner Dialog */}
      <ProjectOCRScanner
        project={project}
        language={selectedLanguage}
        isOpen={ocrScannerOpen}
        onClose={() => setOcrScannerOpen(false)}
        onPageSaved={handlePageSaved}
      />

      {/* Link Translation Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Translation Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a translation page to link with the root page.</p>

            {availableTranslationPages.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No unlinked translation pages available</p>
                <p className="text-sm text-muted-foreground">Create translation pages first to link them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTranslationPages.map((page) => {
                  const langInfo = getLanguageInfo(page.language)
                  return (
                    <div key={page.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {langInfo?.flag} {langInfo?.name}
                          </Badge>
                          <span className="font-medium">{page.fileName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {page.editedText.substring(0, 100)}...
                        </p>
                      </div>
                      <Button onClick={() => handleLinkPages(page.id)} size="sm" className="gap-2">
                        <Link className="w-3 h-3" />
                        Link
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
