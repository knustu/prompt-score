import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode, type ReactElement, type PointerEvent as HoloPointerEvent } from 'react';
import { CHALLENGES, FREEFORM_CHALLENGE_ID, getChallenge } from './domain/prompt/ChallengeDefinitions';
import { PROMPT_CATEGORIES } from './domain/prompt/PromptRuleDefinitions';
import { evaluatePrompt, resultFromPromptShareSummary, toPromptShareSummary } from './domain/prompt/PromptEvaluationEngine';
import { comparePromptSummaries, type PromptComparison } from './domain/comparison/ComparisonEngine';
import { calculateSaju, defaultSajuInput, validateSajuInput } from './domain/saju/SajuEngine';
import { ELEMENT_COLORS, ELEMENT_LABELS, ELEMENT_ORDER } from './domain/saju/SajuRuleDefinitions';
import { createTarotSeed, drawTarot, TAROT_CATEGORY_LABELS, TAROT_DISCLAIMER } from './domain/tarot/TarotEngine';
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
  SajuResult,
  SajuReadingItem,
  SajuReadingKey,
  SajuReadingTopic,
  SajuSharePayload,
  TarotCategory,
  TarotReading,
  TarotSharePayload,
} from './domain/types';

const STORAGE_KEYS = {
  prompt: 'prompt-score.prompt-result',
  tarot: 'prompt-score.tarot-reading',
  saju: 'prompt-score.saju-result',
} as const;

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

function PageIntro({ title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }): ReactElement {
  return (
    <div className="page-intro">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  );
}

function Button({ children, onClick, secondary = false, type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; type?: 'button' | 'submit'; disabled?: boolean }): ReactElement {
  return <button type={type} className={secondary ? 'button secondary' : 'button'} onClick={onClick} disabled={disabled}>{children}</button>;
}

