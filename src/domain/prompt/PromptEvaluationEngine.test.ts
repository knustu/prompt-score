import { describe, expect, it } from 'vitest';
import { evaluatePrompt } from './PromptEvaluationEngine';

describe('PromptEvaluationEngine', () => {
  it('scores each general category from Korean signals and structure', () => {
    const prompt = `너는 교육 전문가야.\n목표: 대학생을 위한 시험 공부 계획을 만들어줘.\n현재 상황: 수학과 영어를 공부하고 하루 2시간이 있어.\n대상: 초보자에게 친근하게 설명해줘.\n조건: 4주 이내, 하루 2시간 이하, 빠진 내용은 제외해줘.\n1. 먼저 과목별 우선순위를 정리\n2. 다음 주간 계획을 표로 제시\n예시: 월요일 수학 30분\n마지막에 체크리스트로 오류와 가정을 검토해줘.`;
    const result = evaluatePrompt(prompt, 'study-plan');
    expect(result.overallScore).toBeGreaterThan(50);
    expect(result.categories.goal.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.context.score).toBeGreaterThanOrEqual(40);
    expect(result.categories.audience.score).toBeGreaterThanOrEqual(40);
    expect(result.categories.constraints.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.role.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.output.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.examples.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.decomposition.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.verification.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.specificity.score).toBeGreaterThanOrEqual(40);
    expect(result.matchedRuleIds).toContain('goal.signals');
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('detects English signals as well as Korean signals', () => {
    const result = evaluatePrompt('You are an expert developer. Analyze the context and create a table with steps. Keep it within 300 words, include an example, and verify missing errors with a checklist.');
    expect(result.categories.role.score).toBeGreaterThanOrEqual(70);
    expect(result.categories.output.score).toBeGreaterThanOrEqual(40);
    expect(result.categories.constraints.score).toBeGreaterThanOrEqual(40);
    expect(result.categories.verification.score).toBeGreaterThanOrEqual(70);
  });

  it('handles empty, short, long, and precise prompts without unstable values', () => {
    const empty = evaluatePrompt('');
    expect(empty.overallScore).toBe(0);
    expect(empty.matchedRuleIds).toEqual([]);

    const shortPrecise = evaluatePrompt('3일 부산 여행을 표로 만들어줘. 예산 30만원.');
    expect(shortPrecise.overallScore).toBeGreaterThan(20);
    expect(shortPrecise.categories.goal.score).toBeGreaterThanOrEqual(40);
    expect(shortPrecise.categories.output.score).toBeGreaterThanOrEqual(40);

    const longPrompt = evaluatePrompt(`${'현재 상황과 배경을 자세히 설명합니다. '.repeat(80)}목표는 요약해줘.`);
    expect(longPrompt.overallScore).toBeGreaterThanOrEqual(0);
    expect(longPrompt.overallScore).toBeLessThanOrEqual(100);

    const first = evaluatePrompt(shortPrecise ? '목표: 표로 정리해줘. 예산 10만원.' : '');
    const second = evaluatePrompt('목표: 표로 정리해줘. 예산 10만원.');
    expect(first.overallScore).toBe(second.overallScore);
    expect(first.categories).toEqual(second.categories);
    expect(first.recommendations).toEqual(second.recommendations);
  });

  it('adds challenge relevance and selects deterministic strengths and weaknesses', () => {
    const relevant = evaluatePrompt('Python 3.12에서 error가 납니다. 실행 단계와 expected/actual 결과, 관련 code를 주고 fix와 checklist를 알려줘.', 'debug-code');
    const irrelevant = evaluatePrompt('좋은 글을 멋지게 써줘.', 'debug-code');
    expect(relevant.overallScore).toBeGreaterThan(irrelevant.overallScore);
    expect(relevant.challengeId).toBe('debug-code');
    expect(relevant.strengths).toHaveLength(3);
    expect(relevant.weaknesses).toHaveLength(3);
    expect(relevant.strengths[0].score).toBeGreaterThanOrEqual(relevant.strengths[1].score);
    expect(relevant.weaknesses[0].score).toBeLessThanOrEqual(relevant.weaknesses[1].score);
  });
});
