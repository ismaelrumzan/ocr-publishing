export type ArabicTextType = "classical" | "religious" | "literary" | "technical" | "modern";

export function analyzeArabicText(text: string) {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const words = text.split(/\s+/).filter((word) => word.trim().length > 0);

  return {
    lineCount: lines.length,
    wordCount: words.length,
    characterCount: text.length,
    hasArabic: /[\u0600-\u06FF]/.test(text),
    hasEnglish: /[a-zA-Z]/.test(text),
    hasNumbers: /\d/.test(text),
  };
}

export function analyzeText(text: string) {
  return analyzeArabicText(text);
}
