"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Brain, BookOpen, Languages } from "lucide-react"
import { analyzeArabicText, type ArabicTextType } from "@/utils/text-analysis"

interface ApprovedText {
  id: string
  fileName: string
  text: string
  language: string
  approvedAt: Date
}

interface TranslationModel {
  id: string
  name: string
  provider: string
  description: string
  bestFor: string[]
  classicalArabicOptimized?: boolean
}

interface EnhancedTranslationSetupProps {
  approvedTexts: ApprovedText[]
  selectedTextId: string
  selectedModel: string
  targetLanguage: string
  isTranslating: boolean
  onTextSelect: (textId: string) => void
  onModelSelect: (modelId: string) => void
  onLanguageSelect: (language: string) => void
  onTranslate: (textType: ArabicTextType) => void
}

const ENHANCED_TRANSLATION_MODELS: TranslationModel[] = [
  {
    id: "gpt-4o-classical",
    name: "GPT-4o (Classical Arabic Specialist)",
    provider: "OpenAI",
    description: "Optimized for classical Arabic with Hans Wehr methodology",
    bestFor: ["Classical Arabic", "Religious texts", "Historical documents"],
    classicalArabicOptimized: true,
  },
  {
    id: "claude-3-5-sonnet-classical",
    name: "Claude 3.5 Sonnet (Arabic Scholar)",
    provider: "Anthropic",
    description: "Enhanced with classical Arabic grammar rules and lexicography",
    bestFor: ["Literary texts", "Poetry", "Complex classical prose"],
    classicalArabicOptimized: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o (Standard)",
    provider: "OpenAI",
    description: "High-quality general Arabic translation",
    bestFor: ["Modern Arabic", "Mixed texts", "General translation"],
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet (Standard)",
    provider: "Anthropic",
    description: "Excellent contextual understanding",
    bestFor: ["Nuanced texts", "Cultural content", "Academic texts"],
  },
]

const TARGET_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "de", name: "German", flag: "🇩🇪" },
]

const TEXT_TYPE_DESCRIPTIONS: Record<ArabicTextType, { name: string; description: string; icon: string }> = {
  classical: {
    name: "Classical Arabic",
    description: "Pre-modern Arabic with traditional grammar and vocabulary",
    icon: "📜",
  },
  religious: {
    name: "Religious Text",
    description: "Islamic religious content with theological terminology",
    icon: "🕌",
  },
  literary: {
    name: "Literary Text",
    description: "Poetry, prose, or other literary works",
    icon: "📚",
  },
  technical: {
    name: "Technical/Academic",
    description: "Scholarly or technical content",
    icon: "🔬",
  },
  modern: {
    name: "Modern Standard Arabic",
    description: "Contemporary Arabic text",
    icon: "📰",
  },
}

