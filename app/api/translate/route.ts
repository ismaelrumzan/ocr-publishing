import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import {
  createClassicalArabicPrompt,
  createModernArabicPrompt,
  type TranslationPromptConfig,
} from "@/utils/translation-prompts"
import type { ArabicTextType } from "@/utils/text-analysis"

export async function POST(request: Request) {
  try {
    const { text, sourceLanguage, targetLanguage, model, textType } = await request.json()

    if (!text || !targetLanguage || !model) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const config: TranslationPromptConfig = {
      sourceLanguage,
      targetLanguage,
      model,
      textType: textType as ArabicTextType,
    }

    let aiModel
    let prompt: string

    // Select AI model
    switch (model) {
      case "gpt-4o-classical":
      case "gpt-4o":
        aiModel = openai("gpt-4o")
        break
      case "gpt-4-turbo":
        aiModel = openai("gpt-4-turbo")
        break
      case "claude-3-5-sonnet-classical":
      case "claude-3-5-sonnet":
        aiModel = anthropic("claude-3-5-sonnet-20241022")
        break
      default:
        aiModel = openai("gpt-4o")
    }

    // Generate appropriate prompt based on model and text type
    if (
      sourceLanguage === "ara" &&
      (model.includes("classical") || textType === "classical" || textType === "religious" || textType === "literary")
    ) {
      prompt = createClassicalArabicPrompt(config, text)
    } else {
      prompt = createModernArabicPrompt(config, text)
    }

    const { text: translatedText } = await generateText({
      model: aiModel,
      prompt,
      temperature: 0.2, // Lower temperature for more consistent scholarly translations
      maxTokens: 4000, // Allow for longer translations with explanatory notes
    })

    return Response.json({
      translatedText,
      usedClassicalPrompt:
        sourceLanguage === "ara" &&
        (model.includes("classical") ||
          textType === "classical" ||
          textType === "religious" ||
          textType === "literary"),
      textType,
      model,
    })
  } catch (error) {
    console.error("Translation error:", error)
    return Response.json({ error: "Translation failed" }, { status: 500 })
  }
}
