/**
 * Project service - Full Neon database implementation
 */

import { put, del } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import type {
  Project,
  PageGroup,
  Page,
  CreateProjectData,
  UpdateProjectData,
  LinkedPageGroup,
} from "@/types/project";

// Utils
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const slug = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Cache for frequently accessed data
const projectCache = new Map<string, Project>();
const pageGroupCache = new Map<string, PageGroup>();

let isInitialized = false;

// Initialize Neon SQL client
const sql = neon(process.env.DATABASE_URL!);

export class ProjectService {
  // Initialize the service and create tables
  async initialize(): Promise<void> {
    if (isInitialized) {
      console.log("Project service already initialized");
      return;
    }

    try {
      console.log("Initializing project service with Neon database...");

      // Create tables if they don't exist
      await this.createTables();

      // Test database connection
      const result = await sql`SELECT NOW() as current_time`;
      console.log("Database connection successful:", result[0].current_time);

      isInitialized = true;
      console.log("✅ Project service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize project service:", error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    try {
      // Create projects table
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          file_name VARCHAR(255) NOT NULL,
          root_language VARCHAR(10) NOT NULL,
          translation_languages TEXT[] NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active'
        )
      `;

      // Create page_groups table
      await sql`
        CREATE TABLE IF NOT EXISTS page_groups (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          root_language VARCHAR(10) NOT NULL,
          root_text TEXT NOT NULL,
          translations JSONB NOT NULL DEFAULT '{}',
          image_url TEXT,
          image_blob_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'draft'
        )
      `;

      // Create project_page_groups junction table
      await sql`
        CREATE TABLE IF NOT EXISTS project_page_groups (
          project_id VARCHAR(255) NOT NULL,
          page_group_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          PRIMARY KEY (project_id, page_group_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (page_group_id) REFERENCES page_groups(id) ON DELETE CASCADE
        )
      `;

      console.log("Database tables created/verified successfully");
    } catch (error) {
      console.error("Failed to create database tables:", error);
      throw error;
    }
  }

  // Project operations
  async createProject(data: CreateProjectData): Promise<Project> {
    await this.initialize();
    await delay(100);

    const fileName =
      data.fileName && data.fileName.trim().length > 0
        ? slug(data.fileName)
        : `${slug(data.title)}-${Date.now()}`;

    const project: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      description: data.description || "",
      fileName,
      rootLanguage: data.rootLanguage,
      translationLanguages: data.translationLanguages,
      pageGroups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    };

    try {
      await sql`
        INSERT INTO projects (
          id, title, description, file_name, root_language, 
          translation_languages, created_at, updated_at, status
        ) VALUES (
          ${project.id}, ${project.title}, ${project.description}, 
          ${project.fileName}, ${project.rootLanguage}, 
          ${project.translationLanguages}, ${project.createdAt}, 
          ${project.updatedAt}, ${project.status}
        )
      `;

      projectCache.set(project.id, project);
      console.log("Project saved to database:", project.id);
      return project;
    } catch (error) {
      console.error("Failed to save project to database:", error);
      throw error;
    }
  }

  async getProjects(): Promise<Project[]> {
    await this.initialize();
    await delay(100);

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
      `;

      const projects: Project[] = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        fileName: row.file_name,
        rootLanguage: row.root_language,
        translationLanguages: row.translation_languages || [],
        pageGroups: row.page_groups || [],
        createdAt: row.created_at.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at.toISOString?.() ?? row.updated_at,
        status: row.status,
      }));

      // Update cache
      projects.forEach((project) => projectCache.set(project.id, project));

      console.log(`Returning ${projects.length} projects from database`);
      return projects;
    } catch (error) {
      console.error("Failed to load projects from database:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<Project | null> {
    await this.initialize();
    await delay(50);

    try {
      // Check cache first
      if (projectCache.has(id)) {
        console.log(`Project ${id} loaded from cache`);
        return projectCache.get(id)!;
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
      `;

      if (rows.length === 0) {
        console.log(`Project ${id} not found in database`);
        return null;
      }

      const row = rows[0];
      const project: Project = {
        id: row.id,
        title: row.title,
        description: row.description || "",
        fileName: row.file_name,
        rootLanguage: row.root_language,
        translationLanguages: row.translation_languages || [],
        pageGroups: row.page_groups || [],
        createdAt: row.created_at.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at.toISOString?.() ?? row.updated_at,
        status: row.status,
      };

      // Cache the project
      projectCache.set(id, project);
      console.log(`Project ${id} loaded from database`);
      return project;
    } catch (error) {
      console.error(`Failed to load project ${id} from database:`, error);
      return null;
    }
  }

  async updateProject(
    id: string,
    data: UpdateProjectData
  ): Promise<Project | null> {
    await this.initialize();
    await delay(100);

    try {
      const updatedAt = new Date().toISOString();

      await sql`
        UPDATE projects 
        SET 
          title = COALESCE(${data.title}, title),
          description = COALESCE(${data.description}, description),
          status = COALESCE(${data.status}, status),
          updated_at = ${updatedAt}
        WHERE id = ${id}
      `;

      // Clear cache and reload
      projectCache.delete(id);
      return await this.getProject(id);
    } catch (error) {
      console.error(`Failed to update project ${id}:`, error);
      return null;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.initialize();
    await delay(100);

    try {
      // Get project to delete associated page groups and images
      const project = await this.getProject(id);
      if (project) {
        // Delete all page groups and their images
        for (const pageGroupId of project.pageGroups) {
          await this.deletePageGroup(pageGroupId);
        }
      }

      // Delete project (cascade will handle project_page_groups)
      await sql`DELETE FROM projects WHERE id = ${id}`;

      // Remove from cache
      projectCache.delete(id);
      console.log(`Project ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to delete project ${id}:`, error);
      return false;
    }
  }

  // Page Group operations
  async createPageGroup(
    data: Omit<PageGroup, "id" | "createdAt" | "updatedAt"> & {
      imageFile?: File;
    }
  ): Promise<PageGroup> {
    await this.initialize();
    await delay(100);

    let imageUrl: string | undefined;
    let imageBlobId: string | undefined;

    // If an image file is provided, upload it to blob storage
    if (data.imageFile) {
      try {
        const blob = await put(
          `images/${data.fileName}-${Date.now()}.${data.imageFile.name
            .split(".")
            .pop()}`,
          data.imageFile,
          {
            access: "public",
          }
        );
        imageUrl = blob.url;
        imageBlobId = blob.pathname.split("/").pop();
      } catch (error) {
        console.error("Failed to upload image to blob storage:", error);
        // Continue without image if upload fails
      }
    }

    const pageGroup: PageGroup = {
      id: `pagegroup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      fileName: data.fileName,
      rootLanguage: data.rootLanguage,
      rootText: data.rootText,
      translations: data.translations || {},
      imageUrl,
      imageBlobId,
      status: data.status || "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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
      `;

      // Cache the page group
      pageGroupCache.set(pageGroup.id, pageGroup);
      console.log("Page group saved to database:", pageGroup.id);
      return pageGroup;
    } catch (error) {
      console.error("Failed to save page group to database:", error);
      throw error;
    }
  }

  async createPage(
    data: Omit<Page, "id" | "createdAt" | "updatedAt"> & { imageFile?: File }
  ): Promise<Page> {
    const pg = await this.createPageGroup({
      title: data.title ?? data.fileName ?? "Untitled",
      fileName: data.fileName ?? slug(data.title ?? "untitled"),
      rootLanguage: data.language,
      rootText: data.editedText,
      translations: {},
      status: data.status ?? "approved",
      imageFile: data.imageFile,
    });

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
    } as Page;
  }

  async updatePageGroup(
    id: string,
    data: Partial<PageGroup>
  ): Promise<PageGroup | null> {
    await this.initialize();
    await delay(100);

    try {
      const updatedAt = new Date().toISOString();

      await sql`
        UPDATE page_groups 
        SET 
          title = COALESCE(${data.title}, title),
          root_text = COALESCE(${data.rootText}, root_text),
          translations = COALESCE(${
            data.translations ? JSON.stringify(data.translations) : null
          }, translations),
          status = COALESCE(${data.status}, status),
          updated_at = ${updatedAt}
        WHERE id = ${id}
      `;

      // Clear cache and reload
      pageGroupCache.delete(id);
      return await this.loadPageGroupFromBlob(id);
    } catch (error) {
      console.error(`Failed to update page group ${id}:`, error);
      return null;
    }
  }

  async deletePageGroup(id: string): Promise<boolean> {
    await this.initialize();
    await delay(100);

    try {
      // Get page group to delete associated image
      const pageGroup = await this.loadPageGroupFromBlob(id);
      if (pageGroup?.imageBlobId) {
        try {
          await del(`images/${pageGroup.imageBlobId}`);
          console.log(`Deleted image for page group ${id}`);
        } catch (error) {
          console.error(`Failed to delete image for page group ${id}:`, error);
        }
      }

      // Delete page group (cascade will handle project_page_groups)
      await sql`DELETE FROM page_groups WHERE id = ${id}`;

      // Remove from cache
      pageGroupCache.delete(id);
      console.log(`Page group ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to delete page group ${id}:`, error);
      return false;
    }
  }

  async loadPageGroupFromBlob(id: string): Promise<PageGroup | null> {
    await this.initialize();

    try {
      // Check cache first
      if (pageGroupCache.has(id)) {
        return pageGroupCache.get(id)!;
      }

      const rows = await sql`
        SELECT * FROM page_groups WHERE id = ${id}
      `;

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
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
        createdAt: row.created_at.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at.toISOString?.() ?? row.updated_at,
      };

      // Cache the page group
      pageGroupCache.set(id, pageGroup);
      console.log(`Page group ${id} loaded from database`);
      return pageGroup;
    } catch (error) {
      console.error(`Failed to load page group ${id} from database:`, error);
      return null;
    }
  }

  async addPageGroupToProject(
    projectId: string,
    pageGroupId: string
  ): Promise<boolean> {
    await this.initialize();
    await delay(50);

    try {
      await sql`
        INSERT INTO project_page_groups (project_id, page_group_id)
        VALUES (${projectId}, ${pageGroupId})
        ON CONFLICT (project_id, page_group_id) DO NOTHING
      `;

      // Update project's updated_at timestamp
      await sql`
        UPDATE projects 
        SET updated_at = ${new Date().toISOString()}
        WHERE id = ${projectId}
      `;

      // Clear caches
      projectCache.delete(projectId);

      console.log(`Added page group ${pageGroupId} to project ${projectId}`);
      return true;
    } catch (error) {
      console.error(
        `Failed to add page group ${pageGroupId} to project ${projectId}:`,
        error
      );
      return false;
    }
  }

  async removePageGroupFromProject(
    projectId: string,
    pageGroupId: string
  ): Promise<boolean> {
    await this.initialize();
    await delay(50);

    try {
      await sql`
        DELETE FROM project_page_groups 
        WHERE project_id = ${projectId} AND page_group_id = ${pageGroupId}
      `;

      // Update project's updated_at timestamp
      await sql`
        UPDATE projects 
        SET updated_at = ${new Date().toISOString()}
        WHERE id = ${projectId}
      `;

      // Clear caches
      projectCache.delete(projectId);

      console.log(
        `Removed page group ${pageGroupId} from project ${projectId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to remove page group ${pageGroupId} from project ${projectId}:`,
        error
      );
      return false;
    }
  }

  // Legacy wrappers
  async addPageToProject(
    projectId: string,
    pageId: string,
    _language: string
  ): Promise<boolean> {
    return this.addPageGroupToProject(projectId, pageId);
  }

  async removePageFromProject(
    projectId: string,
    pageId: string,
    _language: string
  ): Promise<boolean> {
    return this.removePageGroupFromProject(projectId, pageId);
  }

  async addTranslationToPageGroup(
    pageGroupId: string,
    language: string,
    translationText: string
  ): Promise<PageGroup | null> {
    console.log("=== addTranslationToPageGroup ===");
    console.log("Page group ID:", pageGroupId);
    console.log("Language:", language);
    console.log("Translation text length:", translationText.length);

    const pageGroup = await this.loadPageGroupFromBlob(pageGroupId);
    console.log("Page group found:", !!pageGroup);

    if (!pageGroup) return null;

    console.log("Current translations:", Object.keys(pageGroup.translations));
    pageGroup.translations[language] = translationText;
    console.log("Updated translations:", Object.keys(pageGroup.translations));

    const result = await this.updatePageGroup(pageGroupId, {
      translations: pageGroup.translations,
    });

    console.log("Update result:", result ? "success" : "failed");
    return result;
  }

  async updatePageGroupRootText(
    pageGroupId: string,
    rootText: string
  ): Promise<PageGroup | null> {
    return await this.updatePageGroup(pageGroupId, { rootText });
  }

  async getProjectWithLinkedPages(
    projectId: string
  ): Promise<{ project: Project; linkedPageGroups: LinkedPageGroup[] } | null> {
    const project = await this.getProject(projectId);
    if (!project) return null;

    const linkedPageGroups: LinkedPageGroup[] = [];

    for (const pageGroupId of project.pageGroups) {
      const pageGroup = await this.loadPageGroupFromBlob(pageGroupId);
      if (pageGroup) {
        const rootPage = {
          id: pageGroup.id,
          title: pageGroup.title,
          fileName: pageGroup.fileName,
          language: pageGroup.rootLanguage,
          editedText: pageGroup.rootText,
          status: pageGroup.status,
        };

        const translations: Record<string, any> = {};
        for (const [lang, text] of Object.entries(pageGroup.translations)) {
          translations[lang] = {
            id: `${pageGroup.id}_${lang}`,
            editedText: text,
            language: lang,
            status: pageGroup.status,
          };
        }

        linkedPageGroups.push({
          rootPage,
          translations,
        });
      }
    }

    return { project, linkedPageGroups };
  }

  async getProjectWithPages(projectId: string): Promise<{
    project: Project;
    pagesByLanguage: Record<string, any[]>;
  } | null> {
    await delay(100);

    const project = await this.getProject(projectId);
    if (!project) return null;

    const pagesByLanguage: Record<string, any[]> = {};

    for (const pgId of project.pageGroups) {
      const pg = await this.loadPageGroupFromBlob(pgId);
      if (!pg) continue;

      // root
      if (!pagesByLanguage[pg.rootLanguage])
        pagesByLanguage[pg.rootLanguage] = [];
      pagesByLanguage[pg.rootLanguage].push({
        id: pg.id,
        title: pg.title,
        fileName: pg.fileName,
        language: pg.rootLanguage,
        editedText: pg.rootText,
        status: pg.status,
        translationPages: Object.keys(pg.translations).map(
          (l) => `${pg.id}_${l}`
        ),
      });

      // translations
      for (const [lang, text] of Object.entries(pg.translations)) {
        if (!pagesByLanguage[lang]) pagesByLanguage[lang] = [];
        pagesByLanguage[lang].push({
          id: `${pg.id}_${lang}`,
          title: `${pg.title} (${lang})`,
          fileName: `${pg.fileName}_${lang}`,
          language: lang,
          editedText: text,
          status: pg.status,
          rootPageId: pg.id,
        });
      }
    }

    return { project, pagesByLanguage };
  }

  async getPages(): Promise<any[]> {
    await this.initialize();

    try {
      const rows = await sql`
        SELECT * FROM page_groups ORDER BY created_at DESC
      `;

      const pages: any[] = [];

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
        };

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
        });

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
          });
        }
      }

      return pages;
    } catch (error) {
      console.error("Failed to load pages from database:", error);
      return [];
    }
  }

  async getPagesByLanguage(language: string): Promise<any[]> {
    const allPages = await this.getPages();
    return allPages.filter((page) => page.language === language);
  }

  async loadPageFromBlob(id: string): Promise<Page | null> {
    // Check if this is a translation page ID (contains underscore)
    if (id.includes("_")) {
      const [pageGroupId, language] = id.split("_");
      const pageGroup = await this.loadPageGroupFromBlob(pageGroupId);

      if (!pageGroup || !pageGroup.translations[language]) {
        return null;
      }

      return {
        id,
        fileName: `${pageGroup.fileName}_${language}`,
        title: `${pageGroup.title} (${language})`,
        originalText: pageGroup.translations[language],
        editedText: pageGroup.translations[language],
        language,
        status: pageGroup.status,
        rootPageId: pageGroup.id,
        createdAt: pageGroup.createdAt,
        updatedAt: pageGroup.updatedAt,
      };
    }

    // Regular page group
    const pageGroup = await this.loadPageGroupFromBlob(id);
    if (!pageGroup) return null;

    return {
      id: pageGroup.id,
      fileName: pageGroup.fileName,
      title: pageGroup.title,
      originalText: pageGroup.rootText,
      editedText: pageGroup.rootText,
      language: pageGroup.rootLanguage,
      status: pageGroup.status,
      imageUrl: pageGroup.imageUrl,
      createdAt: pageGroup.createdAt,
      updatedAt: pageGroup.updatedAt,
    };
  }

  async updatePage(id: string, data: Partial<Page>): Promise<Page | null> {
    // Check if this is a translation page ID
    if (id.includes("_")) {
      const [pageGroupId, language] = id.split("_");
      const pageGroup = await this.loadPageGroupFromBlob(pageGroupId);

      if (!pageGroup) return null;

      if (data.editedText) {
        pageGroup.translations[language] = data.editedText;
        await this.updatePageGroup(pageGroupId, {
          translations: pageGroup.translations,
        });
      }

      return this.loadPageFromBlob(id);
    }

    // Regular page group
    const updateData: Partial<PageGroup> = {};
    if (data.title) updateData.title = data.title;
    if (data.editedText) updateData.rootText = data.editedText;
    if (data.status) updateData.status = data.status;

    await this.updatePageGroup(id, updateData);
    return this.loadPageFromBlob(id);
  }

  async deletePage(id: string): Promise<boolean> {
    // Check if this is a translation page ID
    if (id.includes("_")) {
      const [pageGroupId, language] = id.split("_");
      const pageGroup = await this.loadPageGroupFromBlob(pageGroupId);

      if (!pageGroup) return false;

      delete pageGroup.translations[language];
      await this.updatePageGroup(pageGroupId, {
        translations: pageGroup.translations,
      });
      return true;
    }

    // Regular page group
    return this.deletePageGroup(id);
  }

  // Utility methods for data management
  async initializeFromSampleData(): Promise<void> {
    await this.initialize();

    try {
      // Check if we already have data in database
      const existingProjects =
        await sql`SELECT COUNT(*) as count FROM projects`;
      if (existingProjects[0].count > 0) {
        console.log("Database already contains data, skipping initialization");
        return;
      }

      console.log("Initializing with sample data...");

      // Create a sample project
      const sampleProject = await this.createProject({
        title: "Sample OCR Project",
        description:
          "A sample project for testing OCR and translation features",
        fileName: "sample-project",
        rootLanguage: "eng",
        translationLanguages: ["ara", "fra", "spa"],
      });

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
      });

      // Add page group to project
      await this.addPageGroupToProject(sampleProject.id, samplePageGroup.id);

      console.log("Sample data initialized successfully");
    } catch (error) {
      console.error("Failed to initialize sample data:", error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    await this.initialize();

    try {
      // Delete all data (cascade will handle relationships)
      await sql`DELETE FROM projects`;
      await sql`DELETE FROM page_groups`;

      // Clear caches
      projectCache.clear();
      pageGroupCache.clear();

      console.log("All data cleared from database");
    } catch (error) {
      console.error("Failed to clear data:", error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();

// Initialize on server startup
if (typeof window === "undefined") {
  projectService.initialize().catch(console.error);
}
