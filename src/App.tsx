import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type FormEvent, type ReactNode, type ReactElement, type SetStateAction, type PointerEvent as HoloPointerEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { CHALLENGES, FREEFORM_CHALLENGE_ID, getChallenge } from './domain/prompt/ChallengeDefinitions';
import { PROMPT_CATEGORIES } from './domain/prompt/PromptRuleDefinitions';
import { evaluatePrompt, resultFromPromptShareSummary, toPromptShareSummary } from './domain/prompt/PromptEvaluationEngine';
import { comparePromptSummaries, type PromptComparison } from './domain/comparison/ComparisonEngine';
import { calculateSaju, defaultSajuInput, validateSajuInput } from './domain/saju/SajuEngine';
import { ELEMENT_GUIDANCE } from './domain/saju/SajuKnowledgeBase';
import { ELEMENT_COLORS, ELEMENT_LABELS, ELEMENT_ORDER } from './domain/saju/SajuRuleDefinitions';
import { createTarotSeed, drawTarot, drawTarotFromCards, drawTarotCompatibilityFromCards, TAROT_CATEGORY_LABELS, TAROT_DISCLAIMER } from './domain/tarot/TarotEngine';
import { TAROT_CARD_COUNT, TAROT_CARDS } from './domain/tarot/TarotCardData';
import { canConfirmTarotSelection, toggleTarotSelection } from './domain/tarot/TarotSelection';
import { createComparisonCard, createPromptResultCard, createSajuResultCard, createTarotCard, downloadCanvas, shareCanvas } from './domain/card/ResultCardGenerator';
import {
  createComparisonShareCode,
  createPromptShareCode,
  createSajuShareCode,
  createTarotShareCode,
  decodeSharePayload,
  encodeSharePayload,
  shareUrl,
} from './domain/share/ShareCodec';
import type {
  ComparisonSharePayload,
  FiveElement,
  PromptEvaluationResult,
  PromptShareSummary,
  SajuInput,
  SajuCompatibilitySummary,
  SajuEnergyWeatherItem,
  SajuEverydaySituation,
  SajuPersona,
  SajuQuestionPrompt,
  SajuResult,
  SajuReadingTopic,
  SajuSharePayload,
  SajuSituationContext,
  SajuTone,
  TarotCategory,
  TarotCard,
  TarotReading,
  TarotSharePayload,
} from './domain/types';

const STORAGE_KEYS = {
  prompt: 'prompt-score.prompt-result',
  tarot: 'prompt-score.tarot-reading',
  tarotCurrent: 'prompt-score.tarot-current',
  saju: 'prompt-score.saju-result',
} as const;

const GUIDE_STORAGE_KEY = 'prompt-score.guides-hidden';

const readStored = <T,>(key: string): T | undefined => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : undefined;
  } catch {
    return undefined;
  }
};

const writeStored = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is optional; the current screen still works without it.
  }
};

const clearStored = (): void => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};

const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
  }
};

