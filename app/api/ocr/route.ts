import { type NextRequest, NextResponse } from "next/server"
import Tesseract from "tesseract.js"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    console.log("Processing OCR for file:", imageFile.name)

    // Convert File to Buffer for Tesseract
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process with Tesseract
    const result = await Tesseract.recognize(buffer, "eng+ara", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    return NextResponse.json({
      text: result.data.text,
      confidence: result.data.confidence / 100, // Convert to 0-1 range
      words: result.data.words?.length || 0,
    })
  } catch (error) {
    console.error("OCR processing error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR processing failed" },
      { status: 500 },
    )
  }
}
