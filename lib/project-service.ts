/**
 * Project service
 */

import { put, del } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"
import type {
  Project,
  PageGroup,
  Page, // ← legacy page shape
  CreateProjectData,
  UpdateProjectData,
  LinkedPageGroup,
} from "@/types/project"

// utils
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const slug = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

// Cache for frequently accessed data
const projectCache = new Map<string, Project>()
const pageGroupCache = new Map<string, PageGroup>()

let isInitialized = false

// Initialize Neon SQL client
const sql = neon(process.env.DATABASE_URL!)

export class ProjectService {
  // Initialize the service
  async initialize(): Promise<void> {
    if (isInitialized) {
      console.log("Project service already initialized")
      return
    }

    try {
      console.log("Initializing project service with Neon database...")

      // Test database connection
      const result = await sql`SELECT NOW() as current_time`
      console.log("Database connection successful:", result[0].current_time)

      isInitialized = true
      console.log("✅ Project service initialized successfully")
    } catch (error) {
      console.error("Failed to initialize project service:", error)
      // Mark as initialized anyway to prevent infinite retry loops
      isInitialized = true
    }
  }

  // Project operations
  async createProject(data: CreateProjectData): Promise<Project> {
    await delay(100)

    // Derive a safe, unique file name if none provided
    const fileName =
      data.fileName && data.fileName.trim().length > 0 ? slug(data.fileName) : `${slug(data.title)}-${Date.now()}`

    const project: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      fileName, // ✅ guaranteed non-null
      pageGroups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    }

    try {
      await sql`
        INSERT INTO projects (
          id, title, description, file_name, root_language, 
          translation_languages, created_at, updated_at, status
        ) VALUES (
          ${project.id}, ${project.title}, ${project.description || ""}, 
          ${project.fileName}, ${project.rootLanguage}, 
          ${project.translationLanguages}, ${project.createdAt}, 
          ${project.updatedAt}, ${project.status}
        )
      `

      projectCache.set(project.id, project)
      console.log("Project saved to database:", project.id)
    } catch (error) {
      console.error("Failed to save project to database:", error)
      throw error
    }

