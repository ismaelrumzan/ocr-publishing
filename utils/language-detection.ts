export function detectLanguageFromText(text: string): string {
  // Simple language detection based on character sets
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  const chineseRegex = /[\u4e00-\u9fff]/
  const russianRegex = /[\u0400-\u04FF]/

  if (arabicRegex.test(text)) {
    return "ara"
  } else if (chineseRegex.test(text)) {
    return "chi_sim"
  } else if (russianRegex.test(text)) {
    return "rus"
  }

  return "eng" // Default to English
}

export function getTextDirection(languageCode: string): "rtl" | "ltr" {
  const rtlLanguages = ["ara", "heb", "far", "urd"]
  return rtlLanguages.includes(languageCode) ? "rtl" : "ltr"
}
