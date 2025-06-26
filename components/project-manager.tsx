"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, FolderOpen, Edit, Trash2, FileText, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Project, Page } from "@/types/project"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LinkedProjectDetailView } from "@/components/linked-project-detail-view"

interface ProjectManagerProps {
  onProjectSelect?: (project: Project) => void
}

const SUPPORTED_LANGUAGES = [
  { code: "ara", name: "Arabic (العربية)", flag: "🇸🇦" },
  { code: "eng", name: "English", flag: "🇺🇸" },
  { code: "fra", name: "French (Français)", flag: "🇫🇷" },
  { code: "spa", name: "Spanish (Español)", flag: "🇪🇸" },
  { code: "deu", name: "German (Deutsch)", flag: "🇩🇪" },
]

export function ProjectManager({ onProjectSelect }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [allPages, setAllPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isManagePagesDialogOpen, setIsManagePagesDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [managingProject, setManagingProject] = useState<Project | null>(null)
  const [projectPages, setProjectPages] = useState<Record<string, Page[]>>({})
  const { toast } = useToast()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rootLanguage: "",
    translationLanguages: [] as string[],
  })

  useEffect(() => {
    fetchProjects()
    fetchAllPages()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllPages = async () => {
    try {
      const response = await fetch("/api/pages")
      if (response.ok) {
        const data = await response.json()
        setAllPages(data)
      }
    } catch (error) {
      console.error("Error fetching pages:", error)
    }
  }

  const fetchProjectPages = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProjectPages(data.pagesByLanguage)
        setManagingProject(data.project)
      }
    } catch (error) {
      console.error("Error fetching project pages:", error)
    }
  }

  const handleCreateProject = async () => {
    if (!formData.title || !formData.rootLanguage || formData.translationLanguages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Title, root language, and at least one translation language are required",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newProject = await response.json()
        setProjects((prev) => [newProject, ...prev])
        setIsCreateDialogOpen(false)
        resetForm()
        toast({
          title: "Success",
          description: "Project created successfully",
        })
      } else {
        throw new Error("Failed to create project")
      }
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    }
  }

  const handleEditProject = async () => {
    if (!editingProject || !formData.title || formData.translationLanguages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Title and at least one translation language are required",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
        setIsEditDialogOpen(false)
        setEditingProject(null)
        resetForm()
        toast({
          title: "Success",
          description: "Project updated successfully",
        })
      } else {
        throw new Error("Failed to update project")
      }
    } catch (error) {
      console.error("Error updating project:", error)
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId))
        toast({
          title: "Success",
          description: "Project deleted successfully",
        })
      } else {
        throw new Error("Failed to delete project")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    }
  }

  const handleAddPageToProject = async (pageId: string, language: string) => {
    if (!managingProject) return

    try {
      const response = await fetch(`/api/projects/${managingProject.id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, language }),
      })

      if (response.ok) {
        await fetchProjectPages(managingProject.id)
        toast({
          title: "Success",
          description: "Page added to project",
        })
      }
    } catch (error) {
      console.error("Error adding page to project:", error)
      toast({
        title: "Error",
        description: "Failed to add page to project",
        variant: "destructive",
      })
    }
  }

  const handleRemovePageFromProject = async (pageId: string, language: string) => {
    if (!managingProject) return

    try {
      const response = await fetch(`/api/projects/${managingProject.id}/pages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, language }),
      })

      if (response.ok) {
        await fetchProjectPages(managingProject.id)
        toast({
          title: "Success",
          description: "Page removed from project",
        })
      }
    } catch (error) {
      console.error("Error removing page from project:", error)
      toast({
        title: "Error",
        description: "Failed to remove page from project",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    setFormData({
      title: project.title,
      description: project.description || "",
      rootLanguage: project.rootLanguage,
      translationLanguages: project.translationLanguages,
    })
    setIsEditDialogOpen(true)
  }

  const openManagePagesDialog = (project: Project) => {
    setIsManagePagesDialogOpen(true)
    fetchProjectPages(project.id)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      rootLanguage: "",
      translationLanguages: [],
    })
  }

  const getLanguageInfo = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
  }

  const getTotalPageCount = (project: Project) => {
    return Object.values(project.pages).reduce((total, pageIds) => total + pageIds.length, 0)
  }

  const handleTranslationLanguageToggle = (languageCode: string) => {
    setFormData((prev) => ({
      ...prev,
      translationLanguages: prev.translationLanguages.includes(languageCode)
        ? prev.translationLanguages.filter((l) => l !== languageCode)
        : [...prev.translationLanguages, languageCode],
    }))
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading projects...</div>
  }

  if (selectedProject) {
    return <LinkedProjectDetailView project={selectedProject} onBack={() => setSelectedProject(null)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Manager</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter project title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              {/* Root Language Selection */}
              <div className="space-y-2">
                <Label>Root Language (Source)</Label>
                <Select
                  value={formData.rootLanguage}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, rootLanguage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select root language" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <div className="flex items-center gap-2">
                          <span>{language.flag}</span>
                          <span>{language.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Translation Languages */}
              <div className="space-y-2">
                <Label>Translation Languages (Targets)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.filter((lang) => lang.code !== formData.rootLanguage).map((language) => (
                    <div key={language.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={language.code}
                        checked={formData.translationLanguages.includes(language.code)}
                        onCheckedChange={() => handleTranslationLanguageToggle(language.code)}
                      />
                      <Label htmlFor={language.code} className="flex items-center gap-2">
                        <span>{language.flag}</span>
                        <span>{language.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to organize your OCR pages by language.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openManagePagesDialog(project)}>
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(project)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
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

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {/* Root Language */}
                    <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                      <span className="flex items-center gap-1">
                        <Badge variant="default" className="text-xs bg-blue-600">
                          ROOT
                        </Badge>
                        {getLanguageInfo(project.rootLanguage)?.flag} {getLanguageInfo(project.rootLanguage)?.name}
                      </span>
                      <Badge variant="secondary">{project.pages[project.rootLanguage]?.length || 0} pages</Badge>
                    </div>

                    {/* Translation Languages */}
                    {project.translationLanguages.map((langCode) => {
                      const langInfo = getLanguageInfo(langCode)
                      const pageCount = project.pages[langCode]?.length || 0
                      return (
                        <div key={langCode} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              TRANS
                            </Badge>
                            {langInfo?.flag} {langInfo?.name}
                          </span>
                          <Badge variant="secondary">{pageCount} pages</Badge>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{getTotalPageCount(project)} total pages</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {onProjectSelect && (
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleProjectSelect(project)}
                        className="flex-1 gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Open Project
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openManagePagesDialog(project)}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Project Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter project title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Translation Languages (targets)</Label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LANGUAGES.filter((lang) => lang.code !== formData.rootLanguage).map((language) => (
                  <div key={language.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${language.code}`}
                      checked={formData.translationLanguages.includes(language.code)}
                      onCheckedChange={() => handleTranslationLanguageToggle(language.code)}
                    />
                    <Label htmlFor={`edit-${language.code}`} className="flex items-center gap-2">
                      <span>{language.flag}</span>
                      <span>{language.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingProject(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditProject}>Update Project</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Pages Dialog */}
      <Dialog open={isManagePagesDialogOpen} onOpenChange={setIsManagePagesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Manage Pages: {managingProject?.title}
            </DialogTitle>
          </DialogHeader>
          {managingProject && (
            <div className="space-y-6">
              {[managingProject.rootLanguage, ...managingProject.translationLanguages].map((language) => {
                const langInfo = getLanguageInfo(language)
                const projectPagesForLang = projectPages[language] || []
                const availablePagesForLang = allPages.filter(
                  (page) => page.language === language && !projectPagesForLang.some((pp) => pp.id === page.id),
                )

                return (
                  <div key={language} className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      {langInfo?.flag} {langInfo?.name} Pages
                    </h3>

                    {/* Current Pages */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Current Pages ({projectPagesForLang.length})
                      </h4>
                      {projectPagesForLang.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pages added yet</p>
                      ) : (
                        <div className="grid gap-2">
                          {projectPagesForLang.map((page) => (
                            <div key={page.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{page.fileName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePageFromProject(page.id, language)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Available Pages */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Available Pages ({availablePagesForLang.length})
                      </h4>
                      {availablePagesForLang.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No available pages for this language</p>
                      ) : (
                        <div className="grid gap-2 max-h-40 overflow-y-auto">
                          {availablePagesForLang.map((page) => (
                            <div key={page.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{page.fileName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddPageToProject(page.id, language)}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
