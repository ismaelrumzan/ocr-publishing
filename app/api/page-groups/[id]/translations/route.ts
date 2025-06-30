import { type NextRequest, NextResponse } from "next/server";
import { projectService } from "@/lib/project-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { language, text } = await request.json();

    if (!language || !text) {
      return NextResponse.json(
        { error: "Language and text are required" },
        { status: 400 }
      );
    }

    console.log(
      `Adding translation for page group ${id}, language: ${language}`
    );

    const updatedPageGroup = await projectService.addTranslationToPageGroup(
      id,
      language,
      text
    );

    if (!updatedPageGroup) {
      return NextResponse.json(
        { error: "Page group not found" },
        { status: 404 }
      );
    }

    console.log(`Translation added successfully for page group ${id}`);
    return NextResponse.json({ success: true, pageGroup: updatedPageGroup });
  } catch (error) {
    console.error("Error adding translation:", error);
    return NextResponse.json(
      { error: "Failed to add translation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { language, text } = await request.json();

    console.log("=== PUT /api/page-groups/[id]/translations ===");
    console.log("Page group ID:", id);
    console.log("Language:", language);
    console.log("Text length:", text.length);
    console.log("Text preview:", text.substring(0, 100) + "...");

    if (!language || !text) {
      console.log("Validation failed: missing language or text");
      return NextResponse.json(
        { error: "Language and text are required" },
        { status: 400 }
      );
    }

    console.log(
      `Updating translation for page group ${id}, language: ${language}`
    );

    const updatedPageGroup = await projectService.addTranslationToPageGroup(
      id,
      language,
      text
    );

    console.log("Update result:", updatedPageGroup ? "success" : "failed");

    if (!updatedPageGroup) {
      console.log("Page group not found");
      return NextResponse.json(
        { error: "Page group not found" },
        { status: 404 }
      );
    }

    console.log(`Translation updated successfully for page group ${id}`);
    return NextResponse.json({ success: true, pageGroup: updatedPageGroup });
  } catch (error) {
    console.error("Error updating translation:", error);
    return NextResponse.json(
      { error: "Failed to update translation" },
      { status: 500 }
    );
  }
}
