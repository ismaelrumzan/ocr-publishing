"use client"

import { cn } from "@/lib/utils"

interface TextDisplayProps {
  text: string
  language: string
  direction: "rtl" | "ltr"
  className?: string
  editable?: boolean
  onChange?: (text: string) => void
}

export function TextDisplay({ text, language, direction, className, editable = false, onChange }: TextDisplayProps) {
  const isArabic = language === "ara"

  const baseClasses = cn(
    "w-full min-h-96 p-3 border rounded-md",
    direction === "rtl" ? "text-right" : "text-left",
    isArabic ? "arabic-text" : "font-mono text-sm",
    className,
  )

  if (editable) {
    return (
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
    )
  }

  return (
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
  )
}
