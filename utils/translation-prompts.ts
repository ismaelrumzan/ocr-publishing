export interface TranslationPromptConfig {
  sourceLanguage: string
  targetLanguage: string
  model: string
  textType?: "classical" | "modern" | "religious" | "literary" | "technical"
}

export function createClassicalArabicPrompt(config: TranslationPromptConfig, text: string): string {
  const { targetLanguage, textType = "classical" } = config

  const targetLanguageNames: Record<string, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
  }

  const targetLangName = targetLanguageNames[targetLanguage] || "English"

  // Base classical Arabic expertise
  const baseExpertise = `You are a distinguished scholar of Classical Arabic with deep expertise in:
- Classical Arabic grammar (النحو) and morphology (الصرف)
- Hans Wehr Arabic-English Dictionary methodology and root system analysis
- Classical Arabic literary traditions and rhetorical devices (البلاغة)
- Historical linguistic evolution from Classical to Modern Standard Arabic
- Quranic and pre-Islamic poetry linguistic patterns
- Medieval Arabic prose and scholarly texts`

  // Language-specific expertise
  const languageSpecificExpertise = {
    en: `- Expertise in Arabic-English lexicography following Hans Wehr's systematic approach
- Understanding of Arabic root patterns (أوزان) and their English semantic equivalents
- Knowledge of classical Arabic idioms and their closest English cultural parallels
- Familiarity with orientalist scholarship and academic Arabic-English translation standards`,

    fr: `- Expertise in Arabic-French scholarly translation traditions
- Understanding of French orientalist approaches to Arabic texts
- Knowledge of classical Arabic concepts that have French academic equivalents
- Familiarity with French Islamic studies terminology`,

    es: `- Expertise in Arabic-Spanish translation, particularly Andalusian Arabic influences
- Understanding of Arabic loanwords in Spanish and their classical origins
- Knowledge of medieval Iberian Arabic-Spanish linguistic interactions`,

    de: `- Expertise in German orientalist scholarship and Arabic-German academic translation
- Understanding of German Islamic studies terminology
- Knowledge of systematic German approaches to Arabic linguistic analysis`,
  }

  // Text-type specific instructions
  const textTypeInstructions = {
    classical: `This appears to be Classical Arabic text. Apply these specialized approaches:

GRAMMATICAL ANALYSIS:
- Identify and preserve classical إعراب (case endings) implications in translation
- Recognize classical verb forms and their aspectual meanings
- Handle classical Arabic word order (VSO) and its rhetorical significance
- Preserve the meaning of classical particles (حروف) and their syntactic functions

LEXICOGRAPHICAL APPROACH (Hans Wehr Method):
- Analyze words by their trilateral/quadrilateral roots (جذور)
- Consider the semantic field of each root and its derived forms
- Apply Hans Wehr's systematic meaning categorization
- Distinguish between classical and modern meanings of polysemous words
- Preserve etymological connections where relevant in ${targetLangName}

STYLISTIC CONSIDERATIONS:
- Maintain the formal register appropriate to classical texts
- Preserve rhetorical devices like جناس (paronomasia) and طباق (antithesis) where possible
- Handle classical Arabic metaphors with cultural sensitivity
- Maintain the dignity and elevated style of classical Arabic prose`,

    religious: `This appears to be religious Arabic text. Apply these specialized approaches:

THEOLOGICAL TERMINOLOGY:
- Use established religious terminology in ${targetLangName}
- Preserve the precision of Islamic theological concepts
- Handle Quranic quotations and prophetic traditions with appropriate reverence
- Maintain the sacred register of religious discourse

CLASSICAL GRAMMAR IN RELIGIOUS CONTEXT:
- Pay special attention to classical constructions used in religious texts
- Preserve the meaning of religious particles and conjunctions
- Handle classical Arabic conditional structures in religious contexts
- Maintain the formal eloquence expected in religious discourse`,

    literary: `This appears to be literary Arabic text. Apply these specialized approaches:

LITERARY ANALYSIS:
- Preserve poetic meters (بحور) implications where relevant
- Maintain literary devices and figurative language
- Handle classical Arabic imagery and symbolism
- Preserve the aesthetic and emotional impact of the original

CLASSICAL RHETORIC:
- Apply knowledge of classical Arabic بلاغة (rhetoric)
- Preserve معاني (semantics), بيان (clarity), and بديع (embellishment)
- Handle classical Arabic prose rhythms and cadences`,

    modern: `This appears to be Modern Standard Arabic with classical influences:

MODERN CLASSICAL SYNTHESIS:
- Distinguish between classical forms used for stylistic effect
- Handle modern Arabic that employs classical grammatical structures
- Preserve the intended register and formality level
- Balance classical precision with modern clarity`,

    technical: `This appears to be technical or academic Arabic text:

TECHNICAL PRECISION:
- Maintain technical terminology accuracy
- Handle classical Arabic used in academic contexts
- Preserve scholarly precision and formal register
- Use appropriate academic ${targetLangName} equivalents`,
  }

  const specificInstructions = textTypeInstructions[textType]
  const langExpertise = languageSpecificExpertise[targetLanguage] || languageSpecificExpertise.en

  return `${baseExpertise}

${langExpertise}

${specificInstructions}

TRANSLATION PRINCIPLES:
1. Accuracy: Maintain semantic precision while respecting classical Arabic nuances
2. Clarity: Produce natural ${targetLangName} that preserves the original's clarity
3. Cultural Sensitivity: Handle cultural and religious concepts appropriately
4. Scholarly Standards: Meet academic translation standards for classical texts
5. Contextual Awareness: Consider the historical and literary context

TEXT TO TRANSLATE:
${text}

INSTRUCTIONS:
- Provide a scholarly translation that demonstrates deep understanding of classical Arabic
- Include brief explanatory notes in parentheses for culturally specific terms if necessary
- Maintain the dignity and register of the original text
- Ensure the translation would be acceptable in academic ${targetLangName} publications

Provide only the translation with minimal explanatory notes where absolutely necessary. Do not include commentary about the translation process.`
}

export function createModernArabicPrompt(config: TranslationPromptConfig, text: string): string {
  const { targetLanguage } = config
  const targetLanguageNames: Record<string, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
  }

  const targetLangName = targetLanguageNames[targetLanguage] || "English"

  return `You are an expert translator specializing in Modern Standard Arabic to ${targetLangName} translation.

Please translate the following Modern Standard Arabic text to ${targetLangName}.

Guidelines:
- Maintain natural, fluent ${targetLangName} while staying faithful to the source
- Preserve the intended meaning and context
- Handle modern Arabic idioms appropriately
- Use contemporary ${targetLangName} that matches the register of the original

Text to translate:
${text}

Provide only the translation without additional commentary.`
}
