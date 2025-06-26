export interface Page {
  id: string
  fileName: string
  title?: string // Add optional title field
  originalText: string
  editedText: string
  language: string
  ocrConfidence?: number
  status: "processing" | "completed" | "approved"
  createdAt: string
  updatedAt: string
  rootPageId?: string // For translation pages, links to the root page
  translationPages?: string[] // For root pages, array of translation page IDs
}

export interface Project {
  id: string
  title: string
  description?: string
  rootLanguage: string // The source language
  translationLanguages: string[] // Target languages for translation
  pages: Record<string, string[]> // language -> page IDs
  createdAt: string
  updatedAt: string
  status: "active" | "completed" | "archived"
}

export interface CreateProjectData {
  title: string
  description?: string
  rootLanguage: string
  translationLanguages: string[]
}

export interface UpdateProjectData {
  title?: string
  description?: string
  rootLanguage?: string
  translationLanguages?: string[]
  pages?: Record<string, string[]>
  status?: "active" | "completed" | "archived"
}

export interface LinkedPageGroup {
  rootPage: Page
  translations: Record<string, Page> // language -> translation page
}
