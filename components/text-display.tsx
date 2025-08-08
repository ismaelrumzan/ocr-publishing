"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Copy, Check } from 'lucide-react'
import { useState } from "react"

interface TextDisplayProps {
  text: string
  language: string
  direction: "rtl" | "ltr"
  className?: string
  editable?: boolean
  onChange?: (text: string) => void
}

export function TextDisplay({ text, language, direction, className, editable = false, onChange }: TextDisplayProps) {
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

  const baseClasses = cn(
    "w-full min-h-96 p-3 border rounded-md",
    direction === "rtl" ? "text-right" : "text-left",
    isArabic ? "arabic-text" : "font-mono text-sm",
    className,
  )

  if (editable) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Text Content</span>
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="gap-2 min-h-[44px] min-w-[44px]"
            disabled={!text.trim()}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy for ChatGPT"}</span>
          </Button>
        </div>
        <textarea
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          className={baseClasses}
          style={{
            direction,
            fontFamily: isArabic ? "var(--font-noto-arabic), Arial, sans-serif" : "monospace",
            lineHeight: isArabic ? "1.8" : "1.5",
          }}
          placeholder={direction === "rtl" ? "النص المستخرج سيظهر هنا..." : "OCR text will appear here..."}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Text Content</span>
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="gap-2 min-h-[44px] min-w-[44px]"
          disabled={!text.trim()}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Copy for ChatGPT"}</span>
        </Button>
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
