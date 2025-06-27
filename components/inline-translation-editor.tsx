"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, Type, Wand2 } from "lucide-react"

interface InlineTranslationEditorProps {
  rootPageText: string
  targetLanguage: string
  languageInfo:
    | {
        code: string
        name: string
        direction: "ltr" | "rtl"
        flag: string
      }
    | undefined
  onSave: (translationText: string) => void
}

export function InlineTranslationEditor({
  rootPageText,
  targetLanguage,
  languageInfo,
  onSave,
}: InlineTranslationEditorProps) {
  const [translationText, setTranslationText] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAutoTranslate = async () => {
    setIsTranslating(true)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rootPageText,
          targetLanguage: targetLanguage,
          sourceLanguage: "auto",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTranslationText(data.translatedText)
      }
    } catch (error) {
      console.error("Auto-translation failed:", error)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSave = async () => {
    if (!translationText.trim() || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      await onSave(translationText.trim())
      setTranslationText("")
      setIsExpanded(false)
    } catch (error) {
      console.error("Failed to save translation:", error)
      // Don't reset the form if there's an error so user doesn't lose their work
    } finally {
      setIsSaving(false)
    }
  }

  if (!isExpanded) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)} className="gap-2">
          <Type className="w-3 h-3" />
          Add Translation
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoTranslate} disabled={isTranslating} className="gap-2">
          <Wand2 className="w-3 h-3" />
          {isTranslating ? "Translating..." : "Auto Translate"}
        </Button>
      </div>
    )
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline">
              {languageInfo?.flag} {languageInfo?.name}
            </Badge>
            Create Translation
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Original:</strong> {rootPageText.substring(0, 100)}...
        </div>

        <Textarea
          value={translationText}
          onChange={(e) => setTranslationText(e.target.value)}
          placeholder={`Enter ${languageInfo?.name} translation...`}
          className="min-h-[120px]"
          dir={languageInfo?.direction || "ltr"}
        />

        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={handleAutoTranslate} disabled={isTranslating} className="gap-2">
            <Wand2 className="w-3 h-3" />
            {isTranslating ? "Translating..." : "Auto Translate"}
          </Button>

          <Button onClick={handleSave} disabled={!translationText.trim() || isSaving} className="gap-2">
            <Save className="w-3 h-3" />
            {isSaving ? "Saving..." : "Save Translation"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
