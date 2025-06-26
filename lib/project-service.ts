import sampleProjects from "@/data/sample-projects.json"
import samplePages from "@/data/sample-pages.json"
import type { Project, Page, CreateProjectData, UpdateProjectData, LinkedPageGroup } from "@/types/project"

// Simulate database delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// In-memory storage for new data during the session
const sessionProjects: Project[] = [...sampleProjects]
const sessionPages: Page[] = [...samplePages]

export class ProjectService {
  // Project operations
  async createProject(data: CreateProjectData): Promise<Project> {
    await delay(300)

    const project: Project = {
      id: `project_${Date.now()}`,
      ...data,
      pages: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    }

    // Initialize empty arrays for root language and translation languages
    project.pages[data.rootLanguage] = []
    data.translationLanguages.forEach((lang) => {
      project.pages[lang] = []
    })

    sessionProjects.unshift(project)
    return project
  }

  async getProjects(): Promise<Project[]> {
    await delay(200)
    return [...sessionProjects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async getProject(id: string): Promise<Project | null> {
    await delay(150)
    return sessionProjects.find((p) => p.id === id) || null
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project | null> {
    await delay(250)

    const index = sessionProjects.findIndex((p) => p.id === id)
    if (index === -1) return null

    const updatedProject = {
      ...sessionProjects[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }

    sessionProjects[index] = updatedProject
    return updatedProject
  }

  async deleteProject(id: string): Promise<boolean> {
    await delay(200)

    const index = sessionProjects.findIndex((p) => p.id === id)
    if (index === -1) return false

    sessionProjects.splice(index, 1)
    return true
  }

  async addPageToProject(projectId: string, pageId: string, language: string): Promise<boolean> {
    await delay(150)

    const project = sessionProjects.find((p) => p.id === projectId)
    if (!project) return false

    if (!project.pages[language]) {
      project.pages[language] = []
    }

    if (!project.pages[language].includes(pageId)) {
      project.pages[language].push(pageId)
      project.updatedAt = new Date().toISOString()
    }

    return true
  }

  async removePageFromProject(projectId: string, pageId: string, language: string): Promise<boolean> {
    await delay(150)

    const project = sessionProjects.find((p) => p.id === projectId)
    if (!project || !project.pages[language]) return false

    const index = project.pages[language].indexOf(pageId)
    if (index !== -1) {
      project.pages[language].splice(index, 1)
      project.updatedAt = new Date().toISOString()
    }

    return true
  }

  getAllProjectLanguages(project: Project): string[] {
    return [project.rootLanguage, ...project.translationLanguages]
  }

  // Page operations
  async createPage(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page> {
    await delay(300)

    const page: Page = {
      id: `page_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    sessionPages.unshift(page)
    return page
  }

  async updatePage(id: string, data: Partial<Page>): Promise<Page | null> {
    await delay(200)

    const index = sessionPages.findIndex((p) => p.id === id)
    if (index === -1) return null

    const updatedPage = {
      ...sessionPages[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }

    sessionPages[index] = updatedPage
    return updatedPage
  }

  async linkTranslationPage(rootPageId: string, translationPageId: string): Promise<boolean> {
    await delay(200)

    const rootPage = sessionPages.find((p) => p.id === rootPageId)
    const translationPage = sessionPages.find((p) => p.id === translationPageId)

    if (!rootPage || !translationPage) return false

    // Update root page to include translation
    if (!rootPage.translationPages) {
      rootPage.translationPages = []
    }
    if (!rootPage.translationPages.includes(translationPageId)) {
      rootPage.translationPages.push(translationPageId)
    }

    // Update translation page to link to root
    translationPage.rootPageId = rootPageId

    return true
  }

  async unlinkTranslationPage(rootPageId: string, translationPageId: string): Promise<boolean> {
    await delay(200)

    const rootPage = sessionPages.find((p) => p.id === rootPageId)
    const translationPage = sessionPages.find((p) => p.id === translationPageId)

    if (!rootPage || !translationPage) return false

    // Remove from root page translations
    if (rootPage.translationPages) {
      rootPage.translationPages = rootPage.translationPages.filter((id) => id !== translationPageId)
    }

    // Remove root link from translation page
    delete translationPage.rootPageId

    return true
  }

  async getPages(): Promise<Page[]> {
    await delay(200)
    return [...sessionPages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async getPagesByLanguage(language: string): Promise<Page[]> {
    await delay(200)
    return sessionPages.filter((page) => page.language === language)
  }

  async getPagesByIds(ids: string[]): Promise<Page[]> {
    await delay(200)
    return sessionPages.filter((page) => ids.includes(page.id))
  }

  async getProjectWithLinkedPages(
    projectId: string,
  ): Promise<{ project: Project; linkedPageGroups: LinkedPageGroup[] } | null> {
    await delay(300)

    const project = await this.getProject(projectId)
    if (!project) return null

    // Get all pages for the project
    const allProjectPageIds = Object.values(project.pages).flat()
    const allProjectPages = await this.getPagesByIds(allProjectPageIds)

    // Group pages by root pages
    const linkedPageGroups: LinkedPageGroup[] = []
    const rootPages = allProjectPages.filter((page) => page.language === project.rootLanguage)

    for (const rootPage of rootPages) {
      const translations: Record<string, Page> = {}

      // Find translation pages linked to this root page
      if (rootPage.translationPages) {
        for (const translationPageId of rootPage.translationPages) {
          const translationPage = allProjectPages.find((p) => p.id === translationPageId)
          if (translationPage) {
            translations[translationPage.language] = translationPage
          }
        }
      }

      linkedPageGroups.push({
        rootPage,
        translations,
      })
    }

    return { project, linkedPageGroups }
  }

  async getProjectWithPages(
    projectId: string,
  ): Promise<{ project: Project; pagesByLanguage: Record<string, Page[]> } | null> {
    await delay(300)

    const project = await this.getProject(projectId)
    if (!project) return null

    const pagesByLanguage: Record<string, Page[]> = {}

    for (const [language, pageIds] of Object.entries(project.pages)) {
      pagesByLanguage[language] = await this.getPagesByIds(pageIds)
    }

    return { project, pagesByLanguage }
  }
}

export const projectService = new ProjectService()
