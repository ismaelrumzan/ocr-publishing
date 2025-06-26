import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"

export async function POST(request: NextRequest) {
  try {
    const { rootPageId, translationPageId } = await request.json()

    if (!rootPageId || !translationPageId) {
      return NextResponse.json({ error: "Root page ID and translation page ID are required" }, { status: 400 })
    }

    const success = await projectService.linkTranslationPage(rootPageId, translationPageId)

    if (!success) {
      return NextResponse.json({ error: "Failed to link pages" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error linking pages:", error)
    return NextResponse.json({ error: "Failed to link pages" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { rootPageId, translationPageId } = await request.json()

    if (!rootPageId || !translationPageId) {
      return NextResponse.json({ error: "Root page ID and translation page ID are required" }, { status: 400 })
    }

    const success = await projectService.unlinkTranslationPage(rootPageId, translationPageId)

    if (!success) {
      return NextResponse.json({ error: "Failed to unlink pages" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unlinking pages:", error)
    return NextResponse.json({ error: "Failed to unlink pages" }, { status: 500 })
  }
}
