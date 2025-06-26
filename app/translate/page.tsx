"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Languages, Copy, Download } from "lucide-react"
import { useApprovedTexts } from "@/contexts/approved-texts-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { EnhancedTranslationSetup } from "@/components/enhanced-translation-setup"
import type { ArabicTextType } from "@/utils/text-analysis"

interface TranslationModel {
  id: string
  name: string
  provider: string
  description: string
  bestFor: string[]
}

interface Translation {
  id: string
  textId: string
  targetLanguage: string
  modelId: string
  translatedText: string
  createdAt: Date
}

const TRANSLATION_MODELS: TranslationModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Excellent for classical Arabic translation with cultural context",
    bestFor: ["Classical Arabic", "Literary texts", "Religious texts"],
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "High-quality Arabic translation with good speed",
    bestFor: ["Modern Arabic", "Technical texts", "General translation"],
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Superior understanding of Arabic nuances and context",
    bestFor: ["Classical Arabic", "Poetry", "Complex texts"],
  },
]

const TARGET_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "de", name: "German", flag: "🇩🇪" },
]

export default function TranslatePage() {
  const { approvedTexts } = useApprovedTexts()
  const { toast } = useToast()
  const [selectedTextId, setSelectedTextId] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [targetLanguage, setTargetLanguage] = useState<string>("")
  const [translations, setTranslations] = useState<Translation[]>([])
  const [isTranslating, setIsTranslating] = useState(false)

  const selectedText = approvedTexts.find((text) => text.id === selectedTextId)
  const selectedModelInfo = TRANSLATION_MODELS.find((model) => model.id === selectedModel)
  const selectedLanguageInfo = TARGET_LANGUAGES.find((lang) => lang.code === targetLanguage)

  const handleTranslate = async (textType: ArabicTextType) => {
    if (!selectedText || !selectedModel || !targetLanguage) {
      toast({
        title: "Missing Information",
        description: "Please select text, model, and target language",
        variant: "destructive",
      })
      return
    }

    setIsTranslating(true)

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText.text,
          sourceLanguage: selectedText.language,
          targetLanguage,
          model: selectedModel,
          textType,
        }),
      })

      if (!response.ok) {
        throw new Error("Translation failed")
      }

      const result = await response.json()

      const newTranslation: Translation = {
        id: Math.random().toString(36).substr(2, 9),
        textId: selectedTextId,
        targetLanguage,
        modelId: selectedModel,
        translatedText: result.translatedText,
        createdAt: new Date(),
      }

      setTranslations((prev) => [...prev, newTranslation])

      toast({
        title: "Translation Complete",
        description: `Text translated using ${result.usedClassicalPrompt ? "Classical Arabic" : "Standard"} methodology`,
      })
    } catch (error) {
      console.error("Translation error:", error)
      toast({
        title: "Translation Error",
        description: "Failed to translate text. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTranslating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Translation copied to clipboard",
    })
  }

  const exportTranslation = (translation: Translation) => {
    const content = `Original Text (${selectedText?.language}):\n${selectedText?.text}\n\nTranslation (${translation.targetLanguage}):\n${translation.translatedText}\n\nModel: ${selectedModelInfo?.name}\nTranslated: ${translation.createdAt.toLocaleString()}`

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `translation-${translation.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (approvedTexts.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to OCR Scanner
            </Button>
          </Link>
        </div>

        <div className="text-center py-12">
          <Languages className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Approved Texts</h3>
          <p className="text-muted-foreground mb-4">
            You need to approve some texts in the OCR scanner before you can translate them.
          </p>
          <Link href="/">
            <Button>Go to OCR Scanner</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to OCR Scanner
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Languages className="w-8 h-8" />
          AI Translation
        </h1>
        <p className="text-muted-foreground">
          Translate your approved OCR texts using state-of-the-art AI models optimized for Arabic translation.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Translation Setup */}
        <EnhancedTranslationSetup
          approvedTexts={approvedTexts}
          selectedTextId={selectedTextId}
          selectedModel={selectedModel}
          targetLanguage={targetLanguage}
          isTranslating={isTranslating}
          onTextSelect={setSelectedTextId}
          onModelSelect={setSelectedModel}
          onLanguageSelect={setTargetLanguage}
          onTranslate={handleTranslate}
        />

        {/* Original Text Preview */}
        {selectedText && (
          <Card>
            <CardHeader>
              <CardTitle>Original Text</CardTitle>
              <div className="flex items-center gap-2">
                <Badge>{selectedText.language}</Badge>
                <Badge variant="outline">{selectedText.fileName}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="p-3 bg-muted rounded-lg max-h-96 overflow-y-auto"
                style={{
                  direction: selectedText.language === "ara" ? "rtl" : "ltr",
                  fontFamily:
                    selectedText.language === "ara" ? "var(--font-noto-arabic), Arial, sans-serif" : "monospace",
                  lineHeight: selectedText.language === "ara" ? "1.8" : "1.5",
                }}
              >
                {selectedText.text}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Translations Results */}
      {translations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Translation Results</h2>
          <div className="grid gap-4">
            {translations.map((translation) => {
              const text = approvedTexts.find((t) => t.id === translation.textId)
              const model = TRANSLATION_MODELS.find((m) => m.id === translation.modelId)
              const language = TARGET_LANGUAGES.find((l) => l.code === translation.targetLanguage)

              return (
                <Card key={translation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {text?.fileName} → {language?.flag} {language?.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{model?.name}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(translation.translatedText)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => exportTranslation(translation)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={translation.translatedText}
                      readOnly
                      className="min-h-32 font-sans"
                      style={{
                        direction: "ltr",
                        textAlign: "left",
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Translated on {translation.createdAt.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
