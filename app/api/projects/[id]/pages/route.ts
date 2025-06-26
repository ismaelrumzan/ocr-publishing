import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { pageId, language } = await request.json()

    if (!pageId || !language) {
      return NextResponse.json({ error: "Page ID and language are required" }, { status: 400 })
    }

    const success = await projectService.addPageToProject(id, pageId, language)

    if (!success) {
      return NextResponse.json({ error: "Failed to add page to project" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding page to project:", error)
    return NextResponse.json({ error: "Failed to add page to project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { pageId, language } = await request.json()

    if (!pageId || !language) {
      return NextResponse.json({ error: "Page ID and language are required" }, { status: 400 })
    }

    const success = await projectService.removePageFromProject(id, pageId, language)

    if (!success) {
      return NextResponse.json({ error: "Failed to remove page from project" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing page from project:", error)
    return NextResponse.json({ error: "Failed to remove page from project" }, { status: 500 })
  }
}
