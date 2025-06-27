import { NextResponse } from "next/server"
import { projectService } from "@/lib/project-service"

export async function GET() {
  try {
    await projectService.initialize()
    const projects = await projectService.getProjects()
    const pages = await projectService.getPages()

    return NextResponse.json({
      message: "Service initialized successfully",
      projectCount: projects.length,
      pageCount: pages.length,
    })
  } catch (error) {
    console.error("Failed to initialize service:", error)
    return NextResponse.json({ error: "Failed to initialize service" }, { status: 500 })
  }
}

export async function POST() {
  try {
    await projectService.initializeFromSampleData()
    return NextResponse.json({ message: "Sample data initialized successfully" })
  } catch (error) {
    console.error("Failed to initialize data:", error)
    return NextResponse.json({ error: "Failed to initialize data" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await projectService.clearAllData()
    return NextResponse.json({ message: "All data cleared successfully" })
  } catch (error) {
    console.error("Failed to clear data:", error)
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 })
  }
}