function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }): ReactElement {
  return <section className={`section-card ${className}`}>{children}</section>;
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
    <div className="page-wrap page-content">
      <PageIntro eyebrow="Prompt check" title="내 프롬프트, 어디까지 구체적일까?" description="챌린지를 고르거나 자유롭게 입력해보세요. 원문은 브라우저 밖으로 나가지 않습니다.">
        <div className="privacy-pill"><span>✓</span> 로컬 규칙 엔진 · AI API 없음</div>
      </PageIntro>
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
  const handleShare = async (): Promise<void> => { const copied = await copyText(url); setShareStatus(copied ? '공유 링크를 복사했어요.' : '링크 복사에 실패했어요.'); notify(copied ? '공유 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const handleCard = async (): Promise<void> => { const canvas = createPromptResultCard(result); const outcome = await shareCanvas(canvas, 'Prompt Score 결과', `내 프롬프트 점수는 ${result.overallScore}점입니다.`); setShareStatus(outcome === 'shared' ? '공유 시트를 열었어요.' : 'PNG를 저장했어요.'); };
  const handleDownload = (): void => { downloadCanvas(createPromptResultCard(result), 'prompt-score-result.png'); notify('결과 카드를 PNG로 저장했습니다.'); };
  return (
    <div className="page-wrap page-content result-page">
      <PageIntro eyebrow={sharedSummary ? 'Shared prompt result' : 'Prompt result'} title="내 프롬프트 사용 설명서" description={sharedSummary ? '공유된 요약 결과입니다. 원문 프롬프트와 개인정보는 포함하지 않았어요.' : '점수보다 중요한 건, 다음 프롬프트에서 바로 바꿔볼 한 가지예요.'} />
      <SectionCard className="result-hero-card"><ScoreHeader score={result.overallScore} level={result.level} styleLabel={result.styleLabel} shared={Boolean(sharedSummary)} /><div className="result-actions"><Button onClick={handleShare}>↗ 공유 링크 복사</Button><Button secondary onClick={handleCard}>▣ 결과 카드 만들기</Button><Button secondary onClick={handleDownload}>↓ PNG 저장</Button></div>{shareStatus && <p className="success-text">{shareStatus}</p>}</SectionCard>
      <SectionCard><div className="section-title-row"><div><span className="card-kicker">10 CATEGORIES</span><h2>프롬프트 구조 점수</h2></div><span className="small-note">강함 70 · 부분적 40 · 약함 0</span></div><ScoreBars result={result} /><CategoryDetails result={result} shared={Boolean(sharedSummary)} /></SectionCard>
      <div className="result-two-col"><SectionCard><div className="card-kicker">TOP 3 · STRENGTHS</div><h2>잘하고 있는 점</h2><FeedbackItems items={result.strengths} strength /></SectionCard><SectionCard><div className="card-kicker">TOP 3 · GROWTH</div><h2>다음에 보완할 점</h2><FeedbackItems items={result.weaknesses} /></SectionCard></div>
      <div className="result-two-col"><SectionCard><div className="card-kicker">EVIDENCE</div><h2>감지된 근거</h2>{sharedSummary ? <p className="muted">공유 결과에는 원문과 근거 문장이 포함되지 않습니다. 내 브라우저에서 만든 결과를 확인하면 더 자세히 볼 수 있어요.</p> : result.evidence.length ? <div className="evidence-list">{result.evidence.slice(0, 10).map((item, index) => <div className="evidence-item" key={`${item.ruleId}-${index}`}><span>{item.signal}</span><p>{item.text}</p></div>)}</div> : <p className="muted">아직 감지된 신호가 없습니다.</p>}</SectionCard><SectionCard><div className="card-kicker">NEXT ACTIONS</div><h2>추천 한 걸음</h2><ol className="recommendation-list">{result.recommendations.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>{result.missingElements.length > 0 && <><div className="mini-divider" /><strong className="subheading">빠진 요소</strong><div className="missing-list">{result.missingElements.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div></>}</SectionCard></div>
      <SectionCard className="result-notice"><span>ⓘ</span><div><strong>이 결과가 평가하는 것</strong><p>이 결과는 프롬프트 구조와 지시 품질을 평가합니다. <b>AI의 최종 답변 품질은 평가하지 않습니다.</b></p></div></SectionCard>
      <div className="bottom-cta"><Button onClick={() => navigate('/evaluate')}>다른 프롬프트도 평가하기</Button><Button secondary onClick={() => navigate(compareUrl)}>친구와 비교하기</Button></div>
    </div>
  );
}

function ScoreBars({ result }: { result: PromptEvaluationResult }): ReactElement {
  return <div className="score-bars">{PROMPT_CATEGORIES.map((category) => { const item = result.categories[category.id]; return <div className="score-bar-row" key={category.id}><div className="bar-label"><span>{category.label}</span><b>{item.score}</b></div><div className="bar-track"><span style={{ width: `${item.score}%` }} className={item.score >= 70 ? 'strong' : item.score >= 40 ? 'partial' : 'weak'} /></div></div>; })}</div>;
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
  const [error, setError] = useState('');
  useEffect(() => {
    if (sharePayload?.k === 'saju') setResult(resultFromSajuShare(sharePayload));
  }, []);
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const validation = validateSajuInput(input);
    if (!validation.valid) { setError(validation.message ?? '입력을 확인해주세요.'); return; }
    try { const calculated = calculateSaju(input); setResult(calculated); writeStored(STORAGE_KEYS.saju, calculated); setError(''); notify('간소화된 규칙 기반 사주를 계산했습니다.'); } catch (caught) { setError(caught instanceof Error ? caught.message : '사주 계산에 실패했습니다.'); }
  };
  const share = result ? shareUrl('/saju', 'share', createSajuShareCode(result)) : '';
  const copyShare = async (): Promise<void> => { if (!share) return; const ok = await copyText(share); notify(ok ? '사주 요약 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const saveCard = (): void => { if (!result) return; downloadCanvas(createSajuResultCard(result), 'prompt-score-saju.png'); notify('사주 카드를 PNG로 저장했습니다.'); };
  return (
    <div className="page-wrap page-content">
      <section className="saju-moon-hero" aria-label="사주 분석 안내">
        <div className="saju-moon-copy">
          <span className="saju-hero-kicker">命理 · DATA CONSTELLATION</span>
          <h1>달빛 아래,<br /><em>나의 네 기둥을 읽다</em></h1>
          <p>사주의 원리를 현대적인 데이터 화면으로 정리합니다. 계산된 사실과 해석, 시기와 한계를 분리해 차분히 살펴보세요.</p>
          <div className="saju-hero-tags"><span>음양오행</span><span>사주팔자</span><span>대운·세운</span></div>
        </div>
        <div className="saju-hero-console" aria-hidden="true">
          <div className="console-moon">☾</div>
          <div className="console-orbit orbit-one" /><div className="console-orbit orbit-two" />
          <div className="console-stat"><small>FOUR PILLARS</small><b>年 月 日 時</b></div>
          <div className="console-stat console-stat-bottom"><small>FIVE ELEMENTS</small><b>木 火 土 金 水</b></div>
        </div>
      </section>
      <PageIntro title="사주를 구조적으로 읽어볼까요?" description="출생 정보와 원하는 주제를 바탕으로 계산 사실, 적용 규칙, 해석, 시기, 한계를 분리해 보여드립니다."><div className="privacy-pill warm"><span>☼</span> 입력은 이 브라우저에만 저장됩니다</div></PageIntro>
      <div className="saju-layout">
        <SectionCard>
          <form onSubmit={submit} className="saju-form">
            <div className="card-kicker">BIRTH INFORMATION</div>
            <h2>기본 정보를 입력해주세요</h2>
            <p className="field-note">출생지는 기록과 표시용으로만 사용하며, 현재 계산은 경도 기반 진태양시를 보정하지 않습니다.</p>
            <label>생년월일<input type="date" value={input.birthDate} onChange={(event) => setInput({ ...input, birthDate: event.target.value })} /></label>
            <div className="field-row"><label>달력<select value={input.calendar} onChange={(event) => setInput({ ...input, calendar: event.target.value as SajuInput['calendar'] })}><option value="solar">양력</option><option value="lunar">음력</option></select></label><label>성별(대운 선택 시)<select value={input.gender} onChange={(event) => setInput({ ...input, gender: event.target.value as SajuInput['gender'] })}><option value="unspecified">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label></div>
            {input.calendar === 'lunar' && <label className="check-label"><input type="checkbox" checked={input.leapMonth} onChange={(event) => setInput({ ...input, leapMonth: event.target.checked })} /> 윤달로 입력</label>}
            <label className="time-label">출생 시간<div className="time-row"><input type="time" value={input.birthTime} disabled={input.timeUnknown} onChange={(event) => setInput({ ...input, birthTime: event.target.value })} /><label className="check-label"><input type="checkbox" checked={input.timeUnknown} onChange={(event) => setInput({ ...input, timeUnknown: event.target.checked })} /> 시간 모름</label></div></label>
            <div className="field-row"><label>출생지<input value={input.birthPlace} onChange={(event) => setInput({ ...input, birthPlace: event.target.value })} placeholder="서울, 대한민국" /></label><label>시간대<input value={input.timezone} onChange={(event) => setInput({ ...input, timezone: event.target.value })} placeholder="Asia/Seoul" /></label></div>
            <label>서머타임<select value={input.daylightSaving} onChange={(event) => setInput({ ...input, daylightSaving: event.target.value as SajuInput['daylightSaving'] })}><option value="auto">시간대 규칙 자동</option><option value="standard">표준시로 고정</option><option value="daylight">서머타임으로 고정</option></select></label>
            <label>읽고 싶은 주제<select value={input.topic} onChange={(event) => setInput({ ...input, topic: event.target.value as SajuReadingTopic })}>{Object.entries(SAJU_TOPIC_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            {input.topic === 'compatibility' && input.compatibility && <div className="compatibility-fields"><h3>상대 정보</h3><p className="field-note">상대방의 동의와 정확한 정보를 확인한 뒤 입력해주세요.</p><label>상대 생년월일<input type="date" value={input.compatibility.birthDate} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, birthDate: event.target.value } })} /></label><div className="field-row"><label>상대 달력<select value={input.compatibility.calendar} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, calendar: event.target.value as SajuInput['calendar'] } })}><option value="solar">양력</option><option value="lunar">음력</option></select></label><label>상대 시간대<input value={input.compatibility.timezone} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, timezone: event.target.value } })} placeholder="Asia/Seoul" /></label></div><label className="time-label">상대 출생 시간<div className="time-row"><input type="time" value={input.compatibility.birthTime} disabled={input.compatibility.timeUnknown} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, birthTime: event.target.value } })} /><label className="check-label"><input type="checkbox" checked={input.compatibility.timeUnknown} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, timeUnknown: event.target.checked } })} /> 시간 모름</label></div></label><label>상대 출생지<input value={input.compatibility.birthPlace} onChange={(event) => setInput({ ...input, compatibility: { ...input.compatibility!, birthPlace: event.target.value } })} placeholder="서울, 대한민국" /></label></div>}
            <label>구체적인 질문(선택)<textarea className="saju-question" value={input.question} onChange={(event) => setInput({ ...input, question: event.target.value })} placeholder="예: 다음 분기에 일하는 방식을 어떻게 점검하면 좋을까요?" /></label>
            <details className="saju-context"><summary>가족·개인 배경 추가(선택)</summary><p className="field-note">직접 적은 내용만 참고합니다. 가족·유전·의료 사실은 차트로 추론하지 않습니다.</p><label>가족 맥락<textarea value={input.background.family} onChange={(event) => setInput({ ...input, background: { ...input.background, family: event.target.value } })} placeholder="직접 경험한 대화, 역할, 거리감 등을 적어주세요." /></label><label>개인 맥락<textarea value={input.background.personal} onChange={(event) => setInput({ ...input, background: { ...input.background, personal: event.target.value } })} placeholder="현재 고민이나 생활 맥락을 적어주세요." /></label></details>
            {input.calendar === 'lunar' && <p className="field-note">음력은 2020~2035년의 번들 앵커와 평균 삭망월을 사용하는 간소화 변환입니다.</p>}
            <label className="check-label consent-check"><input type="checkbox" checked={input.consent} onChange={(event) => setInput({ ...input, consent: event.target.checked })} /> 계산·결과 저장 및 오락·자기성찰 목적 사용에 동의합니다.</label>
            {error && <p className="error-text">{error}</p>}
            <Button type="submit">사주 계산하기 <span>→</span></Button>
          </form>
        </SectionCard>
        <SajuResult result={result} share={share} onCopy={copyShare} onCard={saveCard} />
      </div>
    </div>
  );
}

