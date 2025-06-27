import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { language, translationText } = await request.json()

    if (!language || !translationText) {
      return NextResponse.json({ error: "Language and translation text are required" }, { status: 400 })
    }

    console.log(`Adding translation for page group ${id}, language: ${language}`)

    const updatedPageGroup = await projectService.addTranslationToPageGroup(id, language, translationText)

    if (!updatedPageGroup) {
      return NextResponse.json({ error: "Page group not found" }, { status: 404 })
    }

    console.log(`Translation added successfully for page group ${id}`)
    return NextResponse.json({ success: true, pageGroup: updatedPageGroup })
  } catch (error) {
    console.error("Error adding translation:", error)
    return NextResponse.json({ error: "Failed to add translation" }, { status: 500 })
  }
}
