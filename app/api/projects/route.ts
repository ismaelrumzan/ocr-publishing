import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"
import type { CreateProjectData } from "@/types/project"

export async function GET() {
  try {
    const projects = await projectService.getProjects()
    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateProjectData = await request.json()

    if (!data.title || !data.rootLanguage || !data.translationLanguages || data.translationLanguages.length === 0) {
      return NextResponse.json(
        {
          error: "Title, root language, and at least one translation language are required",
        },
        { status: 400 },
      )
    }

    // Create the project data with the correct structure
    const projectData: CreateProjectData = {
      title: data.title,
      description: data.description || "",
      rootLanguage: data.rootLanguage,
      translationLanguages: data.translationLanguages,
      supportedLanguages: [data.rootLanguage, ...data.translationLanguages],
    }

    const project = await projectService.createProject(projectData)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
