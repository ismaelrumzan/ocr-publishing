import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"
import type { Page } from "@/types/project"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get("language")

    if (language) {
      const pages = await projectService.getPagesByLanguage(language)
      return NextResponse.json(pages)
    }

    const pages = await projectService.getPages()
    return NextResponse.json(pages)
  } catch (error) {
    console.error("Error fetching pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: Omit<Page, "id" | "createdAt" | "updatedAt"> = await request.json()

    if (!data.fileName || !data.originalText || !data.language) {
      return NextResponse.json({ error: "fileName, originalText, and language are required" }, { status: 400 })
    }

    const page = await projectService.createPage(data)
    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    console.error("Error creating page:", error)
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 })
  }
}
