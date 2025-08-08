"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, Save, X, Copy, Check } from 'lucide-react'
import { cn } from "@/lib/utils"

interface EditableTextDisplayProps {
  text: string
  language: string
  direction: "rtl" | "ltr"
  className?: string
  onSave: (newText: string) => void
  isLoading?: boolean
}

export function EditableTextDisplay({
  text,
  language,
  direction,
  className,
  onSave,
  isLoading = false,
}: EditableTextDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(text)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text.trim()) return
    
    const prompt = "Translate the following text from classical arabic to eloquent english"
    const textToCopy = `${prompt}\n\n${text}`
    
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const isArabic = language === "ara"

  const handleSave = () => {
    onSave(editedText)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedText(text)
    setIsEditing(false)
  }

  const baseClasses = cn(
    "w-full min-h-32 p-3 border rounded-md",
    direction === "rtl" ? "text-right" : "text-left",
    isArabic ? "arabic-text" : "font-mono text-sm",
    className,
  )

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className={baseClasses}
          style={{
            direction,
            fontFamily: isArabic ? "var(--font-noto-arabic), Arial, sans-serif" : "monospace",
            lineHeight: isArabic ? "1.8" : "1.5",
          }}
          placeholder={direction === "rtl" ? "النص المحرر..." : "Edited text..."}
          disabled={isLoading}
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} size="sm" disabled={isLoading} className="gap-2">
            <Save className="w-3 h-3" />
            Save
          </Button>
          <Button onClick={handleCancel} variant="outline" size="sm" disabled={isLoading} className="gap-2">
            <X className="w-3 h-3" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Text Content</span>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="gap-2 min-h-[44px] min-w-[44px]"
            disabled={!text.trim()}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy for ChatGPT"}</span>
          </Button>
          <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm" className="gap-2 min-h-[44px]">
            <Edit3 className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>
      <div
        className={cn(baseClasses, "bg-muted/50")}
        style={{
          direction,
          fontFamily: isArabic ? "var(--font-noto-arabic), Arial, sans-serif" : "monospace",
          lineHeight: isArabic ? "1.8" : "1.5",
        }}
      >
        {text || (direction === "rtl" ? "لا يوجد نص..." : "No text...")}
      </div>
    </div>
  )
}
