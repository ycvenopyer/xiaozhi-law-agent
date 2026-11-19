export const translationLanguages: Record<'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es', string>
export type TranslationLanguage = keyof typeof translationLanguages
export type DocumentTool =
  | { name: 'file_parse' }
  | { name: 'professional_translate'; targetLanguage: TranslationLanguage }

export const documentAccept: string
export const documentMaxChars: number
