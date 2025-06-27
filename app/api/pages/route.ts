import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"
import type { Page } from "@/types/project"

export async function POST(request: NextRequest) {
  try {
    console.log("=== /api/pages POST called ===")

    const contentType = (request.headers.get("content-type") || "").toLowerCase()
    const isJson = contentType.includes("application/json")

    let pageData: any = {}

    if (!isJson) {
      // Handle FormData (with image)
      const formData = await request.formData()

      console.log("FormData entries:")
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes)`)
        } else {
          console.log(`${key}: ${value}`)
        }
      }

      pageData = {
        fileName: formData.get("fileName")?.toString() ?? "untitled",
        title: formData.get("title")?.toString() ?? "Untitled",
        originalText: formData.get("originalText")?.toString() ?? "",
        editedText: formData.get("editedText")?.toString() ?? "",
        language: formData.get("language")?.toString() ?? "eng",
        status: (formData.get("status")?.toString() ?? "approved") as Page["status"],
        imageFile: formData.get("imageFile") as File | null,
        projectId: formData.get("projectId")?.toString(),
      }

      if (!pageData.imageFile) {
        return NextResponse.json({ error: "Image file is required." }, { status: 400 })
      }
    } else {
      // Handle JSON
      pageData = await request.json()
      console.log("JSON data:", pageData)

      if (!pageData.language || !pageData.editedText) {
        return NextResponse.json({ error: "language and editedText are required." }, { status: 400 })
      }
    }

    console.log("Creating page with data:", {
      ...pageData,
      imageFile: pageData.imageFile ? `File(${pageData.imageFile.name})` : "none",
    })

    const page = await projectService.createPage(pageData)
    console.log("Page created successfully:", {
      id: page.id,
      title: page.title,
      fileName: page.fileName,
      language: page.language,
    })

    // If projectId is provided, add the page to that project
    if (pageData.projectId) {
      console.log(`Adding page ${page.id} to project ${pageData.projectId}`)
      const success = await projectService.addPageToProject(pageData.projectId, page.id, pageData.language)
      console.log(`Page linking result: ${success}`)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get("language")

    const pages = language ? await projectService.getPagesByLanguage(language) : await projectService.getPages()

    return NextResponse.json(pages)
  } catch (error) {
    console.error("Error fetching pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 })
  }
}
