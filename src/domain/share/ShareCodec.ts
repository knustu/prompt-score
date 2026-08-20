import type { ComparisonSharePayload, PromptEvaluationResult, PromptShareSummary, SajuResult, SajuSharePayload, SharePayload, TarotCategory, TarotSharePayload } from '../types';
import { PROMPT_CATEGORY_IDS } from '../types';
import { toPromptShareSummary } from '../prompt/PromptEvaluationEngine';

const PREFIX = 'ps1.';

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

const base64ToBytes = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const encodeSharePayload = (payload: SharePayload): string => `${PREFIX}${bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)))}`;

const isPromptSummary = (payload: unknown): payload is PromptShareSummary => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<PromptShareSummary>;
  const categories = value.categories;
  const score = value.score;
  return value.v === 1 && value.k === 'prompt' && typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 && (value.level === '초급' || value.level === '성장 중' || value.level === '숙련' || value.level === '고급') && typeof value.style === 'string' && Array.isArray(categories) && categories.length === PROMPT_CATEGORY_IDS.length && categories.every((category) => PROMPT_CATEGORY_IDS.includes(category.id) && Number.isFinite(category.score) && category.score >= 0 && category.score <= 100);
};

const isTarotPayload = (payload: unknown): payload is TarotSharePayload => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<TarotSharePayload>;
  const seed = value.seed;
  return value.v === 1 && value.k === 'tarot' && typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && (value.spread === 1 || value.spread === 3) && ['general', 'love', 'study', 'career', 'money', 'decision'].includes(value.category ?? '');
};

const isSajuPayload = (payload: unknown): payload is SajuSharePayload => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<SajuSharePayload>;
  return value.v === 1 && value.k === 'saju' && !!value.elements && Object.values(value.elements).length === 5 && Object.values(value.elements).every((score) => Number.isFinite(score) && score >= 0) && typeof value.yinYang?.yin === 'number' && typeof value.yinYang?.yang === 'number' && value.yinYang.yin >= 0 && value.yinYang.yang >= 0 && typeof value.theme === 'string';
};

const isComparisonPayload = (payload: unknown): payload is ComparisonSharePayload => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<ComparisonSharePayload>;
  return value.v === 1 && value.k === 'compare' && isPromptSummary(value.a) && isPromptSummary(value.b);
};

export const decodeSharePayload = (encoded: string): SharePayload | null => {
  try {
    if (!encoded.startsWith(PREFIX)) return null;
    const payload: unknown = JSON.parse(new TextDecoder().decode(base64ToBytes(encoded.slice(PREFIX.length))));
    if (isPromptSummary(payload) || isTarotPayload(payload) || isSajuPayload(payload) || isComparisonPayload(payload)) return payload;
    return null;
  } catch {
    return null;
  }
};

export const createPromptShareCode = (result: PromptEvaluationResult): string => encodeSharePayload(toPromptShareSummary(result));

export const createTarotShareCode = (seed: number, spread: 1 | 3, category: TarotCategory): string => encodeSharePayload({ v: 1, k: 'tarot', seed: seed >>> 0, spread, category });

export const createSajuShareCode = (result: SajuResult): string => encodeSharePayload({ v: 1, k: 'saju', elements: result.elements, yinYang: result.yinYang, theme: result.interpretations.reflection });

export const createComparisonShareCode = (a: PromptShareSummary, b: PromptShareSummary): string => encodeSharePayload({ v: 1, k: 'compare', a, b });

export const shareUrl = (path: string, parameter: string, code: string): string => {
  const url = new URL(window.location.href);
  url.pathname = path;
  url.search = `${parameter}=${encodeURIComponent(code)}`;
  url.hash = '';
  return url.toString();
};
