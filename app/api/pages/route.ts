import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"
import type { Page } from "@/lib/types"

/* ----------  POST /api/pages  ---------- */
export async function POST(request: NextRequest) {
  try {
    console.log("=== /api/pages POST called ===")

    // If the header is missing, default to treating it as multipart.
    const contentType = (request.headers.get("content-type") || "").toLowerCase()
    const isJson = contentType.includes("application/json")

    let pageData: any = {}

    if (!isJson) {
      /* ---------- MULTIPART FORM DATA ---------- */
      const formData = await request.formData()

      pageData = {
        fileName: formData.get("fileName")?.toString() ?? "untitled",
        title: formData.get("title")?.toString() ?? "Untitled",
        originalText: formData.get("originalText")?.toString() ?? "",
        editedText: formData.get("editedText")?.toString() ?? "",
        language: formData.get("language")?.toString() ?? "eng",
        status: (formData.get("status")?.toString() ?? "approved") as Page["status"],
        imageFile: formData.get("imageFile") as File | null,
      }

      if (!pageData.imageFile) {
        return NextResponse.json({ error: "Image file is required." }, { status: 400 })
      }
    } else {
      /* ---------- APPLICATION/JSON ---------- */
      pageData = await request.json()

      if (!pageData.language || !pageData.editedText) {
        return NextResponse.json({ error: "language and editedText are required." }, { status: 400 })
      }
    }

    console.log("Creating page with:", {
      ...pageData,
      imageFile: pageData.imageFile ? `File(${pageData.imageFile.name})` : "none",
    })

    const page = await projectService.createPage(pageData)

    // If this JSON body included a projectId, link immediately
    if (isJson && pageData.projectId) {
      await projectService.addPageToProject(pageData.projectId, page.id, pageData.language)
    }

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    console.error("Error creating page:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create page" },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const pages = await projectService.getPages()
    return NextResponse.json(pages)
  } catch (error) {
    console.error("Error fetching pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 })
  }
}