function resultFromSajuShare(payload: SajuSharePayload): SajuResult {
  return { version: 'saju-v1', inputSummary: '공유된 사주 요약 결과', simplified: true, calendarNote: '공유 링크에는 생년월일·출생 시간·지역을 포함하지 않습니다.', pillars: [], elements: payload.elements, yinYang: payload.yinYang, interpretations: { general: payload.theme, study: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', career: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', money: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', relationship: '공유된 요약에서는 개인 입력을 다시 계산하지 않습니다.', compatibility: '서로 다른 관점을 존중하며 기대치를 맞춰보세요.', reflection: payload.theme, future: '미래를 단정하지 않고 현재의 행동을 관찰해보세요.' }, disclaimer: '사주 결과는 오락과 자기 성찰을 위한 참고용입니다. 재정·교육·의료·진로·관계 결정을 위한 유일한 근거로 사용하지 마세요.' };
}

function SajuResult({ result, share, onCopy, onCard }: { result?: SajuResult; share: string; onCopy: () => void; onCard: () => void }): ReactElement {
  if (!result) return <EmptyState title="아직 사주 결과가 없어요" text="왼쪽 정보를 입력하면 오행과 성찰 키워드를 확인할 수 있어요." />;
  const maxElement = Math.max(...ELEMENT_ORDER.map((element) => result.elements[element]), 1);
  const tabs: Array<[keyof SajuResult['interpretations'], string]> = [['general', '종합'], ['study', '학습'], ['career', '커리어'], ['money', '금전'], ['relationship', '관계'], ['compatibility', '궁합'], ['reflection', '성찰'], ['future', '앞으로']];
  return <div className="saju-result-column">
    <SectionCard className="saju-summary">
      <div className="section-title-row"><div><span className="card-kicker">YOUR SAJU SNAPSHOT</span><h2>오행의 흐름</h2></div>{share && <button className="icon-action" onClick={onCopy}>↗</button>}</div>
      <p className="muted">{result.inputSummary}</p>
      <div className="saju-element-dashboard">
        <ElementConstellation elements={result.elements} maxElement={maxElement} />
        <div className="element-bars">{ELEMENT_ORDER.map((element) => <div className="element-row" key={element}><span style={{ color: ELEMENT_COLORS[element] }}>{ELEMENT_LABELS[element]}</span><div className="bar-track"><span style={{ width: `${(result.elements[element] / maxElement) * 100}%`, background: ELEMENT_COLORS[element] }} /></div><b>{result.elements[element]}</b></div>)}</div>
      </div>
      <div className="yin-yang"><span>음 {result.yinYang.yin}</span><div><i style={{ width: `${(result.yinYang.yin / Math.max(result.yinYang.yin + result.yinYang.yang, 1)) * 100}%` }} /><b style={{ width: `${(result.yinYang.yang / Math.max(result.yinYang.yin + result.yinYang.yang, 1)) * 100}%` }} /></div><span>양 {result.yinYang.yang}</span></div>
      <div className="result-actions compact"><Button secondary onClick={onCopy}>↗ 요약 링크</Button><Button secondary onClick={onCard}>↓ 카드 저장</Button></div>
    </SectionCard>
    <SectionCard><div className="card-kicker">FOUR PILLARS</div><h2>사주 네 기둥</h2>{result.pillars.length ? <div className="pillars-table">{result.pillars.map((pillar) => <div className={!pillar.known ? 'pillar-row unknown' : 'pillar-row'} key={pillar.name}><span>{pillar.name}</span><strong>{pillar.known ? `${pillar.stem}${pillar.branch}` : '미상'}</strong><small>{pillar.known ? `${pillar.stemElement} · ${pillar.branchElement} · ${pillar.yinYang}` : '출생 시간 미상'}</small></div>)}</div> : <p className="muted">공유 링크에는 개인 입력을 포함하지 않아 기둥 표를 표시하지 않습니다.</p>}<p className="field-note">{result.calendarNote}</p></SectionCard>
    <SectionCard><div className="card-kicker">REFLECTION MENU</div><h2>카테고리별 리딩</h2><div className="interpretation-grid">{tabs.map(([key, label]) => <article key={key}><span>{label}</span><p>{result.interpretations[key]}</p></article>)}</div></SectionCard>
    {result.chart && result.structuredReadings && <SajuAdvancedResult result={result} />}
    <div className="notice warm-notice">☼ {result.disclaimer}</div>
  </div>;
}

function ElementConstellation({ elements, maxElement }: { elements: SajuResult['elements']; maxElement: number }): ReactElement {
  return <div className="element-constellation" aria-label="오행 분포 시각화">
    <div className="constellation-grid" />
    <div className="constellation-core"><span>五</span><small>오행 균형</small></div>
    {ELEMENT_ORDER.map((element, index) => {
      const level = Math.max(elements[element] / maxElement, .18);
      return <div className="constellation-node" key={element} style={{ '--node-angle': `${index * 72 - 90}deg`, '--node-level': `${.5 + level * .48}` } as CSSProperties}>
        <i style={{ background: ELEMENT_COLORS[element], boxShadow: `0 0 ${8 + level * 16}px ${ELEMENT_COLORS[element]}` }} />
        <span>{ELEMENT_LABELS[element]}</span><b>{elements[element]}</b>
      </div>;
    })}
  </div>;
}

function SajuReadingSection({ title, readings }: { title: string; readings: SajuReadingItem[] }): ReactElement {
  return <SectionCard className="saju-reading-section"><div className="card-kicker">RULE-BASED READING</div><h2>{title}</h2><div className="saju-reading-items">{readings.map((reading) => <details key={reading.id}><summary><span>{reading.title}</span><b>{reading.confidence} 신뢰도</b></summary><div className="saju-reading-detail"><p><strong>차트 사실</strong>{reading.facts.join(' · ')}</p><p><strong>적용 규칙</strong>{reading.appliedRuleIds.join(' · ')}</p><p><strong>출처</strong>{reading.sourceReferences?.join(' · ') || '계산 방법 패널 참고'}</p><p><strong>해석</strong>{reading.interpretation}</p><p><strong>시기</strong>{reading.timing}</p><p><strong>실천 팁</strong>{reading.advice}</p><small>한계 · {reading.limitations.join(' ')}</small></div></details>)}</div></SectionCard>;
}

function SajuAdvancedResult({ result }: { result: SajuResult }): ReactElement {
  const chart = result.chart;
  const structured = result.structuredReadings;
  if (!chart || !structured) return <></>;
  const topicSections: Array<[SajuReadingKey, string]> = [
    ['overall', '사주 구조와 전체 흐름'],
    ['personality', '성향과 행동 패턴'],
    ['career', '커리어·업무 환경'],
    ['money', '돈·사업 경향'],
    ['relationships', '사랑·결혼·대인관계'],
    ['familyPatterns', '가족 관계와 반복 패턴'],
    ['healthLifestyle', '건강이 아닌 생활 리듬'],
    ['futureTrends', '앞으로의 기회와 전환'],
    ['daewoon', '대운'],
    ['compatibility', '두 사람 궁합 비교'],
    ['question', '사용자 질문'],
  ];
  return <>
    <SectionCard className="saju-facts-card"><div className="card-kicker">CALCULATED CHART FACTS</div><h2>계산된 차트</h2><div className="saju-fact-grid"><div><span>일간</span><strong>{chart.dayMaster.stem} · {chart.dayMaster.element}</strong></div><div><span>일간 강약</span><strong>{chart.dayMasterStrength}</strong></div><div><span>월령</span><strong>{chart.seasonalInfluence.season} · {chart.seasonalInfluence.element}</strong></div><div><span>오프셋</span><strong>UTC {chart.utcOffsetMinutes >= 0 ? '+' : ''}{chart.utcOffsetMinutes / 60}</strong></div><div><span>선택 주제</span><strong>{SAJU_TOPIC_LABELS[result.selectedTopic ?? 'overall']}</strong></div></div><div className="saju-advanced-pillars">{chart.pillars.map((pillar) => <article key={pillar.name}><span>{pillar.name}</span><strong>{pillar.known ? `${pillar.stem}${pillar.branch}` : '미상'}</strong><p>십신 {pillar.visibleTenGod ?? '미상'} · 12운성 {pillar.growthStage ?? '미상'}</p><small>장간 {pillar.hiddenStems?.map((hidden) => `${hidden.stem}(${hidden.tenGod})`).join(' · ') || '미상'}</small></article>)}</div><p className="field-note">{result.calendarNote}</p></SectionCard>
    <SectionCard className="saju-shinsal-card"><div className="card-kicker">SHINSAL · SCHOOL VARIANTS</div><h2>신살 지표</h2><div className="saju-indicator-grid">{chart.indicators.map((indicator) => <article key={indicator.id} className={indicator.present ? 'is-present' : ''}><div><strong>{indicator.label}</strong><span>{indicator.present ? '감지됨' : '감지되지 않음'}</span></div><p>{indicator.note}</p><small>{indicator.method} 신뢰도 {indicator.confidence}</small></article>)}</div></SectionCard>
    <SectionCard className="saju-timing-card"><div className="card-kicker">TIMING TABLE</div><h2>대운·세운·월운</h2><div className="saju-timing-columns"><div><h3>대운</h3>{chart.daewoon.length ? <ul className="saju-data-list">{chart.daewoon.map((cycle) => <li key={cycle.sequence}><strong>{cycle.startAge}~{cycle.endAge}세 · {cycle.pillar}</strong><span>{cycle.direction} · {cycle.note}</span></li>)}</ul> : <p className="muted">성별 미지정으로 대운 순·역행을 계산하지 않았습니다.</p>}</div><div><h3>세운</h3><ul className="saju-data-list">{chart.annualLuck.map((luck) => <li key={luck.label}><strong>{luck.label} · {luck.pillar}</strong><span>{luck.note}</span></li>)}</ul></div><div><h3>월운</h3><ul className="saju-data-list">{chart.monthlyLuck.slice(0, 6).map((luck) => <li key={luck.label}><strong>{luck.label} · {luck.pillar}</strong><span>{luck.note}</span></li>)}</ul></div></div></SectionCard>
    {topicSections.map(([key, title]) => <SajuReadingSection key={key} title={title} readings={structured.readings[key]} />)}
    <SectionCard className="saju-method-card"><div className="card-kicker">METHOD & LIMITATIONS</div><h2>계산 방법과 한계</h2><p className="method-version">지식베이스 {result.knowledgeBaseVersion ?? 'legacy'} · 적용 규칙 {result.appliedRules?.join(' · ') || '공유 요약에는 없음'}</p>{result.calculationMethod && <details><summary>계산 방법 펼치기</summary><div className="saju-method-detail"><p>{result.calculationMethod.sourceReferences.join(' · ')}</p><ul>{result.calculationMethod.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></div></details>}<ul className="saju-uncertainties">{structured.uncertainties.map((uncertainty) => <li key={uncertainty}>{uncertainty}</li>)}</ul></SectionCard>
  </>;
}

function TarotPage({ navigate, notify }: { navigate: Navigate; notify: Notify }): ReactElement {
  const query = new URLSearchParams(window.location.search);
  const payload = query.get('tarot') ? decodeSharePayload(query.get('tarot') ?? '') : null;
  const initialReading = payload?.k === 'tarot' ? drawTarot(payload.seed, payload.spread, payload.category) : readStored<TarotReading>(STORAGE_KEYS.tarot);
  const [spread, setSpread] = useState<1 | 3>(initialReading?.spread ?? 1);
  const [category, setCategory] = useState<TarotCategory>(initialReading?.category ?? 'general');
  const [reading, setReading] = useState<TarotReading | undefined>(initialReading);
  const [status, setStatus] = useState('');
  const draw = (): void => { const next = drawTarot(createTarotSeed(), spread, category); setReading(next); writeStored(STORAGE_KEYS.tarot, next); setStatus('새 카드를 뽑았습니다.'); notify('시드를 저장해 같은 결과를 다시 볼 수 있어요.'); navigate('/tarot'); };
  const code = reading ? createTarotShareCode(reading.seed, reading.spread, reading.category) : '';
  const url = code ? shareUrl('/tarot', 'tarot', code) : '';
  const share = async (): Promise<void> => { if (!url) return; const ok = await copyText(url); setStatus(ok ? '타로 공유 링크를 복사했어요.' : '링크 복사에 실패했어요.'); notify(ok ? '타로 공유 링크를 복사했습니다.' : '링크 복사에 실패했습니다.'); };
  const card = async (): Promise<void> => { if (!reading) return; const outcome = await shareCanvas(createTarotCard(reading), 'Prompt Score 타로', reading.summary); setStatus(outcome === 'shared' ? '공유 시트를 열었어요.' : 'PNG를 저장했어요.'); };
  return <div className="page-wrap page-content"><PageIntro eyebrow="Tarot · seeded reading" title="오늘의 카드를 한 장 뽑아볼까요?" description="정방향과 역방향을 포함한 78장 덱을 사용합니다. 버튼을 누르는 순간 시드가 만들어지고, 같은 링크에서 같은 결과를 확인할 수 있어요."><div className="privacy-pill mint"><span>✧</span> 결과는 시드로 재현 가능</div></PageIntro><div className="tarot-layout"><SectionCard className="tarot-controls"><div className="card-kicker">DRAW SETTINGS</div><h2>리딩을 고르세요</h2><div className="segmented"><button className={spread === 1 ? 'selected' : ''} onClick={() => setSpread(1)}>한 장</button><button className={spread === 3 ? 'selected' : ''} onClick={() => setSpread(3)}>세 장</button></div><label>관심 카테고리<select value={category} onChange={(event) => setCategory(event.target.value as TarotCategory)}>{Object.entries(TAROT_CATEGORY_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><Button onClick={draw}>카드 뽑기 <span>✧</span></Button><div className="tarot-mini-note">78장 표준 덱 · AI 생성 해석 없음</div></SectionCard><div className="tarot-result">{reading ? <><div className="tarot-result-head"><div><span className="card-kicker">{reading.categoryLabel} READING</span><h2>{reading.spread === 1 ? '지금의 한 장' : '현재 · 장애물 · 다음 행동'}</h2></div><div className="result-actions compact"><Button secondary onClick={share}>↗ 링크 복사</Button><Button secondary onClick={card}>▣ 카드 저장</Button></div></div><div className={`tarot-cards count-${reading.cards.length}`}>{reading.cards.map((item) => <TarotVisual key={`${item.card.id}-${item.position}`} item={item} />)}</div><SectionCard className="tarot-summary"><span className="eyebrow">오늘의 문장</span><p>{reading.summary}</p><div className="mini-divider" /><p className="muted">{TAROT_DISCLAIMER}</p></SectionCard>{status && <p className="success-text">{status}</p>}</> : <EmptyState title="카드를 기다리고 있어요" text="설정을 고른 뒤 카드를 뽑아보세요." button="카드 뽑기" onClick={draw} />}</div></div></div>;
}

function TarotVisual({ item }: { item: TarotReading['cards'][number] }): ReactElement {
  return <article className="tarot-card-wrap"><div className={item.reversed ? 'tarot-card reversed' : 'tarot-card'}><span className="tarot-corner">✦</span><div className="tarot-symbol">{item.card.arcana === 'Major' ? '✧' : item.card.arcana === 'Cups' ? '◡' : item.card.arcana === 'Swords' ? '⚔' : item.card.arcana === 'Wands' ? '♢' : '◈'}</div><strong>{item.card.name}</strong><small>{item.reversed ? 'REVERSED · 역방향' : 'UPRIGHT · 정방향'}</small><div className="tarot-keywords">{(item.reversed ? item.card.reversedKeywords : item.card.uprightKeywords).map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div><div className="tarot-reading"><span className="card-kicker">{item.position}</span><p>{item.interpretation}</p><strong>ADVICE</strong><p>{item.advice}</p><strong>CHECK</strong><p>{item.warning}</p></div></article>;
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
