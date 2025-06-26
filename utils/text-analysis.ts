export type ArabicTextType = "classical" | "modern" | "religious" | "literary" | "technical"

interface TextAnalysisResult {
  textType: ArabicTextType
  confidence: number
  indicators: string[]
}

export function analyzeArabicText(text: string): TextAnalysisResult {
  const indicators: Record<ArabicTextType, { patterns: RegExp[]; keywords: string[]; weight: number }> = {
    classical: {
      patterns: [
        /[أإآ]ن\s+[يتن]/g, // Classical conditional patterns
        /لعل|عسى|كأن/g, // Classical particles
        /\bقال\b|\bقالت\b/g, // Classical narrative markers
        /[وف]?ليس/g, // Classical negation
        /إذ\s+|إذا\s+/g, // Classical temporal particles
      ],
      keywords: ["قال", "حدثنا", "أخبرنا", "روى", "ذكر", "بلغني", "زعم"],
      weight: 1.0,
    },
    religious: {
      patterns: [
        /الله|اللهم|رب|إله/g,
        /صلى الله عليه وسلم|عليه السلام/g,
        /قال تعالى|سبحانه وتعالى/g,
        /الحمد لله|بسم الله/g,
      ],
      keywords: ["القرآن", "الحديث", "النبي", "الرسول", "الإسلام", "المسلمين", "الدين", "الإيمان"],
      weight: 1.2,
    },
    literary: {
      patterns: [
        /يا\s+[أيها]/g, // Vocative particles
        /كأن|مثل|شبه/g, // Simile markers
        /[وف]?لا\s+[يتن]/g, // Poetic negation patterns
      ],
      keywords: ["شعر", "قصيدة", "بيت", "ديوان", "أدب", "نثر", "حكاية", "قصة"],
      weight: 1.1,
    },
    technical: {
      patterns: [
        /\d+[.]\d+|\d+%/g, // Numbers and percentages
        /[أي]ن\s+[كان]/g, // Technical conditional
        /بحيث|حيث\s+أن/g, // Technical conjunctions
      ],
      keywords: ["دراسة", "بحث", "تحليل", "نتائج", "منهج", "نظرية", "تطبيق", "تقنية"],
      weight: 0.9,
    },
    modern: {
      patterns: [
        /\b(هذا|هذه|ذلك|تلك)\s+(ال)?[أ-ي]+/g, // Modern demonstrative usage
        /من\s+أجل|بهدف|لغرض/g, // Modern purpose expressions
      ],
      keywords: ["حديث", "معاصر", "اليوم", "الآن", "حاليا", "مؤخرا", "جديد"],
      weight: 0.8,
    },
  }

  const scores: Record<ArabicTextType, number> = {
    classical: 0,
    religious: 0,
    literary: 0,
    technical: 0,
    modern: 0,
  }

  const foundIndicators: string[] = []

  // Analyze patterns and keywords
  for (const [type, config] of Object.entries(indicators)) {
    const textType = type as ArabicTextType

    // Check patterns
    for (const pattern of config.patterns) {
      const matches = text.match(pattern)
      if (matches) {
        scores[textType] += matches.length * config.weight
        foundIndicators.push(`${type}: pattern matches (${matches.length})`)
      }
    }

    // Check keywords
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        scores[textType] += config.weight
        foundIndicators.push(`${type}: keyword "${keyword}"`)
      }
    }
  }

  // Find the highest scoring type
  const maxScore = Math.max(...Object.values(scores))
  const detectedType =
    (Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as ArabicTextType) || "modern"

  // Calculate confidence based on score difference
  const sortedScores = Object.values(scores).sort((a, b) => b - a)
  const confidence = maxScore > 0 ? Math.min((maxScore - sortedScores[1]) / maxScore, 1) : 0.5

  return {
    textType: detectedType,
    confidence,
    indicators: foundIndicators,
  }
}
