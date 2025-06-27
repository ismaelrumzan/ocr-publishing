export function detectArabicText(text: string): boolean {
  // Arabic Unicode range: U+0600 to U+06FF
  const arabicRegex = /[\u0600-\u06FF]/
  return arabicRegex.test(text)
}

export function detectLanguage(text: string): string {
  if (detectArabicText(text)) {
    return "ara"
  }
  // Default to English for now
  return "eng"
}