const useRouter = (): { route: string; navigate: (path: string) => void } => {
  const [route, setRoute] = useState(() => `${window.location.pathname}${window.location.search}`);
  useEffect(() => {
    const handlePopState = (): void => setRoute(`${window.location.pathname}${window.location.search}`);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const navigate = (path: string): void => {
    window.history.pushState({}, '', path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return { route, navigate };
};

function App(): ReactElement {
  const { route, navigate } = useRouter();
  const [toast, setToast] = useState('');
  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };
  const path = route.split('?')[0] || '/';
  let page: ReactNode;
  if (path === '/evaluate') page = <EvaluatePage navigate={navigate} notify={notify} />;
  else if (path === '/results') page = <PromptResultPage navigate={navigate} notify={notify} />;
  else if (path === '/saju') page = <SajuPage navigate={navigate} notify={notify} />;
  else if (path === '/tarot') page = <TarotPage navigate={navigate} notify={notify} />;
  else if (path === '/detail/prompt') page = <PromptDetailPage navigate={navigate} />;
  else if (path === '/detail/saju') page = <SajuDetailPage navigate={navigate} />;
  else if (path === '/detail/tarot') page = <TarotDetailPage navigate={navigate} />;
  else if (path === '/compare') page = <ComparePage navigate={navigate} notify={notify} />;
  else page = <LandingPage navigate={navigate} />;

  return (
    <div className="app-shell">
      <div className="ambient-field" aria-hidden="true">
        <span className="ambient-orb orb-a" />
        <span className="ambient-orb orb-b" />
        <span className="ambient-grid" />
        <span className="ambient-scan" />
        <span className="ambient-particle particle-one" />
        <span className="ambient-particle particle-two" />
        <span className="ambient-particle particle-three" />
        <span className="ambient-particle particle-four" />
      </div>
      <Header navigate={navigate} path={path} />
      <main>{page}</main>
      <Footer navigate={navigate} notify={notify} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

type Navigate = (path: string) => void;
type Notify = (message: string) => void;

const SAJU_TOPIC_LABELS: Record<SajuReadingTopic, string> = {
  overall: '전체 구조',
  personality: '성향과 행동 패턴',
  career: '커리어와 일 환경',
  money: '돈과 사업 경향',
  relationships: '사랑·결혼·관계',
  familyPatterns: '가족 관계와 반복 패턴',
  healthLifestyle: '건강이 아닌 생활 리듬',
  futureTrends: '앞으로의 기회와 전환',
  daewoon: '대운 흐름',
  compatibility: '궁합과 상호작용',
  question: '내 질문',
};

const handleHoloPointerMove = (event: HoloPointerEvent<HTMLElement>): void => {
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  element.style.setProperty('--tilt-x', `${-y * 5}deg`);
  element.style.setProperty('--tilt-y', `${x * 5}deg`);
  element.style.setProperty('--glow-x', `${(x + 0.5) * 100}%`);
  element.style.setProperty('--glow-y', `${(y + 0.5) * 100}%`);
};

const resetHoloPointer = (event: HoloPointerEvent<HTMLElement>): void => {
  event.currentTarget.style.removeProperty('--tilt-x');
  event.currentTarget.style.removeProperty('--tilt-y');
};

function Header({ navigate, path }: { navigate: Navigate; path: string }): ReactElement {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate('/')} aria-label="Prompt Score 홈으로 이동">
        <span className="brand-mark">PS</span>
        <span>Prompt Score</span>
      </button>
      <nav className="main-nav" aria-label="주요 메뉴">
        <button className={path === '/evaluate' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/evaluate')}>프롬프트 평가</button>
        <button className={path === '/saju' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/saju')}>사주</button>
        <button className={path === '/tarot' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/tarot')}>타로</button>
        <button className={path === '/compare' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/compare')}>친구 비교</button>
      </nav>
    </header>
  );
}

function Footer({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const deleteData = (): void => {
    if (!window.confirm('이 브라우저에 저장된 Prompt Score 결과를 삭제할까요?')) return;
    clearStored();
    notify('로컬 결과를 삭제했습니다.');
  };
  return (
    <footer className="site-footer">
      <div>
        <strong>Prompt Score</strong>
        <p>프롬프트 구조를 규칙으로 살펴보는 가벼운 자기 점검</p>
      </div>
      <div className="footer-actions">
        <button className="text-button" onClick={() => navigate('/evaluate')}>프롬프트 평가</button>
        <button className="text-button" onClick={deleteData}>내 로컬 데이터 삭제</button>
      </div>
      <p className="footer-note">평가는 브라우저에서 결정적 규칙으로 실행되며, 원문 프롬프트를 서버로 전송하지 않습니다.</p>
    </footer>
  );
}

function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }): ReactElement {
  return (
    <div className="page-intro">
      {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  );
}

function Button({ children, onClick, secondary = false, type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; type?: 'button' | 'submit'; disabled?: boolean }): ReactElement {
  return <button type={type} className={secondary ? 'button secondary' : 'button'} onClick={onClick} disabled={disabled}>{children}</button>;
}

type GuideKind = 'prompt' | 'saju' | 'tarot';
type GuidePhase = 'input' | 'result' | 'more';
type GuideTarget = { kind: GuideKind; section: string; detail: string };

function SectionCard({ children, className = '', guideKind, guideSection, guideDetail }: { children: ReactNode; className?: string; guideKind?: GuideKind; guideSection?: string; guideDetail?: string }): ReactElement {
  return <section className={`section-card ${className}`} data-guide-kind={guideKind} data-guide-section={guideSection} data-guide-detail={guideDetail}>{children}</section>;
}

const GUIDE_COPY: Record<GuideKind, { title: string; label: string }> = {
  prompt: { title: '루미 · 학습 로봇', label: 'PROMPT GUIDE' },
  saju: { title: '연화 · 구름을 읽는 사람', label: 'SAJU GUIDE' },
  tarot: { title: '모르 · 별을 타는 안내자', label: 'TAROT GUIDE' },
};

const INITIAL_GUIDE_MESSAGE = '저를 이동시켜 상세설명을 받아보세요.';
const GUIDE_DETAIL_QUESTION = '상세설명을 받으시겠습니까?';

const GUIDE_ART: Record<GuideKind, string> = {
  prompt: '/images/guide-prompt.png',
  saju: '/images/guide-saju.png',
  tarot: '/images/guide-tarot.png',
};

const FALLBACK_TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Seoul', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];
const TIMEZONE_OPTIONS = Array.from(new Set(['UTC', ...((Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? FALLBACK_TIMEZONES)]));

type GuidePosition = { x: number; y: number; petWidth: number; petHeight: number; flip: boolean; bubbleBelow: boolean };

function centerGuidePosition(): GuidePosition {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
  const petWidth = viewportWidth < 620 ? 104 : 132;
  const petHeight = viewportWidth < 620 ? 148 : 188;
  const x = Math.max(12, (viewportWidth - petWidth) / 2);
  const y = Math.max(76, (viewportHeight - petHeight) / 2);

  return {
    x,
    y,
    petWidth,
    petHeight,
    flip: false,
    bubbleBelow: y < 170,
  };
}

function clampGuidePosition(position: GuidePosition): GuidePosition {
  const maxX = Math.max(8, window.innerWidth - position.petWidth - 8);
  const maxY = Math.max(8, window.innerHeight - position.petHeight - 8);
  const x = Math.min(Math.max(position.x, 8), maxX);
  const y = Math.min(Math.max(position.y, 8), maxY);
  return { ...position, x, y, flip: x + position.petWidth / 2 > window.innerWidth / 2, bubbleBelow: y < 170 };
}

function distanceToRect(x: number, y: number, rect: DOMRect): number {
  const horizontal = Math.max(rect.left - x, 0, x - rect.right);
  const vertical = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(horizontal, vertical);
}

function findClosestGuideTarget(kind: GuideKind, position: GuidePosition): GuideTarget | undefined {
  if (typeof document === 'undefined') return undefined;
  const centerX = position.x + position.petWidth / 2;
  const centerY = position.y + position.petHeight / 2;
  const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-guide-kind="${kind}"][data-guide-section][data-guide-detail]`));
  let closest: { target: GuideTarget; distance: number } | undefined;
  targets.forEach((element) => {
    const detail = element.dataset.guideDetail;
    const section = element.dataset.guideSection;
    if (!detail || !section) return;
    const distance = distanceToRect(centerX, centerY, element.getBoundingClientRect());
    if (!closest || distance < closest.distance) closest = { target: { kind, section, detail }, distance };
  });
  const threshold = Math.max(72, Math.min(120, Math.min(window.innerWidth, window.innerHeight) * .16));
  return closest && closest.distance <= threshold ? closest.target : undefined;
}

function GuideCharacter({ kind, active = true, onAction, onDetail }: { kind: GuideKind; phase?: GuidePhase; active?: boolean; onAction?: () => void; onDetail?: (target: GuideTarget) => void }): ReactElement | null {
  const [hidden, setHidden] = useState(() => typeof window !== 'undefined' && localStorage.getItem(GUIDE_STORAGE_KEY) === 'hidden');
  const [entered, setEntered] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [position, setPosition] = useState<GuidePosition>(() => centerGuidePosition());
  const [selectedTarget, setSelectedTarget] = useState<GuideTarget>();
  const latestPosition = useRef(position);
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number; moved: boolean } | undefined>(undefined);
  const suppressClick = useRef(false);
  const copy = GUIDE_COPY[kind];

  const updatePosition = (next: GuidePosition): void => {
    latestPosition.current = next;
    setPosition(next);
  };

  useEffect(() => {
    if (hidden || (!active && kind === 'prompt')) return undefined;
    const recenter = (): void => updatePosition(clampGuidePosition(latestPosition.current));
    recenter();
    setBubbleOpen(true);
    setSelectedTarget(undefined);
    setEntered(false);
    const timer = window.setTimeout(() => setEntered(true), 80);
    window.addEventListener('resize', recenter);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', recenter);
    };
  }, [active, hidden, kind]);

  if (!active) return null;
  const portal = (content: ReactElement): ReactElement => createPortal(content, document.body);
  if (hidden) {
    return portal(<div className="guide-reopen"><span>가이드가 꺼져 있어요.</span><button type="button" onClick={() => { localStorage.removeItem(GUIDE_STORAGE_KEY); setHidden(false); setEntered(false); }}>가이드 다시 보기</button></div>);
  }

  const hide = (): void => {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'hidden');
    setHidden(true);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    dragState.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
    suppressClick.current = false;
    setSelectedTarget(undefined);
    setBubbleOpen(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const current = latestPosition.current;
    const next = clampGuidePosition({ ...current, x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY });
    if (Math.hypot(next.x - current.x, next.y - current.y) > 3) drag.moved = true;
    updatePosition(next);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current = undefined;
    suppressClick.current = drag.moved;
    const target = drag.moved ? findClosestGuideTarget(kind, latestPosition.current) : undefined;
    setSelectedTarget(target);
    setBubbleOpen(true);
  };

  const positionStyle = {
    '--guide-x': `${position.x}px`,
    '--guide-y': `${position.y}px`,
    '--guide-center-x': `${position.x + position.petWidth / 2}px`,
    '--guide-pet-height': `${position.petHeight}px`,
    '--guide-flip': position.flip ? '-1' : '1',
  } as CSSProperties;

  return portal(
    <aside className={`guide-character guide-${kind} ${entered ? 'is-entered' : ''}`} aria-label={`${copy.title} 가이드`}>
      <button className={dragState.current ? 'guide-pet is-dragging' : 'guide-pet'} style={positionStyle} type="button" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onLostPointerCapture={handlePointerEnd} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setBubbleOpen((open) => !open); }} aria-label={`${copy.title} 가이드 ${selectedTarget ? '상세설명 열기' : bubbleOpen ? '말풍선 닫기' : '말풍선 열기'}`}>
        <span className="guide-shadow" aria-hidden="true" />
        <img className="guide-art" src={GUIDE_ART[kind]} alt="" />
      </button>
      {bubbleOpen && <div className={`guide-bubble ${position.bubbleBelow ? 'is-below' : ''}`} style={positionStyle} role="status" aria-live="polite">
        <span className="guide-label">{copy.label}</span>
        <strong>{copy.title}</strong>
        <p>{selectedTarget ? GUIDE_DETAIL_QUESTION : INITIAL_GUIDE_MESSAGE}</p>
        {selectedTarget && onDetail ? <button className="guide-action" type="button" onClick={() => onDetail(selectedTarget)}>상세설명</button> : onAction && <button className="guide-action" type="button" onClick={onAction}>다음 정보 보기 →</button>}
        <button className="guide-hide" type="button" onClick={hide}>× 가이드 숨기기</button>
      </div>}
    </aside>
  );
}

function LandingPage({ navigate }: { navigate: Navigate }): ReactElement {
  return (
    <div className="landing-page">
      <section className="hero page-wrap">
        <div className="hero-copy">
          <h1>잘 묻는 힘을<br /><em>점수로 발견해보세요.</em></h1>
          <p className="hero-lead">Prompt Score는 프롬프트의 목표, 맥락, 형식, 검증 구조를 결정적 규칙으로 살펴봅니다. AI의 답변이 아니라 <strong>AI에게 일을 맡기는 방식</strong>을 확인해요.</p>
          <div className="hero-actions">
            <Button onClick={() => navigate('/evaluate')}>AI 활용 능력 평가하기 <span>→</span></Button>
            <button className="ghost-button" onClick={() => navigate('/compare')}>친구와 비교하기</button>
          </div>
          <div className="hero-trust"><span>●</span> AI API 없이 브라우저에서 계산 <span>●</span> 원문 프롬프트 서버 전송 없음</div>
        </div>
        <div className="hero-art holo-stage" aria-label="프롬프트 점수 미리보기">
          <div className="floating-chip chip-one">목표 명확성 <strong>88</strong></div>
          <div className="score-orbit"><div className="orbit-dot" /><span>오늘의<br /><b>Prompt</b></span><strong>78</strong><small>/100</small></div>
          <div className="floating-chip chip-two">구조화형 프롬프트 사용자</div>
          <div className="hero-spark spark-one">✦</div><div className="hero-spark spark-two">✦</div>
        </div>
      </section>

      <section className="page-wrap feature-section">
        <div className="section-heading"><h2>오늘은 어떤 걸 해볼까요?</h2></div>
        <div className="feature-grid">
          <FeatureCard icon="✦" title="AI 활용 능력 평가" description="내 프롬프트가 어떤 부분에서 강하고, 어디를 보완하면 좋은지 확인해요." action="평가 시작하기" tone="lavender" onClick={() => navigate('/evaluate')} />
          <FeatureCard icon="☯" title="사주 보기" description="간소화된 규칙 기반 사주로 오늘의 성찰 키워드를 가볍게 만나보세요." action="사주 보기" tone="peach" onClick={() => navigate('/saju')} />
          <FeatureCard icon="✧" title="타로 보기" description="한 장 또는 세 장을 뽑고, 같은 시드로 언제든 결과를 다시 확인해요." action="타로 뽑기" tone="mint" onClick={() => navigate('/tarot')} />
        </div>
      </section>

      <section className="page-wrap method-section">
        <div className="method-copy"><h2>결과는 투명하게,<br />해석은 가볍게.</h2><p>키워드, 문장 구조, 번호 목록, 숫자 제약, 출력 형식과 검증 표현을 조합해 점수를 계산합니다. 생성형 AI나 심리 분석은 사용하지 않아요.</p></div>
        <div className="method-steps">
          <Step number="01" title="프롬프트 작성" text="다섯 가지 챌린지 또는 자유 입력으로 시작해요." />
          <Step number="02" title="규칙 기반 분석" text="10개 카테고리의 신호를 같은 방식으로 계산해요." />
          <Step number="03" title="결과 공유" text="원문 없이 요약 점수만 친구와 비교할 수 있어요." />
        </div>
      </section>

      <section className="page-wrap disclaimer-grid">
        <div className="disclaimer-card"><span>ⓘ</span><div><strong>프롬프트 결과 안내</strong><p>이 결과는 프롬프트 구조와 지시 품질을 평가합니다. AI가 최종적으로 만든 답변의 품질을 평가하지 않으며, 전문적인 심리 진단이 아닙니다.</p></div></div>
        <div className="disclaimer-card"><span>☼</span><div><strong>사주·타로 안내</strong><p>사주와 타로는 오락과 자기 성찰을 위한 콘텐츠입니다. 확정적인 예언이나 의료·법률·재정·진로 조언이 아닙니다.</p></div></div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, action, tone, onClick }: { icon: string; title: string; description: string; action: string; tone: string; onClick: () => void }): ReactElement {
  return <button className={`feature-card ${tone}`} onClick={onClick} onPointerMove={handleHoloPointerMove} onPointerLeave={resetHoloPointer}><span className="feature-icon">{icon}</span><h3>{title}</h3><p>{description}</p><span className="card-action">{action} <b>↗</b></span></button>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }): ReactElement {
  return <div className="step"><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>;
}

function PromptLabBanner(): ReactElement {
  return <section className="prompt-lab-banner" aria-label="AI 학습 분석실">
    <div className="lab-copy"><span className="lab-kicker">AI LEARNING LAB · LOOP 07</span><h2>질문을 데이터로 바꾸는<br /><em>학습 루프</em></h2><p>입력 → 구조 감지 → 피드백. 프롬프트를 한 번 더 다듬을 때마다 AI와 협업하는 감각이 선명해져요.</p></div>
    <div className="lab-monitor" aria-hidden="true"><div className="monitor-top"><span>NEURAL TRACE</span><b>SYNC 98.4%</b></div><div className="lab-bars"><i /><i /><i /><i /><i /></div><div className="lab-table"><span>목표</span><b>88</b><span>맥락</span><b>72</b><span>출력</span><b>64</b></div><div className="monitor-cursor" /></div>
  </section>;
}

function EvaluatePage({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const challenge = getChallenge(challengeId);
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (prompt.trim().length < 3) {
      setError('프롬프트를 세 글자 이상 입력해주세요.');
      return;
    }
    const result = evaluatePrompt(prompt, challengeId === FREEFORM_CHALLENGE_ID ? undefined : challengeId);
    writeStored(STORAGE_KEYS.prompt, result);
    setError('');
    notify('브라우저에서 규칙 분석을 완료했습니다.');
    navigate('/results');
  };
  return (
    <div className="page-wrap page-content evaluate-page">
      <PageIntro eyebrow="Prompt check" title="내 프롬프트, 어디까지 구체적일까?" description="챌린지를 고르거나 자유롭게 입력해보세요. 원문은 브라우저 밖으로 나가지 않습니다.">
        <div className="privacy-pill"><span>✓</span> 로컬 규칙 엔진 · AI API 없음</div>
      </PageIntro>
      <PromptLabBanner />
      <GuideCharacter kind="prompt" phase="input" />
      <form onSubmit={submit} className="evaluate-layout">
        <div className="evaluate-main">
          <SectionCard>
            <div className="card-kicker">STEP 01 · 챌린지 선택</div>
            <h2>어떤 일을 시켜볼까요?</h2>
            <div className="challenge-grid">
              {CHALLENGES.map((item) => <button key={item.id} type="button" className={challengeId === item.id ? 'challenge-option selected' : 'challenge-option'} onClick={() => setChallengeId(item.id)}><span>{item.emoji}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}
              <button type="button" className={challengeId === FREEFORM_CHALLENGE_ID ? 'challenge-option freeform selected' : 'challenge-option freeform'} onClick={() => setChallengeId(FREEFORM_CHALLENGE_ID)}><span>✎</span><strong>자유 입력</strong><small>정해진 문제 없이 내 작업을 평가해요.</small></button>
            </div>
          </SectionCard>
          {challenge && <SectionCard className="problem-card"><div className="card-kicker">STEP 02 · 문제 확인</div><div className="problem-heading"><span>{challenge.emoji}</span><div><h2>{challenge.title}</h2><p>{challenge.description}</p></div></div><div className="problem-box"><strong>추천 기준</strong><div className="tag-list">{challenge.criteria.map((item) => <span key={item}>{item}</span>)}</div></div></SectionCard>}
          <SectionCard className="prompt-card"><div className="card-kicker">STEP 03 · 내 프롬프트</div><div className="prompt-heading"><h2>이렇게 요청해보세요</h2><span>{prompt.length}자</span></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={challenge ? '문제에 대한 나만의 프롬프트를 써보세요…\n\n예: 현재 상황, 원하는 결과, 지켜야 할 조건을 함께 적어보세요.' : 'AI에게 시키고 싶은 일을 자유롭게 적어보세요…'} aria-label="평가할 프롬프트" />{challenge && <div className="example-row"><button type="button" onClick={() => setPrompt(challenge.strongPrompt)}>강한 예시 보기</button><button type="button" onClick={() => setPrompt(challenge.weakPrompt)}>짧은 예시 보기</button></div>}{error && <p className="error-text">{error}</p>}<div className="submit-row"><span>한국어·English 모두 가능</span><Button type="submit">프롬프트 평가하기 <span>→</span></Button></div></SectionCard>
        </div>
        <aside className="evaluate-aside"><SectionCard className="aside-tip"><span className="tip-icon">✦</span><h3>좋은 프롬프트 힌트</h3><ul><li>원하는 결과를 동사로 말하기</li><li>상황·대상·제약을 알려주기</li><li>출력 형식과 검증 기준 정하기</li></ul></SectionCard><SectionCard className="aside-safety"><strong>데이터 안내</strong><p>작성한 원문은 공유 링크에 포함되지 않습니다. 결과 요약만 선택적으로 공유할 수 있어요.</p></SectionCard></aside>
      </form>
    </div>
  );
}

function ScoreHeader({ score, level, styleLabel, shared = false }: { score: number; level: string; styleLabel: string; shared?: boolean }): ReactElement {
  return <div className="score-header"><div className="score-ring" style={{ '--score': `${score * 3.6}deg` } as CSSProperties}><div><strong>{score}</strong><span>/ 100</span></div></div><div><span className="eyebrow">{shared ? 'Shared result' : 'Your prompt score'}</span><h2>{level} 단계</h2><p className="style-label">{styleLabel}</p><p className="muted">프롬프트 구조와 지시 품질을 규칙으로 평가한 결과입니다.</p></div></div>;
}

function PromptResultPage({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const payload = query.get('share') ? decodeSharePayload(query.get('share') ?? '') : null;
  const sharedSummary = payload?.k === 'prompt' ? payload : undefined;
  const stored = readStored<PromptEvaluationResult>(STORAGE_KEYS.prompt);
  const result = sharedSummary ? resultFromPromptShareSummary(sharedSummary) : stored;
  const [shareStatus, setShareStatus] = useState('');
  if (!result) return <EmptyState title="아직 평가 결과가 없어요" text="프롬프트를 하나 작성하고 나만의 점수를 만들어보세요." button="평가 시작하기" onClick={() => navigate('/evaluate')} />;
  const code = createPromptShareCode(result);
  const url = shareUrl('/results', 'share', code);
  const compareUrl = `/compare?mine=${encodeURIComponent(code)}`;
  const detailUrl = (section: string): string => `/detail/prompt?section=${encodeURIComponent(section)}${sharedSummary ? `&share=${encodeURIComponent(query.get('share') ?? '')}` : ''}`;
  const handleShare = async (): Promise<void> => { const copied = await copyText(url); setShareStatus(copied ? '공유 링크를 복사했어요.' : '링크 복사에 실패했어요.'); notify(copied ? '공유 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const handleCard = async (): Promise<void> => { const canvas = createPromptResultCard(result); const outcome = await shareCanvas(canvas, 'Prompt Score 결과', `내 프롬프트 점수는 ${result.overallScore}점입니다.`); setShareStatus(outcome === 'shared' ? '공유 시트를 열었어요.' : 'PNG를 저장했어요.'); };
  const handleDownload = (): void => { downloadCanvas(createPromptResultCard(result), 'prompt-score-result.png'); notify('결과 카드를 PNG로 저장했습니다.'); };
  return (
    <div className="page-wrap page-content result-page prompt-result-page">
      <PageIntro eyebrow={sharedSummary ? 'Shared prompt result' : 'Prompt result'} title="내 프롬프트 사용 설명서" description={sharedSummary ? '공유된 요약 결과입니다. 원문 프롬프트와 개인정보는 포함하지 않았어요.' : '점수보다 중요한 건, 다음 프롬프트에서 바로 바꿔볼 한 가지예요.'} />
      <GuideCharacter kind="prompt" phase="result" onDetail={(target) => navigate(target.detail)} />
      <SectionCard className="result-hero-card" guideKind="prompt" guideSection="score-summary" guideDetail={detailUrl('score-summary')}><ScoreHeader score={result.overallScore} level={result.level} styleLabel={result.styleLabel} shared={Boolean(sharedSummary)} /><div className="result-actions"><Button onClick={handleShare}>↗ 공유 링크 복사</Button><Button secondary onClick={handleCard}>▣ 결과 카드 만들기</Button><Button secondary onClick={handleDownload}>↓ PNG 저장</Button></div>{shareStatus && <p className="success-text">{shareStatus}</p>}</SectionCard>
      <SectionCard guideKind="prompt" guideSection="category-score" guideDetail={detailUrl('category-score')}><div className="section-title-row"><div><span className="card-kicker">10 CATEGORIES</span><h2>프롬프트 구조 점수</h2></div><span className="small-note">강함 70 · 부분적 40 · 약함 0</span></div><ScoreBars result={result} detailUrl={detailUrl} /><PromptSignalTable result={result} /><CategoryDetails result={result} shared={Boolean(sharedSummary)} /></SectionCard>
      <div className="result-two-col"><SectionCard><div className="card-kicker">TOP 3 · STRENGTHS</div><h2>잘하고 있는 점</h2><FeedbackItems items={result.strengths} strength /></SectionCard><SectionCard guideKind="prompt" guideSection="improvements" guideDetail={detailUrl('improvements')}><div className="card-kicker">TOP 3 · GROWTH</div><h2>다음에 보완할 점</h2><FeedbackItems items={result.weaknesses} /></SectionCard></div>
      <div className="result-two-col"><SectionCard guideKind="prompt" guideSection="evidence" guideDetail={detailUrl('evidence')}><div className="card-kicker">EVIDENCE</div><h2>감지된 근거</h2>{sharedSummary ? <p className="muted">공유 결과에는 원문과 근거 문장이 포함되지 않습니다. 내 브라우저에서 만든 결과를 확인하면 더 자세히 볼 수 있어요.</p> : result.evidence.length ? <div className="evidence-list">{result.evidence.slice(0, 10).map((item, index) => <div className="evidence-item" key={`${item.ruleId}-${index}`}><span>{item.signal}</span><p>{item.text}</p></div>)}</div> : <p className="muted">아직 감지된 신호가 없습니다.</p>}</SectionCard><SectionCard guideKind="prompt" guideSection="suggestions" guideDetail={detailUrl('suggestions')}><div className="card-kicker">NEXT ACTIONS</div><h2>추천 한 걸음</h2><ol className="recommendation-list">{result.recommendations.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>{result.missingElements.length > 0 && <><div className="mini-divider" /><strong className="subheading">빠진 요소</strong><div className="missing-list">{result.missingElements.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div></>}</SectionCard></div>
      <SectionCard className="result-notice"><span>ⓘ</span><div><strong>이 결과가 평가하는 것</strong><p>이 결과는 프롬프트 구조와 지시 품질을 평가합니다. <b>AI의 최종 답변 품질은 평가하지 않습니다.</b></p></div></SectionCard>
      <div className="bottom-cta"><Button onClick={() => navigate('/evaluate')}>다른 프롬프트도 평가하기</Button><Button secondary onClick={() => navigate(compareUrl)}>친구와 비교하기</Button></div>
    </div>
  );
}

function ScoreBars({ result, detailUrl }: { result: PromptEvaluationResult; detailUrl?: (section: string) => string }): ReactElement {
  return <div className="score-bars">{PROMPT_CATEGORIES.map((category) => { const item = result.categories[category.id]; return <div className="score-bar-row" data-guide-kind={detailUrl ? 'prompt' : undefined} data-guide-section={detailUrl ? `category-${category.id}` : undefined} data-guide-detail={detailUrl ? detailUrl(`category-${category.id}`) : undefined} key={category.id}><div className="bar-label"><span>{category.label}</span><b>{item.score}</b></div><div className="bar-track"><span style={{ width: `${item.score}%` }} className={item.score >= 70 ? 'strong' : item.score >= 40 ? 'partial' : 'weak'} /></div></div>; })}</div>;
}

function PromptSignalTable({ result }: { result: PromptEvaluationResult }): ReactElement {
  return <div className="prompt-signal-table" role="table" aria-label="프롬프트 신호 표">
    <div className="signal-row signal-head" role="row"><span>신호</span><span>점수</span><span>상태</span></div>
    {PROMPT_CATEGORIES.slice(0, 6).map((category) => {
      const item = result.categories[category.id];
      const state = item.score >= 70 ? '강함' : item.score >= 40 ? '부분적' : '보완';
      return <div className="signal-row" role="row" key={category.id}><span>{item.categoryName}</span><b>{item.score}</b><em className={item.score >= 70 ? 'strong' : item.score >= 40 ? 'partial' : 'weak'}>{state}</em></div>;
    })}
  </div>;
}

function CategoryDetails({ result, shared }: { result: PromptEvaluationResult; shared: boolean }): ReactElement {
  return <div className="category-details">{PROMPT_CATEGORIES.map((category) => { const item = result.categories[category.id]; return <details key={category.id}><summary><span>{item.categoryName}</span><b>{item.score} · {item.level}</b></summary><div><p>{item.why}</p>{shared ? <p className="muted">공유 요약에는 원문 근거를 포함하지 않습니다.</p> : item.evidence.length ? <ul>{item.evidence.slice(0, 3).map((evidence, index) => <li key={`${evidence.ruleId}-${index}`}>{evidence.signal} · {evidence.text}</li>)}</ul> : <p className="muted">감지된 직접 근거가 없습니다.</p>}<small>TIP · {item.tip}</small></div></details>; })}</div>;
}

function FeedbackItems({ items, strength = false }: { items: PromptEvaluationResult['strengths']; strength?: boolean }): ReactElement {
  return <div className="feedback-items">{items.map((item) => <div className={strength ? 'feedback-item strength' : 'feedback-item'} key={item.categoryId}><div className="feedback-heading"><span>{strength ? '✦' : '△'}</span><strong>{item.categoryName}</strong><b>{item.score}</b></div><p>{item.why}</p><small>TIP · {item.tip}</small></div>)}</div>;
}

function SajuPage({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const sharePayload = query.get('share') ? decodeSharePayload(query.get('share') ?? '') : null;
  const [input, setInput] = useState<SajuInput>(defaultSajuInput);
  const [result, setResult] = useState<SajuResult | undefined>(() => readStored<SajuResult>(STORAGE_KEYS.saju));
  const [tone, setTone] = useState<SajuTone>('professional');
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    if (sharePayload?.k === 'saju') setResult(resultFromSajuShare(sharePayload));
  }, []);
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const validation = validateSajuInput(input);
    if (!validation.valid) { setError(validation.message ?? '입력을 확인해주세요.'); return; }
    try { const calculated = calculateSaju(input); setResult(calculated); setShowMore(false); writeStored(STORAGE_KEYS.saju, calculated); setError(''); notify('사주 흐름을 준비했습니다.'); } catch (caught) { setError(caught instanceof Error ? caught.message : '사주 계산에 실패했습니다.'); }
  };
  const share = result ? shareUrl('/saju', 'share', createSajuShareCode(result)) : '';
  const detailUrl = (section: string): string => `/detail/saju?section=${encodeURIComponent(section)}${sharePayload?.k === 'saju' ? `&share=${encodeURIComponent(query.get('share') ?? '')}` : ''}`;
  const copyShare = async (): Promise<void> => { if (!share) return; const ok = await copyText(share); notify(ok ? '사주 요약 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const saveCard = (): void => { if (!result) return; downloadCanvas(createSajuResultCard(result), 'prompt-score-saju.png'); notify('사주 카드를 PNG로 저장했습니다.'); };
  return (
    <div className="page-wrap page-content saju-page">
      <section className="saju-moon-hero" aria-label="사주 분석 안내">
        <div className="saju-moon-copy">
          <span className="saju-hero-kicker">命理 · DATA CONSTELLATION</span>
          <h1>달빛 아래,<br /><em>나의 네 기둥을 읽다</em></h1>
          <p>사주의 원리를 현대적인 화면으로 정리합니다. 오행의 균형과 시기의 흐름을 차분히 살펴보세요.</p>
          <div className="saju-hero-tags"><span>음양오행</span><span>사주팔자</span><span>대운·세운</span></div>
        </div>
      </section>
      <PageIntro title="사주를 구조적으로 읽어볼까요?" description="출생 정보와 원하는 주제를 바탕으로 오행의 흐름, 시기, 해석을 차분히 살펴봅니다."><div className="privacy-pill warm"><span>☼</span> 입력은 이 브라우저에만 저장됩니다</div></PageIntro>
      <GuideCharacter kind="saju" phase={result ? (showMore ? 'more' : 'result') : 'input'} onAction={result && !showMore ? () => setShowMore(true) : undefined} onDetail={(target) => navigate(target.detail)} />
      <div className="saju-layout">
        <SectionCard>
          <form onSubmit={submit} className="saju-form">
            <div className="card-kicker">BIRTH INFORMATION</div>
            <h2>기본 정보를 입력해주세요</h2>
            <p className="field-note">출생지는 표시용으로 사용합니다. 도시·국가와 현지 시간대를 정확히 입력해주세요.</p>
            <label>생년월일<input type="date" value={input.birthDate} onChange={(event) => setInput({ ...input, birthDate: event.target.value })} /></label>
            <div className="field-row"><label>달력<select value={input.calendar} onChange={(event) => setInput({ ...input, calendar: event.target.value as SajuInput['calendar'] })}><option value="solar">양력</option><option value="lunar">음력</option></select></label><label>성별(대운 선택 시)<select value={input.gender} onChange={(event) => setInput({ ...input, gender: event.target.value as SajuInput['gender'] })}><option value="unspecified">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label></div>
            {input.calendar === 'lunar' && <label className="check-label"><input type="checkbox" checked={input.leapMonth} onChange={(event) => setInput({ ...input, leapMonth: event.target.checked })} /> 윤달로 입력</label>}
            <label className="time-label">출생 시간<div className="time-row"><input type="time" value={input.birthTime} disabled={input.timeUnknown} onChange={(event) => setInput({ ...input, birthTime: event.target.value })} /><label className="check-label"><input type="checkbox" checked={input.timeUnknown} onChange={(event) => setInput({ ...input, timeUnknown: event.target.checked })} /> 시간 모름</label></div></label>
            <div className="field-row"><label>출생지<input value={input.birthPlace} onChange={(event) => setInput({ ...input, birthPlace: event.target.value })} placeholder="예: Toronto, Canada" /></label><label>시간대<input list="saju-timezones" value={input.timezone} onChange={(event) => setInput({ ...input, timezone: event.target.value })} placeholder="예: America/Toronto" /></label></div>
            <datalist id="saju-timezones">{TIMEZONE_OPTIONS.map((timezone) => <option value={timezone} key={timezone} />)}</datalist>
            <label>서머타임<select value={input.daylightSaving} onChange={(event) => setInput({ ...input, daylightSaving: event.target.value as SajuInput['daylightSaving'] })}><option value="auto">시간대 규칙 자동</option><option value="standard">표준시로 고정</option><option value="daylight">서머타임으로 고정</option></select></label>
            <label>읽고 싶은 주제<select value={input.topic} onChange={(event) => setInput({ ...input, topic: event.target.value as SajuReadingTopic })}>{Object.entries(SAJU_TOPIC_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            <label>리딩 톤<select value={tone} onChange={(event) => setTone(event.target.value as SajuTone)}><option value="professional">전문적</option><option value="warm">따뜻하게</option><option value="light">가볍게</option><option value="practical">실용적으로</option></select></label>
            <p className="field-note">리딩 톤은 같은 결과를 더 편한 방식으로 읽도록 표현만 조정합니다.</p>
            {input.topic === 'compatibility' && input.compatibility && <div className="compatibility-fields"><h3>상대 정보</h3><p className="field-note">상대방의 동의와 정확한 정보를 확인한 뒤 입력해주세요.</p><label>상대 생년월일<input type="date" value={input.compatibility.birthDate} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, birthDate: event.target.value } })} /></label><div className="field-row"><label>상대 달력<select value={input.compatibility.calendar} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, calendar: event.target.value as SajuInput['calendar'] } })}><option value="solar">양력</option><option value="lunar">음력</option></select></label><label>상대 시간대<input value={input.compatibility.timezone} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, timezone: event.target.value } })} placeholder="Asia/Seoul" /></label></div>{input.compatibility.calendar === 'lunar' && <label className="check-label"><input type="checkbox" checked={input.compatibility.leapMonth} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, leapMonth: event.target.checked } })} /> 상대 윤달로 입력</label>}<div className="field-row"><label>상대 성별<select value={input.compatibility.gender} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, gender: event.target.value as SajuInput['gender'] } })}><option value="unspecified">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label><label>상대 서머타임<select value={input.compatibility.daylightSaving} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, daylightSaving: event.target.value as SajuInput['daylightSaving'] } })}><option value="auto">시간대 규칙 자동</option><option value="standard">표준시로 고정</option><option value="daylight">서머타임으로 고정</option></select></label></div><label className="time-label">상대 출생 시간<div className="time-row"><input type="time" value={input.compatibility.birthTime} disabled={input.compatibility.timeUnknown} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, birthTime: event.target.value } })} /><label className="check-label"><input type="checkbox" checked={input.compatibility.timeUnknown} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, timeUnknown: event.target.checked } })} /> 시간 모름</label></div></label><label>상대 출생지<input value={input.compatibility.birthPlace} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, birthPlace: event.target.value } })} placeholder="서울, 대한민국" /></label></div>}
            <label>구체적인 질문(선택)<textarea className="saju-question" value={input.question} onChange={(event) => setInput({ ...input, question: event.target.value })} placeholder="예: 다음 분기에 일하는 방식을 어떻게 점검하면 좋을까요?" /></label>
            <details className="saju-context"><summary>가족·개인 배경 추가(선택)</summary><p className="field-note">직접 적은 내용만 참고합니다. 가족·유전·의료 사실은 차트로 추론하지 않습니다.</p><label>가족 맥락<textarea value={input.background.family} onChange={(event) => setInput({ ...input, background: { ...input.background, family: event.target.value } })} placeholder="직접 경험한 대화, 역할, 거리감 등을 적어주세요." /></label><label>개인 맥락<textarea value={input.background.personal} onChange={(event) => setInput({ ...input, background: { ...input.background, personal: event.target.value } })} placeholder="현재 고민이나 생활 맥락을 적어주세요." /></label></details>
            {input.calendar === 'lunar' && <p className="field-note">음력은 2020~2035년의 번들 앵커와 평균 삭망월을 사용하는 간소화 변환입니다.</p>}
            <label className="check-label consent-check"><input type="checkbox" checked={input.consent} onChange={(event) => setInput({ ...input, consent: event.target.checked })} /> 계산·결과 저장 및 오락·자기성찰 목적 사용에 동의합니다.</label>
            {error && <p className="error-text">{error}</p>}
            <Button type="submit">사주 계산하기 <span>→</span></Button>
          </form>
        </SectionCard>
        <SajuResult result={result} share={share} onCopy={copyShare} onCard={saveCard} tone={tone} onFeedback={notify} showMore={showMore} onShowMore={() => setShowMore(true)} detailUrl={detailUrl} />
      </div>
    </div>
  );
}

function resultFromSajuShare(payload: SajuSharePayload): SajuResult {
  return { version: 'saju-v1', inputSummary: '공유된 사주 요약 결과', simplified: true, calendarNote: '공유 링크에는 생년월일·출생 시간·지역을 포함하지 않습니다.', pillars: [], elements: payload.elements, yinYang: payload.yinYang, interpretations: { general: payload.theme, study: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', career: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', money: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', relationship: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', compatibility: '서로 다른 관점을 존중하며 기대치를 맞춰보세요.', reflection: payload.theme, future: '미래를 단정하지 않고 현재의 행동을 관찰해보세요.' }, disclaimer: '사주 결과는 오락과 자기 성찰을 위한 참고용입니다. 재정·교육·의료·진로·관계 결정을 위한 유일한 근거로 사용하지 마세요.' };
}

function SajuResult({ result, share, onCopy, onCard, tone, onFeedback, showMore, onShowMore, detailUrl }: { result?: SajuResult; share: string; onCopy: () => void; onCard: () => void; tone: SajuTone; onFeedback: Notify; showMore: boolean; onShowMore: () => void; detailUrl: (section: string) => string }): ReactElement {
  if (!result) return <EmptyState title="아직 사주 결과가 없어요" text="왼쪽 정보를 입력하면 오행과 성찰 키워드를 확인할 수 있어요." />;
  const maxElement = Math.max(...ELEMENT_ORDER.map((element) => result.elements[element]), 1);
  const tabs: Array<[keyof SajuResult['interpretations'], string]> = [['general', '종합'], ['study', '학습'], ['career', '커리어'], ['money', '금전'], ['relationship', '관계'], ['compatibility', '궁합'], ['reflection', '성찰'], ['future', '앞으로']];
  const hasAdvancedResult = Boolean(result.chart);
  return <div className="saju-result-column">
    <SectionCard className="saju-summary" guideKind="saju" guideSection="five-elements" guideDetail={detailUrl('five-elements')}>
      <div className="section-title-row"><div><span className="card-kicker">YOUR SAJU SNAPSHOT</span><h2>오행의 흐름</h2></div>{share && <button className="icon-action" onClick={onCopy}>↗</button>}</div>
      <p className="muted">{result.inputSummary}</p>
      <div className="saju-element-dashboard">
        <ElementConstellation />
        <div className="element-bars">{ELEMENT_ORDER.map((element) => <div className="element-row" key={element}><span style={{ color: ELEMENT_COLORS[element] }}>{ELEMENT_LABELS[element]}</span><div className="bar-track"><span style={{ width: `${(result.elements[element] / maxElement) * 100}%`, background: ELEMENT_COLORS[element] }} /></div><b>{result.elements[element]}</b></div>)}</div>
      </div>
      <div className="yin-yang"><span>음 {result.yinYang.yin}</span><div><i style={{ width: `${(result.yinYang.yin / Math.max(result.yinYang.yin + result.yinYang.yang, 1)) * 100}%` }} /><b style={{ width: `${(result.yinYang.yang / Math.max(result.yinYang.yin + result.yinYang.yang, 1)) * 100}%` }} /></div><span>양 {result.yinYang.yang}</span></div>
      <SajuElementGuidance elements={result.elements} maxElement={maxElement} detailUrl={detailUrl} />
      <div className="result-actions compact"><Button secondary onClick={onCopy}>↗ 요약 링크</Button><Button secondary onClick={onCard}>↓ 카드 저장</Button></div>
    </SectionCard>
    {hasAdvancedResult && <SajuTimingCard chart={result.chart!} detailUrl={detailUrl} />}
    {hasAdvancedResult && !showMore && <SajuNextStep onNext={onShowMore} />}
    {(!hasAdvancedResult || showMore) && <>
      {result.compatibility?.primaryGrowthStage && <SajuCompatibilityCard compatibility={result.compatibility} />}
      {result.persona && <SajuPersonaCard persona={result.persona} result={result} tone={tone} />}
      {result.everydaySituations && <SajuEverydaySituations situations={result.everydaySituations} result={result} />}
      {result.questionPrompts && <SajuQuestionPrompts prompts={result.questionPrompts} result={result} />}
      {result.energyWeather && <SajuEnergyWeather weather={result.energyWeather} result={result} />}
      <SectionCard guideKind="saju" guideSection="four-pillars" guideDetail={detailUrl('four-pillars')}><div className="card-kicker">FOUR PILLARS</div><h2>사주 네 기둥</h2>{result.pillars.length ? <div className="pillars-table">{result.pillars.map((pillar) => <div className={!pillar.known ? 'pillar-row unknown' : 'pillar-row'} key={pillar.name}><span>{pillar.name}</span><strong>{pillar.known ? `${pillar.stem}${pillar.branch}` : '미상'}</strong><small>{pillar.known ? `${pillar.stemElement} · ${pillar.branchElement} · ${pillar.yinYang}` : '출생 시간 미상'}</small></div>)}</div> : <p className="muted">공유 링크에는 개인 입력을 포함하지 않아 기둥 표를 표시하지 않습니다.</p>}<p className="field-note">{result.calendarNote}</p></SectionCard>
      <SectionCard guideKind="saju" guideSection="interpretation" guideDetail={detailUrl('interpretation-overall')}><div className="card-kicker">REFLECTION MENU</div><h2>카테고리별 리딩</h2><div className="interpretation-grid">{tabs.map(([key, label]) => <article data-guide-kind="saju" data-guide-section={`interpretation-${key}`} data-guide-detail={detailUrl(`interpretation-${key}`)} key={key}><span>{label}</span><p>{result.interpretations[key]}</p></article>)}</div></SectionCard>
      {result.persona && <SajuFeedback onFeedback={onFeedback} />}
    </>}
    <div className="notice warm-notice">☼ {result.disclaimer}</div>
  </div>;
}

function SajuCompatibilityCard({ compatibility }: { compatibility: SajuCompatibilitySummary }): ReactElement {
  return <SectionCard className="saju-compatibility-card">
    <div className="card-kicker">COMPATIBILITY · TWELVE GROWTH STAGES</div>
    <h2>십이운성으로 보는 두 사람</h2>
    <p className="muted">일간이 각자의 일지에서 어떤 단계에 놓이는지 비교해 관계의 속도와 회복 리듬을 살펴봅니다.</p>
    <div className="compatibility-stage-grid">
      <div><span>나의 일주</span><strong>{compatibility.primaryGrowthStage.stage}</strong><small>{compatibility.primaryDayMaster.stem} · {compatibility.primaryGrowthStage.branch} · {compatibility.primaryDayMaster.element}</small></div>
      <div><span>상대의 일주</span><strong>{compatibility.otherGrowthStage.stage}</strong><small>{compatibility.otherDayMaster.stem} · {compatibility.otherGrowthStage.branch} · {compatibility.otherDayMaster.element}</small></div>
    </div>
    <p className="compatibility-growth-note">{compatibility.growthNote}</p>
    <div className="compatibility-meta-grid"><div><span>공통 오행</span><strong>{compatibility.sharedElements.join(' · ') || '없음'}</strong></div><div><span>보완 포인트</span><strong>{compatibility.complementaryElements.join(' · ') || '뚜렷하지 않음'}</strong></div><div><span>교차 지지 관계</span><strong>{compatibility.relations.length}건</strong></div></div>
    <p className="field-note">{compatibility.note}</p>
  </SectionCard>;
}

const SAJU_TONE_LEADS: Record<SajuTone, string> = {
  professional: '차트의 흐름을 먼저 확인한 뒤, 생활 장면에 연결해보세요.',
  warm: '지금의 나를 다그치기보다, 이미 가진 리듬과 필요한 휴식을 함께 살펴보세요.',
  light: '정답 찾기보다 “아, 이런 장면이 있지” 싶은 단서를 가볍게 골라보세요.',
  practical: '오늘 관찰할 장면 하나와 바로 해볼 행동 하나만 남겨보세요.',
};

function SajuWhyDetails({ evidence, appliedRuleIds, confidence, result }: { evidence: string[]; appliedRuleIds?: string[]; confidence: string; result: SajuResult }): ReactElement {
  return <details className="saju-why"><summary>왜 이렇게 읽었을까요?</summary><div><p><strong>차트 근거</strong>{evidence.join(' · ')}</p><p><strong>적용 규칙</strong>{appliedRuleIds?.join(' · ') || result.appliedRules?.slice(0, 3).join(' · ') || '공유 요약에는 없음'}</p><p><strong>신뢰도</strong>{confidence}</p><p><strong>계산 방법</strong>{result.calculationMethod?.id ?? '공유 요약에서는 다시 계산하지 않음'} · {result.knowledgeBaseVersion ?? 'legacy'}</p></div></details>;
}

function SajuElementGuidance({ elements, maxElement, detailUrl }: { elements: SajuResult['elements']; maxElement: number; detailUrl: (section: string) => string }): ReactElement {
  return <div className="element-guidance-list"><div className="card-kicker">ELEMENT GUIDANCE</div>{ELEMENT_ORDER.map((element) => <details data-guide-kind="saju" data-guide-section={`element-${element}`} data-guide-detail={detailUrl(`element-${element}`)} key={element}><summary><span style={{ color: ELEMENT_COLORS[element] }}>{ELEMENT_LABELS[element]}</span><b>{elements[element]} · {Math.round((elements[element] / maxElement) * 100)}%</b></summary><div><p><strong>상징</strong>{ELEMENT_GUIDANCE[element].meaning}</p><p><strong>표현</strong>{ELEMENT_GUIDANCE[element].expression}</p><p><strong>균형 질문</strong>{ELEMENT_GUIDANCE[element].imbalance}</p><p><strong>작은 제안</strong>{ELEMENT_GUIDANCE[element].suggestion}</p></div></details>)}</div>;
}

function SajuPersonaCard({ persona, result, tone }: { persona: SajuPersona; result: SajuResult; tone: SajuTone }): ReactElement {
  return <SectionCard className="saju-persona-card"><div className="card-kicker">PERSONALIZED SAJU PERSONA</div><h2>{persona.title}</h2><p className="persona-lead">{SAJU_TONE_LEADS[tone]}</p><div className="persona-points"><div><span>이런 리듬이 보일 수 있어요</span><ul>{persona.characteristics.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="persona-columns"><div><span>강점</span><ul>{persona.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><span>살펴볼 점</span><ul>{persona.blindSpots.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div><div className="persona-example"><span>일상에서 이렇게 나타날 수 있어요</span><p>{persona.everydayExample}</p></div><SajuWhyDetails evidence={persona.evidence} appliedRuleIds={persona.appliedRuleIds} confidence={persona.confidence} result={result} /></SectionCard>;
}

function SajuEverydaySituations({ situations, result }: { situations: Record<SajuSituationContext, SajuEverydaySituation>; result: SajuResult }): ReactElement {
  const contexts = Object.keys(situations) as SajuSituationContext[];
  const [selected, setSelected] = useState<SajuSituationContext>('work');
  const current = situations[selected] ?? situations[contexts[0]];
  if (!current) return <></>;
  return <SectionCard className="saju-situation-card"><div className="card-kicker">EVERYDAY SITUATIONS</div><h2>이런 장면에서 와닿을 수 있어요</h2><div className="situation-tabs" role="tablist" aria-label="일상 상황 선택">{contexts.map((context) => <button type="button" role="tab" aria-selected={selected === context} className={selected === context ? 'situation-tab selected' : 'situation-tab'} key={context} onClick={() => setSelected(context)}>{situations[context].label}</button>)}</div><div className="situation-body"><span className="eyebrow">{current.label}</span><h3>{current.title}</h3><p>{current.interpretation}</p><div className="situation-actions"><div><span>예시</span><p>{current.everydayExample}</p></div><div><span>돌아볼 질문</span><p>{current.reflection}</p></div><div><span>오늘의 행동</span><p>{current.action}</p></div></div><SajuWhyDetails evidence={current.evidence} appliedRuleIds={current.appliedRuleIds} confidence={current.confidence} result={result} /></div></SectionCard>;
}

function SajuQuestionPrompts({ prompts, result }: { prompts: SajuQuestionPrompt[]; result: SajuResult }): ReactElement {
  const [selectedId, setSelectedId] = useState(prompts[0]?.id ?? '');
  const current = prompts.find((prompt) => prompt.id === selectedId) ?? prompts[0];
  if (!current) return <></>;
  return <SectionCard className="saju-question-card"><div className="card-kicker">ASK ABOUT YOUR CURRENT SITUATION</div><h2>지금의 고민을 골라보세요</h2><div className="question-grid">{prompts.map((prompt) => <button type="button" className={prompt.id === current.id ? 'question-chip selected' : 'question-chip'} key={prompt.id} onClick={() => setSelectedId(prompt.id)}>{prompt.question}</button>)}</div><div className="question-answer"><h3>{current.question}</h3><p>{current.answer}</p><div className="situation-actions"><div><span>생각해볼 질문</span><p>{current.reflectionQuestion}</p></div><div><span>작은 행동</span><p>{current.action}</p></div></div><SajuWhyDetails evidence={current.evidence} appliedRuleIds={current.appliedRuleIds} confidence={current.confidence} result={result} /></div></SectionCard>;
}

const WEATHER_TONE_LABELS: Record<SajuEnergyWeatherItem['tone'], string> = { supportive: 'supportive', mixed: 'mixed', attention: 'requires attention' };

function SajuEnergyWeather({ weather, result }: { weather: SajuEnergyWeatherItem[]; result: SajuResult }): ReactElement {
  return <SectionCard className="saju-weather-card"><div className="card-kicker">ENERGY WEATHER</div><h2>시기별 에너지 날씨</h2><p className="muted">대운·세운·월운의 상징을 현재 행동을 점검하는 시간표로만 사용합니다. 좋은 일이나 어려운 일을 보장하지 않습니다.</p><div className="weather-timeline">{weather.map((item, index) => <article className={`weather-item ${item.tone}`} key={`${item.type}-${item.period}-${index}`}><div className="weather-head"><span>{item.type} · {item.period}</span><b className={`weather-tone ${item.tone}`}>{WEATHER_TONE_LABELS[item.tone]}</b></div><h3>{item.pillar} · {item.element} · {item.category}</h3><p>{item.summary}</p><p className="weather-suggestion">작은 제안 · {item.suggestion}</p><SajuWhyDetails evidence={[item.evidence]} appliedRuleIds={[item.type === '대운' ? 'timing.daewoon' : 'timing.annual-monthly']} confidence={item.confidence} result={result} /></article>)}</div></SectionCard>;
}

function SajuFeedback({ onFeedback }: { onFeedback: Notify }): ReactElement {
  const [selected, setSelected] = useState('');
  const choices = ['매우 와닿음', '어느 정도 와닿음', '잘 모르겠음', '다른 설명을 보고 싶어요'];
  return <SectionCard className="saju-feedback"><div className="card-kicker">READING FEEDBACK</div><h2>이 설명이 지금의 나와 맞나요?</h2><p className="muted">선택한 피드백은 현재 브라우저에서만 안내 문구에 반영됩니다.</p><div className="feedback-choices">{choices.map((choice) => <button type="button" className={selected === choice ? 'feedback-choice selected' : 'feedback-choice'} key={choice} onClick={() => { setSelected(choice); onFeedback(`“${choice}” 피드백을 기록했습니다. 현재 세션에만 반영됩니다.`); }}>{choice}</button>)}</div></SectionCard>;
}

function ElementConstellation(): ReactElement {
  return <div className="element-constellation" aria-label="오행 분포 시각화">
    <img className="element-visual-image" src="/images/saju-five-elements-v2.png" alt="목·화·토·금·수를 상징하는 오행 이미지" />
  </div>;
}

function SajuNextStep({ onNext }: { onNext: () => void }): ReactElement {
  return <section className="saju-next-step" aria-label="다음 사주 정보 안내"><span className="card-kicker">NEXT READING</span><p>오행과 시기 흐름을 확인했어요. 다음 정보로 넘어가볼까요?</p><button type="button" onClick={onNext}>다음 정보 보기 <span>→</span></button></section>;
}

function SajuTimingCard({ chart, detailUrl }: { chart: NonNullable<SajuResult['chart']>; detailUrl: (section: string) => string }): ReactElement {
  return <SectionCard className="saju-timing-card"><div className="card-kicker">TIMING</div><h2>대운·세운·월운</h2><p className="muted">지금의 흐름을 살펴보는 참고용 시간표입니다.</p><div className="saju-timing-columns"><div data-guide-kind="saju" data-guide-section="daewoon" data-guide-detail={detailUrl('daewoon')}><h3>대운</h3>{chart.daewoon.length ? <ul className="saju-data-list">{chart.daewoon.map((cycle) => <li key={cycle.sequence}><strong>{cycle.startAge}~{cycle.endAge}세 · {cycle.pillar}</strong><span>{cycle.direction} · {cycle.note}</span></li>)}</ul> : <p className="muted">성별을 선택하면 대운의 순·역행을 함께 볼 수 있어요.</p>}</div><div data-guide-kind="saju" data-guide-section="seun" data-guide-detail={detailUrl('seun')}><h3>세운</h3><ul className="saju-data-list">{chart.annualLuck.map((luck) => <li key={luck.label}><strong>{luck.label} · {luck.pillar}</strong><span>{luck.note}</span></li>)}</ul></div><div data-guide-kind="saju" data-guide-section="monthly-luck" data-guide-detail={detailUrl('monthly-luck')}><h3>월운</h3><ul className="saju-data-list">{chart.monthlyLuck.slice(0, 6).map((luck) => <li key={luck.label}><strong>{luck.label} · {luck.pillar}</strong><span>{luck.note}</span></li>)}</ul></div></div></SectionCard>;
}

const TAROT_ARTWORKS = import.meta.glob('../tarot-deck-original-v1/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const TAROT_RANK_BY_CODE: Record<string, string> = { '01': 'ace', '11': 'page', '12': 'knight', '13': 'queen', '14': 'king' };
const tarotArtworkId = (filePath: string): string => {
  const fileName = filePath.split('/').pop()?.replace(/\.png$/, '') ?? '';
  const [suit, code] = fileName.split('-');
  return `${suit}-${suit === 'major' ? code : TAROT_RANK_BY_CODE[code] ?? code}`;
};
const TAROT_ARTWORKS_BY_ID = Object.fromEntries(Object.entries(TAROT_ARTWORKS).map(([filePath, url]) => [tarotArtworkId(filePath), url])) as Record<string, string>;
const tarotAssetUrl = (cardId: string): string => {
  const url = TAROT_ARTWORKS_BY_ID[cardId];
  if (!url) throw new Error(`Missing tarot artwork: ${cardId}`);
  return url;
};
const tarotCardIndex = (card: TarotCard): number => TAROT_CARDS.findIndex(({ id }) => id === card.id);
const tarotCardStyle = (index: number): CSSProperties => ({ '--card-hue': `${(index * 17 + 188) % 360}`, '--card-index': `${index + 1}` } as CSSProperties);
const tarotReadingFromPayload = (payload: TarotSharePayload): TarotReading => payload.cardIds ? drawTarotFromCards(payload.seed, payload.cardIds, payload.spread, payload.category) : drawTarot(payload.seed, payload.spread, payload.category);

function TarotPortalHero({ mode }: { mode: 'single' | 'compatibility' }): ReactElement {
  return <section className="tarot-portal-hero" aria-label="AI 타로 아르카나 안내">
    <div><span className="tarot-hero-kicker">NEURAL ARCANA · 78 NODES</span><h2>별과 데이터 사이,<br /><em>한 장의 신호</em></h2><p>{mode === 'compatibility' ? '두 사람의 에너지가 어떤 카드 프로토콜로 만나는지 살펴봅니다.' : '전통 상징을 AI 시스템의 언어로 각색해 오늘의 행동으로 번역해보세요.'}</p></div>
  </section>;
}

function TarotPage({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const payload = query.get('tarot') ? decodeSharePayload(query.get('tarot') ?? '') : null;
  const initialReading = payload?.k === 'tarot' ? tarotReadingFromPayload(payload) : readStored<TarotReading>(STORAGE_KEYS.tarot);
  const [mode, setMode] = useState<'single' | 'compatibility'>('single');
  const [spread, setSpread] = useState<1 | 3>(initialReading?.spread ?? 1);
  const [category, setCategory] = useState<TarotCategory>(initialReading?.category ?? 'general');
  const [compatibilityNames, setCompatibilityNames] = useState({ first: '나', second: '상대방' });
  const [reading, setReading] = useState<TarotReading | undefined>(initialReading);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(() => initialReading?.cards.map(({ card }) => card.id) ?? []);
  const [usesSelectedCards, setUsesSelectedCards] = useState(Boolean(payload?.k === 'tarot' && payload.cardIds));
  const [isFreshReading, setIsFreshReading] = useState(false);
  const [status, setStatus] = useState('');
  const requiredSelectionCount: 1 | 3 = mode === 'compatibility' ? 3 : spread;
  const selectionLimit = requiredSelectionCount;
  const beginTarotSelection = (): void => {
    setReading(undefined);
    setSelectedCardIds([]);
    setUsesSelectedCards(false);
    setIsFreshReading(false);
    setStatus('');
  };
  const changeMode = (nextMode: 'single' | 'compatibility'): void => { setMode(nextMode); setReading(undefined); setSelectedCardIds([]); setIsFreshReading(false); setStatus(''); };
  const changeSpread = (nextSpread: 1 | 3): void => { setSpread(nextSpread); setReading(undefined); setSelectedCardIds([]); setIsFreshReading(false); setStatus(''); };
  const drawSelected = (): void => {
    if (!canConfirmTarotSelection(selectedCardIds, requiredSelectionCount)) return;
    const next = mode === 'compatibility' ? drawTarotCompatibilityFromCards(createTarotSeed(), selectedCardIds) : drawTarotFromCards(createTarotSeed(), selectedCardIds, spread, category);
    setReading(next);
    setUsesSelectedCards(true);
    setIsFreshReading(true);
    writeStored(STORAGE_KEYS.tarotCurrent, next);
    if (mode === 'single') writeStored(STORAGE_KEYS.tarot, next);
    setStatus(mode === 'compatibility' ? '선택한 3장으로 궁합 리딩을 펼쳤습니다.' : `선택한 ${requiredSelectionCount}장으로 리딩을 만들었습니다.`);
    notify('선택한 카드가 리딩에 반영되었습니다.');
    navigate('/tarot');
  };
  const code = mode === 'single' && reading ? createTarotShareCode(reading.seed, reading.spread, reading.category, usesSelectedCards ? reading.cards.map(({ card }) => card.id) : undefined) : '';
  const url = code ? shareUrl('/tarot', 'tarot', code) : '';
  const detailUrl = (section: string, cardId?: string): string => `/detail/tarot?section=${encodeURIComponent(section)}${cardId ? `&card=${encodeURIComponent(cardId)}` : ''}${code ? `&tarot=${encodeURIComponent(code)}` : ''}`;
  const share = async (): Promise<void> => { if (!url) return; const ok = await copyText(url); setStatus(ok ? '타로 공유 링크를 복사했어요.' : '링크 복사에 실패했어요.'); notify(ok ? '타로 공유 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const card = async (): Promise<void> => { if (!reading) return; const outcome = await shareCanvas(createTarotCard(reading), 'Prompt Score 타로', reading.summary); setStatus(outcome === 'shared' ? '공유 시트를 열었어요.' : 'PNG를 저장했어요.'); };
  const firstName = compatibilityNames.first.trim() || '나';
  const secondName = compatibilityNames.second.trim() || '상대방';
  return <div className="page-wrap page-content tarot-page"><TarotPortalHero mode={mode} /><PageIntro eyebrow="Tarot · neural arcana" title={mode === 'compatibility' ? '두 사람의 흐름을 카드 프로토콜로 볼까요?' : '오늘의 신호 카드를 한 장 뽑아볼까요?'} description={mode === 'compatibility' ? '78장의 카드에서 3장을 골라 나·상대·관계의 흐름을 살펴봅니다. 결과는 오락과 자기 성찰을 위한 참고용이에요.' : '카드 셔플 버튼을 누르면 78장의 카드가 리본처럼 펼쳐집니다. 마음이 가는 카드로 오늘의 흐름을 읽어보세요.'}><div className="privacy-pill mint"><span>✧</span> 결과는 시드로 재현 가능</div></PageIntro><div className="tarot-layout"><SectionCard className="tarot-controls"><div className="card-kicker">DRAW SETTINGS</div><h2>리딩을 고르세요</h2><div className="segmented tarot-mode-switch"><button className={mode === 'single' ? 'selected' : ''} onClick={() => changeMode('single')}>개인 리딩</button><button className={mode === 'compatibility' ? 'selected' : ''} onClick={() => changeMode('compatibility')}>두 사람 궁합</button></div>{mode === 'single' ? <><div className="segmented"><button className={spread === 1 ? 'selected' : ''} onClick={() => changeSpread(1)}>한 장</button><button className={spread === 3 ? 'selected' : ''} onClick={() => changeSpread(3)}>세 장</button></div><label>관심 카테고리<select value={category} onChange={(event) => setCategory(event.target.value as TarotCategory)}>{Object.entries(TAROT_CATEGORY_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></> : <><p className="field-note tarot-compatibility-hint">이름은 결과 화면에만 표시되며 저장하거나 공유하지 않습니다.</p><div className="field-row tarot-name-row"><label>나<input value={compatibilityNames.first} onChange={(event) => setCompatibilityNames({ ...compatibilityNames, first: event.target.value })} placeholder="나" /></label><label>상대<input value={compatibilityNames.second} onChange={(event) => setCompatibilityNames({ ...compatibilityNames, second: event.target.value })} placeholder="상대방" /></label></div><div className="tarot-compatibility-note">3장 · 나의 에너지 · 상대의 에너지 · 관계의 흐름</div></>}<p className="tarot-selection-prompt">아래에서 <strong>카드 셔플 및 선택</strong>을 누른 뒤, {selectionLimit}장을 골라주세요.</p><div className="tarot-selection-counter" aria-live="polite"><strong>{selectedCardIds.length} / {selectionLimit}</strong>장 선택됨<span>{selectedCardIds.length === selectionLimit ? '선택한 카드가 리딩으로 이어집니다.' : `${selectionLimit}장을 선택해주세요.`}</span></div><div className="tarot-mini-note">NEURAL ARCANA · 78장 전체 카드 · 규칙 기반 리딩</div></SectionCard><div className={`tarot-result${isFreshReading ? ' is-fresh-reading' : ''}`}>{reading ? <><div className="tarot-result-head"><div><span className="card-kicker">{reading.categoryLabel} READING</span><h2>{mode === 'compatibility' ? `${firstName} · ${secondName} · 관계 흐름` : reading.spread === 1 ? '지금의 한 장' : '현재 · 장애물 · 다음 행동'}</h2></div><div className="result-actions compact">{mode === 'single' && <Button secondary onClick={share}>↗ 링크 복사</Button>}<Button secondary onClick={card}>▣ {mode === 'compatibility' ? '궁합 카드 저장' : '카드 저장'}</Button></div></div>{reading.cards.length === 3 && <div className="tarot-reading-guide" data-guide-kind="tarot" data-guide-section="final-interpretation" data-guide-detail={detailUrl('final-interpretation')}><div><span className="guide-mini-label">TAROT GUIDE</span><strong>세 장의 흐름을 한 번에 읽어볼까요?</strong><p>현재·장애물·다음 행동을 연결해 짧은 문장으로 정리했어요.</p></div><Button secondary onClick={() => navigate(detailUrl('final-interpretation'))}>상세 설명 보기 <span>→</span></Button></div>}<div className={`tarot-cards count-${reading.cards.length}`} data-guide-kind="tarot" data-guide-section="card-spread" data-guide-detail={detailUrl('card-spread')}>{reading.cards.map((item, index) => <TarotVisual key={`${item.card.id}-${item.position}`} item={item} revealIndex={index} detailUrl={(cardId) => detailUrl(`card-${cardId}`, cardId)} />)}</div><TarotSpreadTable reading={reading} detailUrl={detailUrl} /><SectionCard className="tarot-summary" guideKind="tarot" guideSection="final-interpretation" guideDetail={detailUrl('final-interpretation')}><span className="eyebrow">오늘의 문장</span><p>{reading.summary}</p><div className="mini-divider" /><p className="muted">{TAROT_DISCLAIMER}</p></SectionCard>{status && <p className="success-text">{status}</p>}</> : <EmptyState title={mode === 'compatibility' ? '두 사람의 카드를 기다리고 있어요' : '카드를 기다리고 있어요'} text={mode === 'compatibility' ? '이름을 정한 뒤 아래 덱에서 3장을 선택하세요.' : '설정을 고른 뒤 아래 덱에서 카드를 선택하세요.'} />}</div></div><TarotDeckGallery selectionLimit={selectionLimit} selectedCardIds={selectedCardIds} onSelectionChange={setSelectedCardIds} onConfirm={drawSelected} onStartSelection={beginTarotSelection} /></div>;
}

function TarotVisual({ item, detailUrl, revealIndex = 0 }: { item: TarotReading['cards'][number]; detailUrl?: (cardId: string) => string; revealIndex?: number }): ReactElement {
  const index = tarotCardIndex(item.card);
  return <article className="tarot-card-wrap" style={{ '--reveal-delay': `${revealIndex * 120}ms` } as CSSProperties} data-guide-kind={detailUrl ? 'tarot' : undefined} data-guide-section={detailUrl ? `card-${item.card.id}` : undefined} data-guide-detail={detailUrl ? detailUrl(item.card.id) : undefined}><div className={`${item.reversed ? 'tarot-card reversed' : 'tarot-card'} tarot-card-${item.card.arcana.toLowerCase()}`} style={tarotCardStyle(index)}><img className="tarot-card-art" src={tarotAssetUrl(item.card.id)} alt="" aria-hidden="true" /><div className="tarot-card-copy"><strong>{item.card.name}</strong><small>{item.reversed ? 'REVERSED · 역방향' : 'UPRIGHT · 정방향'}</small><div className="tarot-ai-tag">{item.card.aiArchetype ?? 'NEURAL ARCHETYPE'}</div><div className="tarot-keywords">{(item.reversed ? item.card.reversedKeywords : item.card.uprightKeywords).map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div></div><div className="tarot-reading"><span className="card-kicker">{item.position}</span><p>{item.interpretation}</p><strong>ADVICE</strong><p>{item.advice}</p><strong>CHECK</strong><p>{item.warning}</p></div></article>;
}

function TarotSpreadTable({ reading, detailUrl }: { reading: TarotReading; detailUrl?: (section: string, cardId?: string) => string }): ReactElement {
  return <div className="tarot-spread-table" role="table" aria-label="타로 스프레드 표" data-guide-kind={detailUrl ? 'tarot' : undefined} data-guide-section={detailUrl ? 'spread-summary' : undefined} data-guide-detail={detailUrl ? detailUrl('spread-summary') : undefined}><div className="tarot-spread-row spread-head" role="row"><span>위치</span><span>카드</span><span>방향</span><span>키워드</span></div>{reading.cards.map((item) => <div className="tarot-spread-row" role="row" key={`${item.card.id}-${item.position}`}><span>{item.position}</span><strong>{item.card.name}</strong><b>{item.reversed ? '역방향' : '정방향'}</b><em>{(item.reversed ? item.card.reversedKeywords : item.card.uprightKeywords).slice(0, 2).join(' · ')}</em></div>)}</div>;
}

const TAROT_DECK_STAGGER_MS = 18;
const TAROT_DECK_ANIMATION_MS = 1050;
const TAROT_DECK_COLLAPSE_MS = 720;
const TAROT_SELECTION_PAUSE_MS = 520;

const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type TarotDeckPhase = 'stacked' | 'spreading' | 'ready' | 'collapsing' | 'complete';

function TarotDeckGallery({ selectionLimit, selectedCardIds, onSelectionChange, onConfirm, onStartSelection }: { selectionLimit: 1 | 3; selectedCardIds: string[]; onSelectionChange: Dispatch<SetStateAction<string[]>>; onConfirm: () => void; onStartSelection: () => void }): ReactElement {
  const [phase, setPhase] = useState<TarotDeckPhase>('stacked');
  const [selectionNotice, setSelectionNotice] = useState('셔플 버튼을 누르면 카드가 리본처럼 펼쳐져요.');
  const [animationKey, setAnimationKey] = useState(0);
  const autoConfirmTimer = useRef<number | undefined>(undefined);
  const collapseTimer = useRef<number | undefined>(undefined);
  const reducedMotion = prefersReducedMotion();
  const canConfirm = canConfirmTarotSelection(selectedCardIds, selectionLimit);

  useEffect(() => {
    if (phase !== 'spreading') return undefined;
    const timer = window.setTimeout(() => {
      setPhase('ready');
      setSelectionNotice('카드가 펼쳐졌어요. 마음이 가는 카드를 선택하세요.');
    }, TAROT_DECK_ANIMATION_MS + (TAROT_CARD_COUNT - 1) * TAROT_DECK_STAGGER_MS + 80);
    return () => window.clearTimeout(timer);
  }, [animationKey, phase]);

  useEffect(() => () => {
    if (autoConfirmTimer.current !== undefined) window.clearTimeout(autoConfirmTimer.current);
    if (collapseTimer.current !== undefined) window.clearTimeout(collapseTimer.current);
  }, []);

  const clearPendingTimers = (): void => {
    if (autoConfirmTimer.current !== undefined) window.clearTimeout(autoConfirmTimer.current);
    if (collapseTimer.current !== undefined) window.clearTimeout(collapseTimer.current);
    autoConfirmTimer.current = undefined;
    collapseTimer.current = undefined;
  };

  const startShuffle = (): void => {
    if (phase === 'spreading' || phase === 'collapsing') return;
    clearPendingTimers();
    onStartSelection();
    onSelectionChange([]);
    setAnimationKey((key) => key + 1);
    setPhase(reducedMotion ? 'ready' : 'spreading');
    setSelectionNotice(reducedMotion ? '카드가 준비됐어요. 마음이 가는 카드를 선택하세요.' : '카드를 섞고 있어요…');
  };

  const toggleCard = (cardId: string): void => {
    if (phase !== 'ready') {
      setSelectionNotice(phase === 'stacked' || phase === 'complete' ? '먼저 카드 셔플 및 선택을 눌러주세요.' : '카드를 펼치는 중이에요. 잠시만 기다려주세요.');
      return;
    }
    if (selectedCardIds.includes(cardId)) {
      onSelectionChange((current) => toggleTarotSelection(current, cardId, selectionLimit));
      setSelectionNotice('선택을 해제했습니다.');
      return;
    }
    if (selectedCardIds.length >= selectionLimit) {
      setSelectionNotice(`이번 리딩에서는 ${selectionLimit}장까지만 선택할 수 있어요.`);
      return;
    }
    onSelectionChange((current) => toggleTarotSelection(current, cardId, selectionLimit));
    const nextCount = selectedCardIds.length + 1;
    setSelectionNotice(nextCount === selectionLimit ? '선택 완료. 잠시 후 카드가 리딩으로 이어져요.' : `${nextCount}장을 선택했습니다.`);
  };

  const finishSelection = useCallback((): void => {
    if (phase !== 'ready' || !canConfirm) return;
    clearPendingTimers();
    setPhase('collapsing');
    setSelectionNotice('선택한 카드가 덱에서 나와 리딩을 준비하고 있어요…');
    collapseTimer.current = window.setTimeout(() => {
      setPhase('complete');
      setSelectionNotice('리딩이 완성됐어요. 새 리딩을 시작할 수 있어요.');
      onConfirm();
    }, reducedMotion ? 0 : TAROT_DECK_COLLAPSE_MS);
  }, [canConfirm, onConfirm, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'ready' || !canConfirm) return undefined;
    autoConfirmTimer.current = window.setTimeout(finishSelection, reducedMotion ? 0 : TAROT_SELECTION_PAUSE_MS);
    return () => {
      if (autoConfirmTimer.current !== undefined) window.clearTimeout(autoConfirmTimer.current);
      autoConfirmTimer.current = undefined;
    };
  }, [canConfirm, finishSelection, phase, reducedMotion]);

  const resetDeck = (): void => {
    clearPendingTimers();
    onStartSelection();
    onSelectionChange([]);
    setAnimationKey((key) => key + 1);
    setPhase('stacked');
    setSelectionNotice('셔플 버튼을 누르면 카드가 리본처럼 펼쳐져요.');
  };

  const selectedCount = phase === 'ready' || phase === 'collapsing' ? selectedCardIds.length : 0;
  const selectionComplete = phase === 'ready' && canConfirm;
  const launchLabel = phase === 'complete' ? '새 카드 셔플 및 선택' : '카드 셔플 및 선택';

  return <SectionCard className="tarot-deck-gallery">
    <div className="section-title-row"><div><span className="card-kicker">AI DECK INDEX · 78 NODES</span><h2>78장의 카드가 펼쳐집니다</h2></div><span className="small-note">{TAROT_CARD_COUNT} / {TAROT_CARD_COUNT} loaded</span></div>
    <p className="tarot-deck-intro">카드 뒷면만 보이는 덱에서 마음이 가는 카드를 골라보세요. 개인 리딩은 {selectionLimit}장, 두 사람 궁합은 3장을 선택합니다.</p>
    <div className="tarot-deck-launch"><div><strong>{phase === 'stacked' ? '리본 스프레드를 시작하세요' : phase === 'complete' ? '다음 리딩을 준비하세요' : '카드의 흐름을 따라가세요'}</strong><span>{phase === 'stacked' || phase === 'complete' ? '셔플하면 78장이 반원으로 펼쳐집니다.' : '선택이 끝나면 카드가 접히며 앞면이 공개됩니다.'}</span></div><Button onClick={startShuffle} disabled={phase === 'spreading' || phase === 'collapsing'}>{phase === 'spreading' ? '카드를 펼치는 중…' : launchLabel} <span>✧</span></Button></div>
    <div className="tarot-deck-selection-head"><strong>{selectedCount} / {selectionLimit}장 선택</strong><span>{phase === 'complete' ? '리딩 완료' : selectionComplete ? '선택 완료' : `${selectionLimit}장을 골라주세요`}</span></div>
    <div className={`tarot-deck-stage is-${phase}`} aria-busy={phase === 'spreading' || phase === 'collapsing'}>
      <div className="tarot-deck-stack" aria-hidden="true"><span /><span /><span /><strong>✦</strong></div>
      <div key={`${animationKey}-${selectionLimit}`} className="tarot-deck-grid" aria-label={`선택 가능한 타로 카드 ${TAROT_CARD_COUNT}장`}>
        {TAROT_CARDS.map((card, index) => <TarotDeckTile key={card.id} card={card} index={index} selected={phase === 'ready' && selectedCardIds.includes(card.id)} disabled={phase !== 'ready'} onToggle={toggleCard} />)}
      </div>
      {phase === 'stacked' && <div className="tarot-deck-overlay" aria-hidden="true"><span>✦</span><strong>셔플로 카드 열기</strong><small>78 CARDS · FACE DOWN</small></div>}
    </div>
    <div className="tarot-deck-selection-status" role="status" aria-live="polite"><span className="tarot-deck-ready-indicator" aria-hidden="true" />{selectionNotice}</div>
    <div className="tarot-deck-selection-actions"><Button secondary onClick={resetDeck} disabled={phase === 'spreading' || phase === 'collapsing'}>↺ 다시 섞기</Button><Button onClick={finishSelection} disabled={phase !== 'ready' || !canConfirm}>선택한 {selectionLimit}장 공개하기</Button></div>
  </SectionCard>;
}

function TarotDeckTile({ card, index, selected, disabled, onToggle }: { card: TarotCard; index: number; selected: boolean; disabled: boolean; onToggle: (cardId: string) => void }): ReactElement {
  const cardIndex = tarotCardIndex(card);
  const normalizedPosition = index / (TAROT_CARD_COUNT - 1) - .5;
  const style = {
    ...tarotCardStyle(cardIndex),
    '--deck-delay': `${index * TAROT_DECK_STAGGER_MS}ms`,
    '--ribbon-x': `${normalizedPosition * 49}%`,
    '--ribbon-y': `${Math.pow(Math.abs(normalizedPosition), 1.7) * 42 - 22}%`,
    '--ribbon-rotate': `${normalizedPosition * 46}deg`,
  } as CSSProperties;
  return <button type="button" className={`tarot-deck-tile tarot-deck-${card.arcana.toLowerCase()}${selected ? ' selected' : ''}`} style={style} aria-label={`타로 카드 ${cardIndex + 1}번 카드 뒷면${selected ? ', 선택됨' : ''}`} aria-pressed={selected} disabled={disabled} onClick={() => onToggle(card.id)}>
    <span className="tarot-card-back" aria-hidden="true"><i /><i /><i /><strong>✦</strong><small>NEURAL ARCANA</small><em>{String(cardIndex + 1).padStart(2, '0')}</em></span>
    <span className="tarot-deck-select-state">{selected ? '선택됨' : disabled ? '준비 중' : '카드 선택'}</span>
  </button>;
}

const PROMPT_DETAIL_GUIDANCE: Record<string, { what: string; read: string; next: string }> = {
  goal: { what: 'AI가 해야 할 일과 완료 기준이 얼마나 선명한지 봅니다.', read: '동사만 있는 요청은 작업은 보이지만 “어디까지 하면 끝인지”가 흐릴 수 있습니다.', next: '결과를 받았을 때 성공이라고 판단할 기준을 한 문장 추가하세요.' },
  context: { what: '현재 상황, 이미 가진 자료, 전제 조건이 담겼는지 봅니다.', read: '맥락이 없으면 AI가 비어 있는 부분을 일반적인 가정으로 채우게 됩니다.', next: '현재 상태와 참고할 자료를 한두 문장으로 먼저 적으세요.' },
  audience: { what: '누가 읽는지와 말투·난이도가 지정됐는지 봅니다.', read: '대상에 따라 같은 내용도 설명의 깊이와 어휘가 달라집니다.', next: '독자의 수준과 원하는 말투를 함께 지정하세요.' },
  constraints: { what: '분량, 기간, 예산, 포함·제외 조건을 확인합니다.', read: '조건은 답변의 범위를 줄여 원하는 결과에 가까워지게 합니다.', next: '반드시 지킬 조건과 우선순위를 구분해 적으세요.' },
  role: { what: 'AI가 어떤 관점과 책임 범위에서 답할지 봅니다.', read: '역할이 없으면 답변의 전문성·시점·판단 기준이 매번 달라질 수 있습니다.', next: '필요한 역할과 먼저 확인할 관점을 한 줄로 지정하세요.' },
  output: { what: '결과의 형식, 순서, 필수 항목이 지정됐는지 봅니다.', read: '형식을 미리 정하면 결과를 비교하고 바로 사용하기 쉬워집니다.', next: '표·목록·단계와 필수 필드를 함께 적으세요.' },
  examples: { what: '원하는 결과의 샘플이나 참고 기준이 있는지 봅니다.', read: '예시는 설명을 길게 쓰지 않고도 “이 정도의 결”을 전달합니다.', next: '좋은 예시 하나와 피하고 싶은 예시 하나를 넣어보세요.' },
  decomposition: { what: '복잡한 작업이 순서와 단계로 나뉘었는지 봅니다.', read: '큰 요청을 나누면 누락을 발견하고 중간 결과를 확인하기 쉽습니다.', next: '먼저 할 일·다음 할 일·마지막 점검을 나눠 적으세요.' },
  verification: { what: '답변을 검토할 기준과 오류 확인 절차가 있는지 봅니다.', read: '검증 기준이 있으면 그럴듯하지만 틀린 답변을 걸러내기 쉽습니다.', next: '답변 끝에 오류·누락·가정을 점검하는 체크리스트를 요청하세요.' },
  specificity: { what: '날짜, 숫자, 대상, 도구처럼 확인 가능한 정보가 있는지 봅니다.', read: '구체적인 값은 AI가 넓은 가능성 대신 실행 가능한 선택지를 만들게 합니다.', next: '가능하면 숫자·기한·대상을 하나씩 더 명시하세요.' },
};

function PromptDetailPage({ navigate }: { navigate: Navigate }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const shared = query.get('share') ? decodeSharePayload(query.get('share') ?? '') : null;
  const result = shared?.k === 'prompt' ? resultFromPromptShareSummary(shared) : readStored<PromptEvaluationResult>(STORAGE_KEYS.prompt);
  if (!result) return <EmptyState title="상세 설명을 열 수 없어요" text="먼저 프롬프트를 평가한 뒤 다시 시도해주세요." button="평가하러 가기" onClick={() => navigate('/evaluate')} />;
  const section = query.get('section') ?? 'score-summary';
  const categoryId = PROMPT_CATEGORIES.find((category) => category.id === section.replace(/^category-/u, ''))?.id;
  const category = categoryId ? result.categories[categoryId] : undefined;
  const guidance = PROMPT_DETAIL_GUIDANCE[categoryId ?? ''] ?? PROMPT_DETAIL_GUIDANCE.goal;
  const score = category?.score ?? result.overallScore;
  const title = category?.categoryName ?? (section === 'evidence' ? '감지된 근거' : section === 'improvements' || section === 'suggestions' ? '개선 기회와 다음 행동' : '전체 점수');
  const evidence = category?.evidence ?? result.evidence;
  const challenge = result.challengeId ? getChallenge(result.challengeId) : undefined;
  const rewrittenPrompt = challenge?.strongPrompt ?? '목표: 원하는 결과를 한 문장으로 정의하기\n상황: 대상과 현재 맥락 적기\n조건: 지켜야 할 기준과 출력 형식 정하기\n검증: 결과를 확인할 기준 한 가지 적기';
  return <div className="page-wrap page-content detail-page prompt-detail-page">
    <button className="detail-back" type="button" onClick={() => navigate('/results')}>← 결과로 돌아가기</button>
    <div className="detail-header"><h1>{title}</h1><p>선택한 신호가 점수에 어떤 영향을 주었는지, 다음 프롬프트에서 어떻게 활용할지 정리했습니다.</p></div>
    <div className="prompt-detail-grid">
      <SectionCard className="detail-score-panel"><span className="detail-label">현재 점수</span><strong>{score}<small>/100</small></strong><h2>{category?.level ?? result.level} · {category?.categoryName ?? '전체 구조'}</h2><p>{category?.why ?? `전체 점수 ${result.overallScore}점은 목표·맥락·출력 조건을 포함한 프롬프트 구조를 종합한 결과입니다.`}</p><div className="detail-callout"><strong>이 항목이 보는 것</strong><p>{guidance.what}</p></div></SectionCard>
      <SectionCard className="detail-evidence-panel"><span className="detail-label">근거를 확인하세요</span><h2>왜 이 점수가 나왔을까요?</h2>{evidence.length ? <div className="detail-evidence-list">{evidence.slice(0, 10).map((item, index) => <div key={`${item.ruleId}-${index}`}><strong>{item.signal}</strong><p>{item.text}</p></div>)}</div> : <p className="muted">이 공유 결과에는 원문 근거가 포함되지 않았습니다.</p>}<p className="detail-note">표시된 근거는 입력문에서 감지된 구조적 신호이며, AI 답변의 품질 자체를 뜻하지 않습니다.</p></SectionCard>
      <SectionCard className="detail-improvement-panel"><span className="detail-label">다음 수정</span><h2>한 번에 하나씩 보완하기</h2>{category?.missingElements.length ? <ul className="detail-list">{category.missingElements.map((item) => <li key={item}>{item}</li>)}</ul> : <ul className="detail-list">{result.weaknesses.slice(0, 3).map((item) => <li key={item.categoryId}>{item.categoryName}: {item.tip}</li>)}</ul>}<p className="detail-reading-guide">{guidance.read}</p><div className="detail-divider" /><strong>이번 입력에서 먼저 해볼 일</strong><p>{guidance.next}</p><ol className="detail-list ordered">{result.recommendations.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ol></SectionCard>
      <SectionCard className="detail-rewrite-panel"><span className="detail-label">다시 써보기</span><h2>개선된 프롬프트 예시</h2><pre>{rewrittenPrompt}</pre><p className="detail-note">예시를 그대로 복사하기보다, 내 목표·상황·조건에 맞는 단어로 바꿔보세요.</p></SectionCard>
      <SectionCard className="detail-method-panel"><span className="detail-label">읽는 순서</span><h2>점수를 사용하는 세 단계</h2><ol className="detail-step-list"><li><strong>신호</strong><span>어떤 단어와 구조가 감지됐는지 확인합니다.</span></li><li><strong>빈칸</strong><span>내가 원하는 결과에 빠진 조건을 고릅니다.</span></li><li><strong>재시도</strong><span>한 가지 조건만 추가해 결과의 차이를 비교합니다.</span></li></ol></SectionCard>
      <SectionCard className="detail-checklist-panel"><span className="detail-label">다음 질문 전</span><h2>짧은 체크리스트</h2><ul className="detail-checklist"><li>무엇을 만들거나 판단해야 하나요?</li><li>현재 상황과 대상은 누구인가요?</li><li>반드시 지킬 조건과 출력 형식은 무엇인가요?</li><li>답변을 어떻게 검토할 건가요?</li></ul></SectionCard>
    </div>
  </div>;
}

const SAJU_DETAIL_LABELS: Record<string, string> = { 'five-elements': '오행의 흐름', 'four-pillars': '사주 네 기둥', daewoon: '대운 흐름', seun: '세운 흐름', 'monthly-luck': '월운 흐름', interpretation: '카테고리별 리딩' };
const ELEMENT_DETAIL_OBSERVATIONS: Record<FiveElement, string[]> = {
  목: ['새로운 일을 시작할 때 에너지가 살아나는지', '관계를 넓히는 대신 마무리가 밀리고 있지는 않은지', '이번 주에 키울 일과 끝낼 일을 따로 정했는지'],
  화: ['생각을 밖으로 표현할 때 속도가 붙는지', '반응이 빨라진 뒤 회복할 시간이 있었는지', '결정 전 잠깐 멈추는 습관을 만들 수 있는지'],
  토: ['사람과 일을 안정시키는 역할을 자주 맡는지', '익숙한 방식을 지키느라 새 신호를 놓치지는 않는지', '지킬 루틴과 실험할 루틴을 구분했는지'],
  금: ['복잡한 일을 기준과 순서로 정리하는지', '정확한 판단에 관계의 맥락도 포함했는지', '기준과 예외 조건을 함께 적어두었는지'],
  수: ['정보를 모으는 시간이 실제 행동으로 이어지는지', '상황에 맞춰 경로를 바꾸는 힘을 어떻게 쓰는지', '탐색을 멈추고 시작할 기준을 정했는지'],
};
const SAJU_TIMING_GUIDANCE: Record<string, string> = { daewoon: '대운은 긴 호흡의 변화 구간을 보는 표입니다. 중요한 결정을 대신하기보다, 몇 년 단위로 어떤 역량과 생활 기반을 쌓을지 점검하는 데 사용하세요.', seun: '세운은 한 해의 주제를 돌아보는 표입니다. 올해 일어난 일을 미리 정해진 결과로 해석하기보다, 반복된 선택과 새로 생긴 관심을 기록해보세요.', 'monthly-luck': '월운은 짧은 주기의 점검표입니다. 한 달의 분위기를 단정하기보다, 이번 달에 조정할 일정·관계·회복 시간을 구체적으로 정하는 데 활용하세요.' };

function SajuDetailPage({ navigate }: { navigate: Navigate }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const shared = query.get('share') ? decodeSharePayload(query.get('share') ?? '') : null;
  const result = shared?.k === 'saju' ? resultFromSajuShare(shared) : readStored<SajuResult>(STORAGE_KEYS.saju);
  if (!result) return <EmptyState title="상세 설명을 열 수 없어요" text="먼저 사주를 계산한 뒤 다시 시도해주세요." button="사주로 돌아가기" onClick={() => navigate('/saju')} />;
  const section = query.get('section') ?? 'five-elements';
  const element = section.startsWith('element-') ? section.slice('element-'.length) as FiveElement : undefined;
  const selectedElement = element && ELEMENT_GUIDANCE[element] ? element : undefined;
  const interpretationKey = section.startsWith('interpretation-') ? section.slice('interpretation-'.length) : undefined;
  const title = selectedElement ? `${ELEMENT_LABELS[selectedElement]}를 읽는 방법` : interpretationKey ? `${SAJU_TOPIC_LABELS[interpretationKey as SajuReadingTopic] ?? '사주'} 리딩` : SAJU_DETAIL_LABELS[section] ?? '사주 상세 설명';
  const chart = result.chart;
  const timingItems = section === 'daewoon' ? chart?.daewoon.map((item) => `${item.startAge}~${item.endAge}세 · ${item.pillar} · ${item.direction}`) : section === 'seun' ? chart?.annualLuck.map((item) => `${item.label} · ${item.pillar}`) : section === 'monthly-luck' ? chart?.monthlyLuck.slice(0, 6).map((item) => `${item.label} · ${item.pillar}`) : undefined;
  const maxDistribution = Math.max(...ELEMENT_ORDER.map((item) => result.elements[item]), 1);
  const interpretation = interpretationKey ? result.interpretations[interpretationKey as keyof SajuResult['interpretations']] ?? result.interpretations.general : result.interpretations.general;
  return <div className="page-wrap page-content detail-page saju-detail-page">
    <button className="detail-back" type="button" onClick={() => navigate('/saju')}>← 사주 결과로 돌아가기</button>
    <div className="detail-header"><h1>{title}</h1><p>차트의 단서를 생활 장면과 계획 점검의 언어로 풀어봅니다. 정해진 미래를 말하는 페이지가 아닙니다.</p></div>
    {selectedElement ? <div className="saju-detail-grid">
      <SectionCard className="saju-detail-feature"><span className="detail-label">선택한 오행</span><strong className="saju-element-mark" style={{ color: ELEMENT_COLORS[selectedElement] }}>{ELEMENT_LABELS[selectedElement]}</strong><h2>{ELEMENT_GUIDANCE[selectedElement].meaning}</h2><p>{ELEMENT_GUIDANCE[selectedElement].expression}</p></SectionCard>
      <SectionCard><span className="detail-label">균형을 살피는 질문</span><h2>생활에서 어떻게 보일까요?</h2><p>{ELEMENT_GUIDANCE[selectedElement].imbalance}</p><div className="detail-action-box"><strong>작은 제안</strong><p>{ELEMENT_GUIDANCE[selectedElement].suggestion}</p></div></SectionCard>
      <SectionCard className="saju-detail-observation"><span className="detail-label">관찰 포인트</span><h2>이번 주에 확인해볼 장면</h2><ul className="detail-list">{ELEMENT_DETAIL_OBSERVATIONS[selectedElement].map((item) => <li key={item}>{item}</li>)}</ul></SectionCard>
      <SectionCard className="saju-detail-bars"><span className="detail-label">현재 분포</span>{ELEMENT_ORDER.map((item) => <div className="detail-bar-row" key={item}><span>{ELEMENT_LABELS[item]}</span><div><i style={{ width: `${(result.elements[item] / maxDistribution) * 100}%`, background: ELEMENT_COLORS[item] }} /></div><b>{result.elements[item]}</b></div>)}<p className="detail-note">분포는 성향을 확정하는 수치가 아니라, 어떤 생활 질문을 먼저 꺼낼지 정하는 참고표입니다.</p></SectionCard>
    </div> : interpretationKey ? <div className="saju-detail-grid">
      <SectionCard className="saju-detail-reading"><span className="detail-label">생활 언어로 읽기</span><h2>{SAJU_TOPIC_LABELS[interpretationKey as SajuReadingTopic] ?? '사주 리딩'}</h2><p>{interpretation}</p><div className="detail-action-box"><strong>돌아볼 질문</strong><p>이 해석이 내 일상에서 어떤 장면으로 나타나는지 한 가지 사례를 적어보세요.</p></div></SectionCard>
      <SectionCard className="saju-detail-observation"><span className="detail-label">실험으로 바꾸기</span><h2>이번 주에 관찰할 것</h2><ol className="detail-step-list"><li><strong>장면 고르기</strong><span>일·공부·관계 중 하나의 구체적인 장면을 고릅니다.</span></li><li><strong>기록하기</strong><span>반복되는 반응과 몸의 리듬을 짧게 적습니다.</span></li><li><strong>조정하기</strong><span>생활 습관 하나만 바꾸고 다음 주에 차이를 봅니다.</span></li></ol></SectionCard>
      <SectionCard className="saju-detail-reading"><span className="detail-label">해석의 경계</span><h2>참고 자료로 사용하는 법</h2><p>이 문장은 가능성을 관찰하는 언어입니다. 나와 맞지 않는 부분은 내려놓고, 실제 경험과 선택을 더 중요한 기준으로 삼아주세요.</p></SectionCard>
    </div> : timingItems ? <div className="saju-detail-grid">
      <SectionCard className="saju-detail-timing"><span className="detail-label">선택한 시간표</span><h2>{SAJU_DETAIL_LABELS[section]}</h2><p>{SAJU_TIMING_GUIDANCE[section]}</p><ul className="detail-list">{timingItems.length ? timingItems.map((item) => <li key={item}>{item}</li>) : <li>성별 미지정으로 대운을 계산하지 않았습니다.</li>}</ul></SectionCard>
      <SectionCard className="saju-detail-observation"><span className="detail-label">시간표를 쓰는 질문</span><h2>무엇을 준비하면 좋을까요?</h2><ul className="detail-list"><li>지금 유지해야 할 기반은 무엇인가요?</li><li>새로 시험할 선택은 무엇인가요?</li><li>결과가 아니라 과정으로 확인할 지표는 무엇인가요?</li></ul></SectionCard>
    </div> : <div className="saju-detail-grid">
      <SectionCard className="saju-detail-feature"><span className="detail-label">오행</span><h2>전체 흐름을 한눈에 보기</h2><p>{result.interpretations.general}</p></SectionCard>
      <SectionCard><span className="detail-label">일상 연결</span><h2>이 결과를 써보는 방법</h2><p>지금의 생활에서 에너지가 모이는 일과 회복이 필요한 일을 각각 하나씩 적어보세요. 차트는 선택을 대신하지 않고 관찰의 언어로 사용합니다.</p><div className="detail-action-box"><strong>오늘의 기록</strong><p>오늘 가장 오래 머문 일 하나와, 미뤄둔 일 하나를 적고 내일의 첫 행동을 정해보세요.</p></div></SectionCard>
      <SectionCard className="saju-detail-observation"><span className="detail-label">다음 단계</span><h2>작게 확인하고 다시 읽기</h2><p>한 번의 결과보다 같은 질문을 생활 속에서 반복해 관찰할 때, 이 페이지의 언어가 더 유용해집니다.</p></SectionCard>
    </div>}
    <p className="detail-disclaimer">사주 결과는 오락과 자기 성찰을 위한 참고용입니다. 재정·의료·진로·관계 결정을 위한 유일한 근거로 사용하지 마세요.</p>
  </div>;
}

function tarotTopicMeaning(card: TarotCard, category: TarotCategory): string {
  if (category === 'love') return card.loveMeaning;
  if (category === 'study') return card.studyMeaning;
  if (category === 'career') return card.careerMeaning;
  if (category === 'money') return card.moneyMeaning;
  if (category === 'decision') return `${card.generalMeaning} 선택의 기준을 한 문장으로 적어보세요.`;
  return card.generalMeaning;
}

function TarotDetailPage({ navigate }: { navigate: Navigate }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const payload = query.get('tarot') ? decodeSharePayload(query.get('tarot') ?? '') : null;
  const reading = payload?.k === 'tarot' ? tarotReadingFromPayload(payload) : readStored<TarotReading>(STORAGE_KEYS.tarotCurrent) ?? readStored<TarotReading>(STORAGE_KEYS.tarot);
  if (!reading) return <EmptyState title="상세 설명을 열 수 없어요" text="먼저 카드를 뽑은 뒤 다시 시도해주세요." button="타로로 돌아가기" onClick={() => navigate('/tarot')} />;
  const section = query.get('section') ?? 'final-interpretation';
  const selected = reading.cards.find((item) => item.card.id === query.get('card')) ?? reading.cards[0];
  const keywords = selected ? (selected.reversed ? selected.card.reversedKeywords : selected.card.uprightKeywords) : [];
  const topicMeaning = selected ? tarotTopicMeaning(selected.card, reading.category) : '';
  return <div className="page-wrap page-content detail-page tarot-detail-page">
    <button className="detail-back" type="button" onClick={() => navigate('/tarot')}>← 타로 결과로 돌아가기</button>
    <div className="detail-header"><h1>{section === 'final-interpretation' ? '이번 리딩의 전체 흐름' : selected?.card.name ?? '선택한 카드'}</h1><p>{reading.categoryLabel} 주제에 맞춰 카드의 위치와 방향을 읽고, 오늘 해볼 수 있는 행동으로 연결합니다.</p></div>
    {section === 'final-interpretation' ? <div className="tarot-detail-grid">
      <SectionCard className="tarot-detail-summary"><span className="detail-label">전체 흐름</span><h2>{reading.summary}</h2><div className="tarot-detail-cards">{reading.cards.map((item) => <div key={`${item.card.id}-${item.position}`}><strong>{item.card.name}</strong><span>{item.position} · {item.reversed ? '역방향' : '정방향'}</span><p>{item.interpretation}</p></div>)}</div></SectionCard>
      <SectionCard className="tarot-detail-application"><span className="detail-label">앞으로 할 일</span><h2>카드의 단어를 행동으로 바꾸기</h2><ol className="detail-step-list"><li><strong>한 단어 고르기</strong><span>오늘 가장 오래 남는 키워드 하나를 고릅니다.</span></li><li><strong>장면 연결하기</strong><span>그 단어가 필요한 일·관계·결정의 장면을 찾습니다.</span></li><li><strong>작게 실행하기</strong><span>확인 가능한 행동 하나로 바꾸고 하루 뒤 돌아봅니다.</span></li></ol></SectionCard>
      <SectionCard className="tarot-detail-application"><span className="detail-label">다시 질문하기</span><h2>다음 질문으로 남길 문장</h2><p>“이 흐름을 바꾸기 위해 내가 오늘 확인할 수 있는 사실은 무엇인가?”</p><p>타로는 결론을 대신하기보다, 내가 놓친 감정과 선택지를 다시 바라보는 장치로 사용하세요.</p></SectionCard>
    </div> : selected ? <div className="tarot-detail-grid">
      <SectionCard className="tarot-detail-card"><img src={tarotAssetUrl(selected.card.id)} alt="" aria-hidden="true" /><div><span className="detail-label">{selected.position} · {reading.categoryLabel}</span><h2>{selected.card.name}</h2><strong>{selected.reversed ? '역방향으로 읽기' : '정방향으로 읽기'}</strong><p>{selected.interpretation}</p></div></SectionCard>
      <SectionCard><span className="detail-label">상징과 방향</span><h2>{selected.reversed ? '역방향의 신호' : '정방향의 신호'}</h2><div className="detail-keywords">{keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><p>{selected.reversed ? selected.card.warning : selected.card.generalMeaning}</p><div className="detail-direction-note"><strong>{selected.reversed ? '멈춰서 확인할 것' : '살려볼 힘'}</strong><p>{selected.reversed ? '지금의 해석을 사실로 확정하기보다, 속도를 늦추고 빠진 정보와 감정을 확인하세요.' : '카드의 강점을 과장하지 않고 오늘 검증할 수 있는 작은 행동으로 옮겨보세요.'}</p></div></SectionCard>
      <SectionCard className="tarot-detail-application"><span className="detail-label">주제에 연결하기</span><h2>{reading.categoryLabel}에서의 의미</h2><p>{topicMeaning}</p><div className="detail-action-box"><strong>상황 질문</strong><p>{selected.reversed ? '이 주제에서 내가 피하거나 과하게 해석하는 부분은 무엇인가요?' : '이 주제에서 지금 더 분명히 확인하고 싶은 것은 무엇인가요?'}</p></div></SectionCard>
      <SectionCard className="tarot-detail-application"><span className="detail-label">실천 리플렉션</span><h2>이 카드를 오늘 어떻게 써볼까요?</h2><div className="detail-action-box"><strong>돌아볼 질문</strong><p>{selected.reversed ? '지금 속도를 늦추고 다시 확인해야 할 신호는 무엇인가요?' : '이 카드의 강점을 오늘 어떤 행동으로 작게 시험해볼 수 있나요?'}</p></div><div className="detail-action-box"><strong>다음 행동</strong><p>{selected.advice}</p></div></SectionCard>
    </div> : <p className="detail-note">선택한 카드를 찾지 못했습니다.</p>}
    <p className="detail-disclaimer">{reading.disclaimer}</p>
  </div>;
}

function ComparePage({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const directMine = query.get('mine') ? decodeSharePayload(query.get('mine') ?? '') : null;
  const shared = query.get('share') ? decodeSharePayload(query.get('share') ?? '') : null;
  const local = readStored<PromptEvaluationResult>(STORAGE_KEYS.prompt);
  const initialComparison = shared?.k === 'compare' ? shared : undefined;
  const [mine, setMine] = useState<PromptShareSummary | undefined>(initialComparison?.a ?? (directMine?.k === 'prompt' ? directMine : local ? toPromptShareSummary(local) : undefined));
  const [friendCode, setFriendCode] = useState(initialComparison?.b ? encodeSharePayload(initialComparison.b) : '');
  const [friend, setFriend] = useState<PromptShareSummary | undefined>(initialComparison?.b);
  const [error, setError] = useState('');
  const comparison = useMemo<PromptComparison | undefined>(() => mine && friend ? comparePromptSummaries(mine, friend) : undefined, [mine, friend]);
  const myCode = mine ? encodeSharePayload(mine) : '';
  const copyMyCode = async (): Promise<void> => { if (!myCode) return; const ok = await copyText(myCode); notify(ok ? '내 결과 코드를 복사했습니다.' : '코드 복사에 실패했습니다.'); };
  const applyFriend = (event: FormEvent): void => { event.preventDefault(); const decoded = decodeSharePayload(friendCode.trim()); if (!decoded || decoded.k !== 'prompt') { setError('Prompt Score 프롬프트 결과 코드를 확인해주세요.'); return; } setFriend(decoded); setError(''); notify('친구 결과를 불러왔습니다.'); };
  const shareComparison = async (): Promise<void> => { if (!comparison) return; const code = createComparisonShareCode(comparison.a, comparison.b); const url = shareUrl('/compare', 'share', code); const ok = await copyText(url); notify(ok ? '비교 카드 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const saveComparisonCard = async (): Promise<void> => { if (!comparison) return; const outcome = await shareCanvas(createComparisonCard(comparison), 'Prompt Score 친구 비교', comparison.totalMessage); notify(outcome === 'shared' ? '공유 시트를 열었습니다.' : '비교 카드를 저장했습니다.'); };
  return <div className="page-wrap page-content"><PageIntro eyebrow="Compare · no account" title="친구와 프롬프트 감각을 비교해보세요" description="두 결과의 점수와 카테고리 차이만 비교합니다. 사람의 우열이나 능력을 평가하지 않아요." /><div className="compare-layout"><SectionCard className="compare-join"><div className="card-kicker">01 · MY RESULT</div><h2>내 결과 준비하기</h2>{mine ? <div className="my-score-box"><span>내 총점</span><strong>{mine.score}<small>/100</small></strong><em>{mine.style}</em></div> : <div className="empty-inline"><p>먼저 프롬프트를 평가하면 내 결과가 자동으로 연결됩니다.</p><Button onClick={() => navigate('/evaluate')}>평가하러 가기</Button></div>}<div className="code-row"><input readOnly value={myCode} placeholder="내 결과 코드" /><Button secondary onClick={copyMyCode} disabled={!myCode}>코드 복사</Button></div><p className="field-note">코드에는 점수·카테고리·버전만 들어가며 원문은 포함되지 않습니다.</p></SectionCard><SectionCard className="compare-join"><div className="card-kicker">02 · FRIEND RESULT</div><h2>친구 코드 입력</h2><form onSubmit={applyFriend}><input className="friend-code-input" value={friendCode} onChange={(event) => setFriendCode(event.target.value)} placeholder="ps1.로 시작하는 코드" aria-label="친구 결과 코드" /><Button type="submit">친구 결과 불러오기 <span>→</span></Button></form>{error && <p className="error-text">{error}</p>}<div className="compare-example"><span>Tip</span><p>친구는 결과 화면의 “공유 링크 복사”를 누르면 코드를 얻을 수 있어요.</p></div></SectionCard></div>{comparison ? <ComparisonResult comparison={comparison} onShare={shareComparison} onCard={saveComparisonCard} /> : <div className="compare-placeholder"><span>↔</span><h2>두 결과가 만나면<br />차이가 보입니다.</h2><p>내 결과 코드를 친구에게 보내고, 친구의 코드를 여기에 입력해보세요.</p></div>}</div>;
}

function ComparisonResult({ comparison, onShare, onCard }: { comparison: PromptComparison; onShare: () => void; onCard: () => void }): ReactElement {
  return <div className="comparison-result"><SectionCard className="comparison-hero"><div className="comparison-scores"><div><span>A</span><strong>{comparison.a.score}</strong><small>{comparison.a.level}</small></div><div className="vs">VS</div><div><span>B</span><strong>{comparison.b.score}</strong><small>{comparison.b.level}</small></div></div><p>{comparison.totalMessage}</p><div className="result-actions"><Button onClick={onShare}>↗ 비교 링크 복사</Button><Button secondary onClick={onCard}>▣ 비교 카드</Button></div></SectionCard><SectionCard><div className="section-title-row"><div><span className="card-kicker">CATEGORY BY CATEGORY</span><h2>카테고리별 차이</h2></div><span className="small-note">8점 이내는 비슷한 점수</span></div><div className="comparison-bars">{comparison.categories.map((item) => <div className="comparison-row" key={item.id}><div className="comparison-label"><span>{item.label}</span>{item.similar && <em>비슷함</em>}</div><div className="compare-track"><i style={{ width: `${item.aScore}%` }} /><b style={{ width: `${item.bScore}%` }} /></div><div className="compare-numbers"><span>A {item.aScore}</span><span>B {item.bScore}</span></div><p>{item.message}</p></div>)}</div></SectionCard><div className="result-two-col"><SectionCard><div className="card-kicker">LARGEST GAP</div><h2>가장 큰 차이</h2><ul className="plain-list">{comparison.largestDifferences.map((item) => <li key={item.id}><strong>{item.label}</strong><span>{item.message}</span></li>)}</ul></SectionCard><SectionCard><div className="card-kicker">SIMILARITY</div><h2>비슷한 영역</h2>{comparison.similarCategories.length ? <ul className="plain-list">{comparison.similarCategories.map((item) => <li key={item.id}><strong>{item.label}</strong><span>두 사용자의 점수가 비슷합니다.</span></li>)}</ul> : <p className="muted">8점 이내로 비슷한 카테고리가 아직 없습니다.</p>}</SectionCard></div></div>;
}

function EmptyState({ title, text, button, onClick }: { title: string; text: string; button?: string; onClick?: () => void }): ReactElement {
  return <div className="empty-state"><div className="empty-scan-lines" aria-hidden="true"><i /><i /><i /></div><span>✦</span><h2>{title}</h2><p>{text}</p>{button && onClick && <Button onClick={onClick}>{button}</Button>}</div>;
}

export default App;
