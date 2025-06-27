import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: "Page ID is required" }, { status: 400 })
    }

    console.log(`Adding page ${pageId} to project ${id}`)

    // In the new system, pageId is actually a pageGroupId
    const success = await projectService.addPageGroupToProject(id, pageId)

    if (!success) {
      return NextResponse.json({ error: "Failed to add page to project" }, { status: 400 })
    }

    console.log(`Successfully added page ${pageId} to project ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding page to project:", error)
    return NextResponse.json({ error: "Failed to add page to project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: "Page ID is required" }, { status: 400 })
    }

    console.log(`Removing page ${pageId} from project ${id}`)

    // In the new system, pageId is actually a pageGroupId
    const success = await projectService.removePageGroupFromProject(id, pageId)

    if (!success) {
      return NextResponse.json({ error: "Failed to remove page from project" }, { status: 400 })
    }

    console.log(`Successfully removed page ${pageId} from project ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing page from project:", error)
    return NextResponse.json({ error: "Failed to remove page from project" }, { status: 500 })
  }
}
