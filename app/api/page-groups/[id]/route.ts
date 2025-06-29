import { type NextRequest, NextResponse } from "next/server";
import { projectService } from "@/lib/project-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Handle different update types
    let updatedPageGroup = null;

    if (data.rootText !== undefined) {
      // Update root text
      updatedPageGroup = await projectService.updatePageGroupRootText(
        id,
        data.rootText
      );
    } else if (data.title !== undefined) {
      // Update title
      updatedPageGroup = await projectService.updatePageGroup(id, {
        title: data.title,
      });
    } else {
      return NextResponse.json(
        { error: "No valid update data provided" },
        { status: 400 }
      );
    }

    if (!updatedPageGroup) {
      return NextResponse.json(
        { error: "Page group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, pageGroup: updatedPageGroup });
  } catch (error) {
    console.error("Error updating page group:", error);
    return NextResponse.json(
      { error: "Failed to update page group" },
      { status: 500 }
    );
  }
}
