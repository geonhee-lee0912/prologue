import { redactContacts } from './pseudonymize';
import { maskSensitive, type SensitiveCategory } from './sensitive-data';

export interface ScrubResult {
  text: string;
  categories: SensitiveCategory[];
}

/** 저장 전 정리 — 연락처를 지우고 민감정보를 가린다 (CLAUDE.md 10.1·10.2b) */
export function scrubForStorage(text: string): ScrubResult {
  const { masked, categories } = maskSensitive(redactContacts(text));
  return { text: masked, categories };
}
