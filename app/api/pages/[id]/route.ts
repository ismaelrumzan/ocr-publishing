import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"
import type { Page } from "@/types/project"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data: Partial<Page> = await request.json()

    const page = await projectService.updatePage(id, data)

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error("Error updating page:", error)
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 })
  }
}
