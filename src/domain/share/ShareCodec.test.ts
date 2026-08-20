import { describe, expect, it } from 'vitest';
import { decodeSharePayload, encodeSharePayload } from './ShareCodec';
import type { PromptShareSummary } from '../types';

const summary: PromptShareSummary = {
  v: 1,
  k: 'prompt',
  score: 72,
  level: '숙련',
  style: '구조화형 프롬프트 사용자',
  categories: [
    { id: 'goal', score: 80 }, { id: 'context', score: 60 }, { id: 'audience', score: 50 }, { id: 'constraints', score: 70 }, { id: 'role', score: 65 },
    { id: 'output', score: 80 }, { id: 'examples', score: 30 }, { id: 'decomposition', score: 75 }, { id: 'verification', score: 40 }, { id: 'specificity', score: 70 },
  ],
};

describe('ShareCodec', () => {
  it('encodes and decodes only minimum versioned summary data', () => {
    const encoded = encodeSharePayload(summary);
    expect(encoded.startsWith('ps1.')).toBe(true);
    expect(encoded).not.toContain('원문');
    expect(decodeSharePayload(encoded)).toEqual(summary);
  });

  it('rejects malformed and unsupported share codes', () => {
    expect(decodeSharePayload('')).toBeNull();
    expect(decodeSharePayload('ps1.not-valid-json')).toBeNull();
    expect(decodeSharePayload('ps2.eyJ2IjoyfQ')).toBeNull();
  });
});
