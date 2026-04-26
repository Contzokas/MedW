import { Lang } from "@/app/lib/translations"

const GREEK_TONOS_RE = /[άέήίόύώΆΈΉΊΌΎΏΐΰ]/g

const GREEK_TONOS_MAP: Record<string, string> = {
  ά: "α",
  έ: "ε",
  ή: "η",
  ί: "ι",
  ό: "ο",
  ύ: "υ",
  ώ: "ω",
  Ά: "Α",
  Έ: "Ε",
  Ή: "Η",
  Ί: "Ι",
  Ό: "Ο",
  Ύ: "Υ",
  Ώ: "Ω",
  ΐ: "ϊ",
  ΰ: "ϋ",
}

function stripGreekTonos(text: string): string {
  return text.replace(GREEK_TONOS_RE, (char) => GREEK_TONOS_MAP[char] ?? char)
}

export function toCaps(text: string, lang: Lang): string {
  if (lang === "el") {
    return stripGreekTonos(text).toLocaleUpperCase("el-GR")
  }

  return text.toLocaleUpperCase("en-US")
}
