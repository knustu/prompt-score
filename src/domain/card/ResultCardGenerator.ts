import type { PromptEvaluationResult, PromptShareSummary, SajuResult, TarotReading } from '../types';

const canvasText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number => {
  const words = [...text];
  let line = '';
  let lines = 0;
  for (const char of words) {
    const candidate = line + char;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = char;
      if (lines === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (lines < maxLines && line) {
    context.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines;
};

const baseCanvas = (title: string): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('카드 이미지를 만들 수 없습니다.');
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#17152e');
  gradient.addColorStop(1, '#5c3f93');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = '700 36px sans-serif';
  context.fillText('Prompt Score', 76, 88);
  context.font = '600 26px sans-serif';
  context.fillStyle = '#ddd5ff';
  context.fillText(title, 76, 136);
  return { canvas, context };
};

export const createPromptResultCard = (result: PromptEvaluationResult): HTMLCanvasElement => {
  const { canvas, context } = baseCanvas('AI 활용 능력 결과');
  context.fillStyle = '#ffffff';
  context.font = '800 180px sans-serif';
  context.fillText(String(result.overallScore), 76, 350);
  context.font = '600 34px sans-serif';
  context.fillText(`/ 100 · ${result.level}`, 80, 410);
  context.fillStyle = '#bfeee2';
  context.font = '700 30px sans-serif';
  context.fillText(result.styleLabel, 80, 468);
  context.fillStyle = '#ffffff';
  context.font = '700 30px sans-serif';
  context.fillText('강점', 76, 590);
  context.font = '500 26px sans-serif';
  result.strengths.slice(0, 3).forEach((item, index) => context.fillText(`• ${item.categoryName} ${item.score}점`, 84, 640 + index * 48));
  context.font = '700 30px sans-serif';
  context.fillText('다음 한 걸음', 76, 840);
  context.font = '500 26px sans-serif';
  canvasText(context, result.recommendations[0] ?? '조건과 검증 기준을 한 줄 추가해보세요.', 84, 890, 900, 38, 3);
  context.fillStyle = '#d9d2ee';
  context.font = '400 21px sans-serif';
  canvasText(context, '프롬프트 구조와 지시 품질을 규칙으로 평가한 결과입니다. 전문적 진단이 아닙니다.', 76, 1215, 920, 30, 3);
  return canvas;
};

export const createComparisonCard = (comparison: { a: PromptShareSummary; b: PromptShareSummary; totalMessage: string; largestDifferences: { label: string; message: string }[] }): HTMLCanvasElement => {
  const { canvas, context } = baseCanvas('친구와 프롬프트 비교');
  context.fillStyle = '#ffffff';
  context.font = '800 100px sans-serif';
  context.fillText(String(comparison.a.score), 76, 350);
  context.fillText(String(comparison.b.score), 610, 350);
  context.font = '500 28px sans-serif';
  context.fillText('사용자 A', 84, 400);
  context.fillText('사용자 B', 618, 400);
  context.font = '600 28px sans-serif';
  canvasText(context, comparison.totalMessage, 76, 520, 930, 38, 2);
  context.font = '700 30px sans-serif';
  context.fillText('가장 큰 차이', 76, 680);
  context.font = '500 25px sans-serif';
  comparison.largestDifferences.forEach((item, index) => canvasText(context, `• ${item.label}: ${item.message}`, 84, 730 + index * 65, 900, 32, 2));
  context.fillStyle = '#d9d2ee';
  context.font = '400 21px sans-serif';
  context.fillText('사람의 우열이 아니라 프롬프트 작성 방식의 차이를 비교합니다.', 76, 1215);
  return canvas;
};

export const createTarotCard = (reading: TarotReading): HTMLCanvasElement => {
  const { canvas, context } = baseCanvas(`${reading.categoryLabel} 타로 리딩`);
  context.fillStyle = '#ffffff';
  context.font = '800 52px sans-serif';
  context.fillText(reading.cards.map((item) => item.card.name.split(' ')[0]).join(' · '), 76, 330);
  context.font = '500 30px sans-serif';
  context.fillStyle = '#cdeee7';
  canvasText(context, reading.summary, 76, 410, 920, 42, 4);
  context.fillStyle = '#ffffff';
  context.font = '700 28px sans-serif';
  reading.cards.forEach((item, index) => context.fillText(`${item.position} · ${item.reversed ? '역방향' : '정방향'}`, 76, 640 + index * 70));
  context.fillStyle = '#d9d2ee';
  context.font = '400 21px sans-serif';
  canvasText(context, reading.disclaimer, 76, 1190, 920, 30, 4);
  return canvas;
};

export const createSajuResultCard = (result: SajuResult): HTMLCanvasElement => {
  const { canvas, context } = baseCanvas('사주 요약 리딩');
  context.fillStyle = '#ffffff';
  context.font = '800 52px sans-serif';
  context.fillText(result.persona?.title ?? '오행의 흐름', 76, 320);
  context.font = '500 30px sans-serif';
  context.fillStyle = '#d6ccef';
  canvasText(context, result.persona?.characteristics.slice(0, 2).join(' · ') ?? '간소화된 엔터테인먼트 리딩', 76, 370, 900, 38, 2);
  context.fillStyle = '#ffffff';
  context.font = '600 29px sans-serif';
  Object.entries(result.elements).forEach(([element, score], index) => context.fillText(`${element}  ${score}`, 84, 490 + index * 62));
  context.fillStyle = '#d9d2ee';
  context.font = '400 22px sans-serif';
  canvasText(context, result.interpretations.reflection, 76, 865, 900, 34, 4);
  canvasText(context, result.disclaimer, 76, 1135, 900, 30, 5);
  return canvas;
};

export const downloadCanvas = (canvas: HTMLCanvasElement, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const shareCanvas = async (canvas: HTMLCanvasElement, title: string, text: string): Promise<'shared' | 'downloaded'> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob && typeof navigator !== 'undefined' && 'share' in navigator) {
    const file = new File([blob], 'prompt-score.png', { type: 'image/png' });
    const canShareFiles = 'canShare' in navigator && navigator.canShare({ files: [file] });
    if (canShareFiles) {
      await navigator.share({ title, text, files: [file] });
      return 'shared';
    }
    await navigator.share({ title, text });
    return 'shared';
  }
  downloadCanvas(canvas, 'prompt-score-result.png');
  return 'downloaded';
};