export function EnhancedTranslationSetup({
  approvedTexts,
  selectedTextId,
  selectedModel,
  targetLanguage,
  isTranslating,
  onTextSelect,
  onModelSelect,
  onLanguageSelect,
  onTranslate,
}: EnhancedTranslationSetupProps) {
  const [textAnalysis, setTextAnalysis] = useState<{
    textType: ArabicTextType
    confidence: number
    indicators: string[]
  } | null>(null)
  const [manualTextType, setManualTextType] = useState<ArabicTextType | "auto">("auto")

  const selectedText = approvedTexts.find((text) => text.id === selectedTextId)
  const selectedModelInfo = ENHANCED_TRANSLATION_MODELS.find((model) => model.id === selectedModel)
  const selectedLanguageInfo = TARGET_LANGUAGES.find((lang) => lang.code === targetLanguage)

  // Analyze text when selection changes
  useEffect(() => {
    if (selectedText && selectedText.language === "ara") {
      const analysis = analyzeArabicText(selectedText.text)
      setTextAnalysis(analysis)
    } else {
      setTextAnalysis(null)
    }
  }, [selectedText])

  const finalTextType = manualTextType === "auto" ? textAnalysis?.textType || "modern" : manualTextType

  const handleTranslate = () => {
    onTranslate(finalTextType)
  }

  // Filter models based on text type
  const recommendedModels = ENHANCED_TRANSLATION_MODELS.filter((model) => {
    if (finalTextType === "classical" || finalTextType === "religious" || finalTextType === "literary") {
      return model.classicalArabicOptimized
    }
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          Enhanced Translation Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text Selection */}
        <div className="space-y-2">
          <Label>Select Text to Translate</Label>
          <Select value={selectedTextId} onValueChange={onTextSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose approved text" />
            </SelectTrigger>
            <SelectContent>
              {approvedTexts.map((text) => (
                <SelectItem key={text.id} value={text.id}>
                  <div className="flex items-center gap-2">
                    <span>{text.fileName}</span>
                    <Badge variant="outline" className="text-xs">
                      {text.language}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Analysis */}
        {textAnalysis && selectedText?.language === "ara" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <Label>Text Analysis</Label>
            </div>

            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span>{TEXT_TYPE_DESCRIPTIONS[textAnalysis.textType].icon}</span>
                    <strong>{TEXT_TYPE_DESCRIPTIONS[textAnalysis.textType].name}</strong>
                    <Badge variant="secondary">{Math.round(textAnalysis.confidence * 100)}% confidence</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {TEXT_TYPE_DESCRIPTIONS[textAnalysis.textType].description}
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Text Type Override</Label>
              <Select
                value={manualTextType}
                onValueChange={(value) => setManualTextType(value as ArabicTextType | "auto")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Auto-detected: {TEXT_TYPE_DESCRIPTIONS[textAnalysis.textType].name}
                  </SelectItem>
                  {Object.entries(TEXT_TYPE_DESCRIPTIONS).map(([type, info]) => (
                    <SelectItem key={type} value={type}>
                      {info.icon} {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <Label>Translation Model</Label>
          <Select value={selectedModel} onValueChange={onModelSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose AI model" />
            </SelectTrigger>
            <SelectContent>
              {recommendedModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {model.classicalArabicOptimized && (
                        <Badge variant="default" className="text-xs bg-amber-600">
                          Classical Arabic
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{model.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Language */}
        <div className="space-y-2">
          <Label>Target Language</Label>
          <Select value={targetLanguage} onValueChange={onLanguageSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose target language" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Information */}
        {selectedModelInfo && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-1 flex items-center gap-2">
              {selectedModelInfo.name}
              {selectedModelInfo.classicalArabicOptimized && (
                <Badge variant="default" className="text-xs bg-amber-600">
                  Hans Wehr Enhanced
                </Badge>
              )}
            </h4>
            <p className="text-sm text-muted-foreground mb-2">{selectedModelInfo.description}</p>
            <div className="flex flex-wrap gap-1">
              {selectedModelInfo.bestFor.map((item) => (
                <Badge key={item} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Translation Button */}
        <Button
          onClick={handleTranslate}
          disabled={!selectedText || !selectedModel || !targetLanguage || isTranslating}
          className="w-full gap-2"
        >
          {isTranslating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Translating with {finalTextType === "classical" ? "Classical Arabic" : "Standard"} Rules...
            </>
          ) : (
            <>
              <Languages className="w-4 h-4" />
              Translate with {TEXT_TYPE_DESCRIPTIONS[finalTextType].name} Optimization
            </>
          )}
        </Button>

        {/* Preview of selected text type optimization */}
        {finalTextType === "classical" && (
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertDescription>
              <strong>Classical Arabic Enhancement Active:</strong>
              <ul className="text-sm mt-1 space-y-1">
                <li>• Hans Wehr dictionary methodology</li>
                <li>• Classical grammar rules (إعراب)</li>
                <li>• Root-based lexical analysis</li>
                <li>• Rhetorical device preservation</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
