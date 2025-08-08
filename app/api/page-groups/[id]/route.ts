import { type NextRequest, NextResponse } from "next/server";
import { projectService } from "@/lib/project-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`Updating page group ${id} with:`, body);

    // Handle title updates
    if (body.title !== undefined) {
      const success = await projectService.updatePageGroupTitle(id, body.title);
      if (!success) {
        return NextResponse.json(
          { error: "Page group not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Handle root text updates
    if (body.rootText !== undefined) {
      const success = await projectService.updatePageGroupRootText(id, body.rootText);
      if (!success) {
        return NextResponse.json(
          { error: "Page group not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "No valid update fields provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating page group:", error);
    return NextResponse.json(
      { error: "Failed to update page group" },
      { status: 500 }
    );
  }
}