    return project
  }

  async getProjects(): Promise<Project[]> {
    // Ensure we're initialized before returning projects
    if (!isInitialized) {
      console.log("Service not initialized, initializing now...")
      await this.initialize()
    }

    await delay(100)

    try {
      const rows = await sql`
        SELECT 
          p.*,
          COALESCE(
            array_agg(ppg.page_group_id) FILTER (WHERE ppg.page_group_id IS NOT NULL), 
            ARRAY[]::varchar[]
          ) as page_groups
        FROM projects p
        LEFT JOIN project_page_groups ppg ON p.id = ppg.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `

      const projects: Project[] = rows.map((row: any) => {
        const project: Project = {
          id: row.id,
          title: row.title,
          description: row.description,
          fileName: row.file_name,
          rootLanguage: row.root_language,
          translationLanguages: row.translation_languages,
          pageGroups: row.page_groups || [],
          createdAt: row.created_at.toISOString?.() ?? row.created_at,
          updatedAt: row.updated_at.toISOString?.() ?? row.updated_at,
          status: row.status,
        }
        return project
      })

      // Update cache
      projects.forEach((project) => projectCache.set(project.id, project))

      console.log(`Returning ${projects.length} projects from database`)
      return projects
    } catch (error) {
      console.error("Failed to load projects from database:", error)
      // Fallback to cache only
      const cacheProjects = Array.from(projectCache.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      console.log(`Returning ${cacheProjects.length} projects from cache`)
      return cacheProjects
    }
  }

  async getProject(id: string): Promise<Project | null> {
    // Ensure we're initialized before loading project
    if (!isInitialized) {
      await this.initialize()
    }

    await delay(50)

    try {
      // Check cache first
      if (projectCache.has(id)) {
        console.log(`Project ${id} loaded from cache`)
        return projectCache.get(id)!
      }

      const rows = await sql`
        SELECT 
          p.*,
          COALESCE(
            array_agg(ppg.page_group_id) FILTER (WHERE ppg.page_group_id IS NOT NULL), 
            ARRAY[]::varchar[]
          ) as page_groups
        FROM projects p
        LEFT JOIN project_page_groups ppg ON p.id = ppg.project_id
        WHERE p.id = ${id}
        GROUP BY p.id
      `

      if (rows.length === 0) {
        console.log(`Project ${id} not found in database`)
        return null
      }

      const row = rows[0]
      const project: Project = {
        id: row.id,
        title: row.title,
        description: row.description,
        fileName: row.file_name,
        rootLanguage: row.root_language,
        translationLanguages: row.translation_languages,
        pageGroups: row.page_groups || [],
        createdAt: row.created_at.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at.toISOString?.() ?? row.updated_at,
        status: row.status,
      }

      // Cache the project
      projectCache.set(id, project)
      console.log(`Project ${id} loaded from database:`, project.name)
      return project
    } catch (error) {
      console.error(`Failed to load project ${id} from database:`, error)
      return null
    }
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project | null> {
    await delay(100)

    try {
      const updatedAt = new Date().toISOString()

      await sql`
        UPDATE projects 
        SET 
          title = COALESCE(${data.title}, title),
          description = COALESCE(${data.description}, description),
          status = COALESCE(${data.status}, status),
          updated_at = ${updatedAt}
        WHERE id = ${id}
      `

      // Clear cache and reload
      projectCache.delete(id)
      return await this.getProject(id)
    } catch (error) {
      console.error(`Failed to update project ${id}:`, error)
      return null
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    await delay(100)

    try {
      // Get project to delete associated page groups and images
      const project = await this.getProject(id)
      if (project) {
        // Delete all page groups and their images
        for (const pageGroupId of project.pageGroups) {
          await this.deletePageGroup(pageGroupId)
        }
      }

      // Delete project (cascade will handle project_page_groups)
      await sql`DELETE FROM projects WHERE id = ${id}`

      // Remove from cache
      projectCache.delete(id)
      console.log(`Project ${id} deleted successfully`)
      return true
    } catch (error) {
      console.error(`Failed to delete project ${id}:`, error)
      return false
    }
  }

  // Page Group operations
  async createPageGroup(
    data: Omit<PageGroup, "id" | "createdAt" | "updatedAt"> & { imageFile?: File },
  ): Promise<PageGroup> {
    await delay(100)

    let imageUrl: string | undefined
    let imageBlobId: string | undefined

    // If an image file is provided, upload it to blob storage
    if (data.imageFile) {
      try {
        const blob = await put(
          `images/${data.fileName}-${Date.now()}.${data.imageFile.name.split(".").pop()}`,
          data.imageFile,
          {
            access: "public",
          },
        )
        imageUrl = blob.url
        imageBlobId = blob.pathname.split("/").pop() // Extract ID from pathname
      } catch (error) {
        console.error("Failed to upload image to blob storage:", error)
        // Continue without image if upload fails
      }
    }

    const pageGroup: PageGroup = {
      id: `pagegroup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      imageUrl,
      imageBlobId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Remove imageFile from the page group object as it's not part of the PageGroup type
    delete (pageGroup as any).imageFile

    try {
      await sql`
        INSERT INTO page_groups (
          id, title, file_name, root_language, root_text, 
          translations, image_url, image_blob_id, created_at, updated_at, status
        ) VALUES (
          ${pageGroup.id}, ${pageGroup.title}, ${pageGroup.fileName}, 
          ${pageGroup.rootLanguage}, ${pageGroup.rootText}, 
          ${JSON.stringify(pageGroup.translations)}, ${pageGroup.imageUrl}, 
          ${pageGroup.imageBlobId}, ${pageGroup.createdAt}, 
          ${pageGroup.updatedAt}, ${pageGroup.status}
        )
      `

      // Cache the page group
      pageGroupCache.set(pageGroup.id, pageGroup)
      console.log("Page group saved to database:", pageGroup.id)
    } catch (error) {
      console.error("Failed to save page group to database:", error)
      throw error
    }

    return pageGroup
  }

  /**
   * Legacy helper so /api/pages (and older UI code) keeps working.
   * We simply create a brand-new PageGroup whose root language equals
   * the requested page language and return a Page-shaped object.
   */
  async createPage(data: Omit<Page, "id" | "createdAt" | "updatedAt"> & { imageFile?: File }): Promise<Page> {
    const pg = await this.createPageGroup({
      title: data.title ?? data.fileName ?? "Untitled",
      fileName: data.fileName ?? slug(data.title ?? "untitled"),
      rootLanguage: data.language,
      rootText: data.editedText,
      translations: {}, // none yet
      status: data.status ?? "approved",
      imageFile: data.imageFile,
    })

    return {
      id: pg.id,
      fileName: pg.fileName,
      title: pg.title,
      originalText: pg.rootText,
      editedText: pg.rootText,
      language: pg.rootLanguage,
      status: pg.status,
      imageUrl: pg.imageUrl,
      createdAt: pg.createdAt,
      updatedAt: pg.updatedAt,
    } as Page
  }

  async updatePageGroup(id: string, data: Partial<PageGroup>): Promise<PageGroup | null> {
    await delay(100)

    try {
      const updatedAt = new Date().toISOString()

      await sql`
        UPDATE page_groups 
        SET 
          title = COALESCE(${data.title}, title),
          root_text = COALESCE(${data.rootText}, root_text),
          translations = COALESCE(${data.translations ? JSON.stringify(data.translations) : null}, translations),
          status = COALESCE(${data.status}, status),
          updated_at = ${updatedAt}
        WHERE id = ${id}
      `

      // Clear cache and reload
      pageGroupCache.delete(id)
      return await this.loadPageGroupFromBlob(id) // Reuse the method name for consistency
    } catch (error) {
      console.error(`Failed to update page group ${id}:`, error)
      return null
    }
  }

  async deletePageGroup(id: string): Promise<boolean> {
    await delay(100)

    try {
      // Get page group to delete associated image
      const pageGroup = await this.loadPageGroupFromBlob(id)
      if (pageGroup?.imageBlobId) {
        try {
          await del(`images/${pageGroup.imageBlobId}`)
          console.log(`Deleted image for page group ${id}`)
        } catch (error) {
          console.error(`Failed to delete image for page group ${id}:`, error)
        }
      }

      // Delete page group (cascade will handle project_page_groups)
      await sql`DELETE FROM page_groups WHERE id = ${id}`

      // Remove from cache
      pageGroupCache.delete(id)
      console.log(`Page group ${id} deleted successfully`)
      return true
    } catch (error) {
      console.error(`Failed to delete page group ${id}:`, error)
      return false
    }
  }

  async loadPageGroupFromBlob(id: string): Promise<PageGroup | null> {
    try {
      // Check cache first
      if (pageGroupCache.has(id)) {
        return pageGroupCache.get(id)!
      }

      const rows = await sql`
        SELECT * FROM page_groups WHERE id = ${id}
      `

      if (rows.length === 0) {
        return null
      }

      const row = rows[0]
      const pageGroup: PageGroup = {
        id: row.id,
        title: row.title,
        fileName: row.file_name,
        rootLanguage: row.root_language,
        rootText: row.root_text,
        translations: row.translations || {},
        imageUrl: row.image_url,
        imageBlobId: row.image_blob_id,
        status: row.status,
      }

      // Cache the page group
      pageGroupCache.set(id, pageGroup)
      console.log(`Page group ${id} loaded from database:`, pageGroup.fileName)
      return pageGroup
    } catch (error) {
      console.error(`Failed to load page group ${id} from database:`, error)
      return null
    }
  }

  async addPageGroupToProject(projectId: string, pageGroupId: string): Promise<boolean> {
    await delay(50)

    try {
      await sql`
        INSERT INTO project_page_groups (project_id, page_group_id)
        VALUES (${projectId}, ${pageGroupId})
        ON CONFLICT (project_id, page_group_id) DO NOTHING
      `

      // Update project's updated_at timestamp
      await sql`
        UPDATE projects 
        SET updated_at = ${new Date().toISOString()}
        WHERE id = ${projectId}
      `

      // Clear caches
      projectCache.delete(projectId)

      console.log(`Added page group ${pageGroupId} to project ${projectId}`)
      return true
    } catch (error) {
      console.error(`Failed to add page group ${pageGroupId} to project ${projectId}:`, error)
      return false
    }
  }

  async removePageGroupFromProject(projectId: string, pageGroupId: string): Promise<boolean> {
    await delay(50)

    try {
      await sql`
        DELETE FROM project_page_groups 
        WHERE project_id = ${projectId} AND page_group_id = ${pageGroupId}
      `

      // Update project's updated_at timestamp
      await sql`
        UPDATE projects 
        SET updated_at = ${new Date().toISOString()}
        WHERE id = ${projectId}
      `

      // Clear caches
      projectCache.delete(projectId)

      console.log(`Removed page group ${pageGroupId} from project ${projectId}`)
      return true
    } catch (error) {
      console.error(`Failed to remove page group ${pageGroupId} from project ${projectId}:`, error)
      return false
    }
  }

  /* -----------------------------------------------------------------
   * Legacy wrappers ― keep old API routes working
   * -----------------------------------------------------------------*/

  /**
   * @deprecated  Use addPageGroupToProject.  Kept for older /api/projects/[id]/pages route.
   */
  async addPageToProject(projectId: string, pageId: string, _language: string): Promise<boolean> {
    // pageId === pageGroupId in the new model
    return this.addPageGroupToProject(projectId, pageId)
  }

  /**
   * @deprecated  Use removePageGroupFromProject.  Kept for older /api/projects/[id]/pages route.
   */
  async removePageFromProject(projectId: string, pageId: string, _language: string): Promise<boolean> {
    return this.removePageGroupFromProject(projectId, pageId)
  }

  async addTranslationToPageGroup(
    pageGroupId: string,
    language: string,
    translationText: string,
  ): Promise<PageGroup | null> {
    const pageGroup = await this.loadPageGroupFromBlob(pageGroupId)
    if (!pageGroup) return null

    pageGroup.translations[language] = translationText
    return await this.updatePageGroup(pageGroupId, { translations: pageGroup.translations })
  }

  async updatePageGroupRootText(pageGroupId: string, rootText: string): Promise<PageGroup | null> {
    return await this.updatePageGroup(pageGroupId, { rootText })
  }

  async getProjectWithLinkedPages(
    projectId: string,
  ): Promise<{ project: Project; linkedPageGroups: LinkedPageGroup[] } | null> {
    await delay(100)

    const project = await this.getProject(projectId)
    if (!project) return null

    // Get all page groups for the project
    const linkedPageGroups: LinkedPageGroup[] = []

    for (const pageGroupId of project.pageGroups) {
      const pageGroup = await this.loadPageGroupFromBlob(pageGroupId)
      if (pageGroup) {
        // Convert PageGroup to LinkedPageGroup format for compatibility
        const rootPage = {
          id: pageGroup.id,
          title: pageGroup.title,
          fileName: pageGroup.fileName,
          language: pageGroup.rootLanguage,
          editedText: pageGroup.rootText,
          status: pageGroup.status,
        }

        const translations: Record<string, any> = {}
        for (const [lang, text] of Object.entries(pageGroup.translations)) {
          translations[lang] = {
            id: `${pageGroup.id}_${lang}`,
            editedText: text,
            language: lang,
            status: pageGroup.status,
          }
        }

        linkedPageGroups.push({
          rootPage,
          translations,
        })
      }
    }

    return { project, linkedPageGroups }
  }

  /**
   * Back-compat helper — returns the old `{ project, pagesByLanguage }`
   * shape expected by `/api/projects/[id]`.
   */
  async getProjectWithPages(
    projectId: string,
  ): Promise<{ project: Project; pagesByLanguage: Record<string, any[]> } | null> {
    await delay(100)

    const project = await this.getProject(projectId)
    if (!project) return null

    // Build pagesByLanguage from pageGroups
    const pagesByLanguage: Record<string, any[]> = {}

    for (const pgId of project.pageGroups) {
      const pg = await this.loadPageGroupFromBlob(pgId)
      if (!pg) continue

      // root
      if (!pagesByLanguage[pg.rootLanguage]) pagesByLanguage[pg.rootLanguage] = []
      pagesByLanguage[pg.rootLanguage].push({
        id: pg.id,
        title: pg.title,
        fileName: pg.fileName,
        language: pg.rootLanguage,
        editedText: pg.rootText,
        status: pg.status,
        translationPages: Object.keys(pg.translations).map((l) => `${pg.id}_${l}`),
      })

      // translations
      for (const [lang, text] of Object.entries(pg.translations)) {
        if (!pagesByLanguage[lang]) pagesByLanguage[lang] = []
        pagesByLanguage[lang].push({
          id: `${pg.id}_${lang}`,
          title: `${pg.title} (${lang})`,
          fileName: `${pg.fileName}_${lang}`,
          language: lang,
          editedText: text,
          status: pg.status,
          rootPageId: pg.id,
        })
      }
    }

    return { project, pagesByLanguage }
  }

  // Legacy compatibility methods
  async getPages(): Promise<any[]> {
    try {
      const rows = await sql`
        SELECT * FROM page_groups ORDER BY created_at DESC
      `

      const pages: any[] = []

      for (const row of rows) {
        const pageGroup = {
          id: row.id,
          title: row.title,
          fileName: row.file_name,
          rootLanguage: row.root_language,
          rootText: row.root_text,
          translations: row.translations || {},
          imageUrl: row.image_url,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }

        // Add root page
        pages.push({
          id: pageGroup.id,
          title: pageGroup.title,
          fileName: pageGroup.fileName,
          originalText: pageGroup.rootText,
          editedText: pageGroup.rootText,
          language: pageGroup.rootLanguage,
          status: pageGroup.status,
          imageUrl: pageGroup.imageUrl,
          createdAt: pageGroup.createdAt,
          updatedAt: pageGroup.updatedAt,
        })

        // Add translation pages
        for (const [lang, text] of Object.entries(pageGroup.translations)) {
          pages.push({
            id: `${pageGroup.id}_${lang}`,
            title: `${pageGroup.title} (${lang})`,
            fileName: `${pageGroup.fileName}_${lang}`,
            originalText: text,
            editedText: text,
            language: lang,
            status: pageGroup.status,
            rootPageId: pageGroup.id,
            createdAt: pageGroup.createdAt,
            updatedAt: pageGroup.updatedAt,
          })
        }
      }

      return pages
    } catch (error) {
      console.error("Failed to load pages from database:", error)
      return []
    }
  }

  // Utility methods for data management
  async initializeFromSampleData(): Promise<void> {
    try {
      // Check if we already have data in database
      const existingProjects = await sql`SELECT COUNT(*) as count FROM projects`
      if (existingProjects[0].count > 0) {
        console.log("Database already contains data, skipping initialization")
        return
      }

      console.log("Initializing with sample data...")

      // Create a sample project
      const sampleProject = await this.createProject({
        title: "Sample OCR Project",
        description: "A sample project for testing OCR and translation features",
        fileName: "sample-project",
        rootLanguage: "eng",
        translationLanguages: ["ara", "fra", "spa"],
      })

      // Create a sample page group
      const samplePageGroup = await this.createPageGroup({
        title: "Sample Document",
        fileName: "sample-document",
        rootLanguage: "eng",
        rootText:
          "This is a sample document for testing OCR and translation features. It contains some text that can be translated into multiple languages.",
        translations: {
          ara: "هذه وثيقة عينة لاختبار ميزات التعرف الضوئي على الحروف والترجمة. تحتوي على بعض النصوص التي يمكن ترجمتها إلى لغات متعددة.",
          fra: "Ceci est un document d'exemple pour tester les fonctionnalités OCR et de traduction. Il contient du texte qui peut être traduit en plusieurs langues.",
          spa: "Este es un documento de muestra para probar las funciones de OCR y traducción. Contiene texto que se puede traducir a varios idiomas.",
        },
        status: "approved",
      })

      // Add page group to project
      await this.addPageGroupToProject(sampleProject.id, samplePageGroup.id)

      console.log("Sample data initialized successfully")
    } catch (error) {
      console.error("Failed to initialize sample data:", error)
    }
  }

  async clearAllData(): Promise<void> {
    try {
      // Delete all data (cascade will handle relationships)
      await sql`DELETE FROM projects`
      await sql`DELETE FROM page_groups`

      // Clear caches
      projectCache.clear()
      pageGroupCache.clear()

      // Reset initialization flag
      isInitialized = false

      console.log("All data cleared from database")
    } catch (error) {
      console.error("Failed to clear data:", error)
    }
  }
}

export const projectService = new ProjectService()

// Initialize on server startup
if (typeof window === "undefined") {
  projectService.initialize().catch(console.error)
}
