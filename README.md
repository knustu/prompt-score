# Prompt Score

Korean-first responsive MVP for evaluating prompt-writing habits with deterministic, local rules. The app does not call an LLM API, generative AI API, embedding model, vector database, fortune-telling API, or other external AI service.

## Run

```bash
npm install
npm run dev
```

## Cloudflare Pages

This is a Vite React SPA prepared for Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Wrangler configuration: `wrangler.jsonc`

Cloudflare Pages' default SPA fallback replaces the former Vercel rewrite because the build has no top-level `404.html`.

Local Pages preview:

```bash
npm run pages:dev
```

Direct deployment after creating the Pages project and authenticating Wrangler:

```bash
npm run pages:deploy
```

### Automatic deployment from GitHub

The `prompt-score` Cloudflare Pages project is connected to this GitHub repository, so Cloudflare handles the production deployment when `main` changes. The repository workflow at `.github/workflows/ci.yml` only runs `npm test` and `npm run build` as a deployment gate; it does not require Cloudflare API secrets or perform a second deployment.

For a manual deployment, use `npm run pages:deploy` after authenticating Wrangler. The project does not use Vercel.

Checks:

```bash
npm run lint       # TypeScript lint/type safety check
npm run typecheck
npm test
npm run build
```

## Product flows

- `/` — landing page and privacy/disclaimer overview
- `/evaluate` — five challenge configurations plus free-form prompt evaluation
- `/results` — score, ten category bars, category details, evidence, strengths, weaknesses, recommendations, result sharing, PNG/Web Share card
- `/saju` — simplified rule-based Saju input/result flow
- `/tarot` — one-card or three-card seeded 78-card Tarot reading
- `/compare` — summary-code-based friend comparison

## Prompt scoring

`src/domain/prompt/PromptEvaluationEngine.ts` is pure and deterministic for the same prompt/challenge input. It combines term matches with structure checks for:

- goal and intent clarity (15)
- context and background (10)
- audience and tone (5)
- constraints and requirements (10)
- role assignment (10)
- desired output format (15)
- examples or references (10)
- step-by-step decomposition (10)
- verification and quality control (10)
- specificity and ambiguity control (5)

Each category is 0–100 and contributes through its weight to a 0–100 total. Category levels are weak (0–39), partial (40–69), and strong (70–100). Korean and English signals are defined in `PromptRuleDefinitions.ts`; challenge-specific signals and examples live in `ChallengeDefinitions.ts`; Korean feedback templates live in `PromptFeedbackTemplates.ts`.

The result label describes prompt-writing behavior only: structured, goal-focused, format-oriented, exploratory, or balanced. It is not personality analysis and does not evaluate the AI's final answer.

## Saju calculation and interpretation

The Saju flow is split into three pure, inspectable modules:

- `SajuCalculationEngine.ts` calculates year/month/day/hour pillars, hidden stems, Ten Gods, weighted Five Elements, seasonal influence, Yin-Yang, relations (합·충·해·파·형), 12 growth stages, Daewoon, annual/monthly tables, and explicitly defined Shinsal indicators.
- `SajuKnowledgeBase.ts` is the versioned editable rule base (`saju-kb-2026.1`). Each applied rule stores a rule ID and source/method reference.
- `SajuInterpretationEngine.ts` combines only chart facts and matched rules into facts → rules → interpretation → timing → confidence/limitations → practical advice.

Calculation method `saju-standard-v2` uses:

- civil-time pillars with a midnight day boundary and bundled civil-date solar-term boundaries;
- a Julian-day sexagenary day calculation and two-hour hour-branch buckets;
- IANA timezone validation through `Intl.DateTimeFormat`, with automatic or explicitly selected DST handling;
- solar input for 1900–2100 and lunar input for 2020–2035 using bundled New Year anchors plus a documented mean synodic-month approximation;
- gender/year-stem direction for Daewoon. If gender is not selected, Daewoon is not inferred;
- documented school-specific tables for Do-hwa, Yeok-ma, Hwa-gae, Cheon-eul-gwi-in, Baek-ho, Goe-gang, and Gwimun-gwan.

The lunar conversion, solar-term instant, longitude/true-solar-time correction, and school-specific Shinsal/Daewoon rules are intentionally labeled as limitations rather than presented as almanac-grade certainty. Unknown birth time produces an unknown hour pillar. Family readings use only directly supplied background signals and never infer medical, genetic, or hidden family facts.

The Saju output is cultural, entertainment, and self-reflection content. It is not scientifically proven, professional advice, medical diagnosis, or a guaranteed prediction.

## Tarot rules

`TarotCardData.ts` contains 78 structured cards: 22 Major Arcana and 56 Minor Arcana. `TarotEngine.ts` uses a seeded deterministic shuffle, draws without replacement, and determines upright/reversed orientation from the same seeded PRNG. A seed is generated only on the draw action, stored with the reading, and encoded in Tarot share links. The link stores no birth information or prompt text.

Interpretations are fixed templates combining card meaning, orientation, category, spread position, advice, and warning. They are not LLM-generated predictions.

## Privacy and sharing

- Prompt evaluation runs in the browser. No prompt is uploaded.
- Local results are stored in `localStorage` and can be removed with “내 로컬 데이터 삭제”.
- Prompt share codes contain only version, overall score, category scores, level, and neutral style label.
- Tarot share codes contain only version, seed, spread, and category.
- Saju share codes contain only element counts, yin-yang summary, and a reflection theme; birth date, birth time, gender, and timezone stay local.
- Saju background text is converted to a small set of explicit keyword signals before local result storage; raw family/personal notes are not stored in the Saju result.
- Share payloads use the versioned `ps1.` URL-safe codec in `ShareCodec.ts`.
- Result cards omit the original prompt unless a future UI explicitly adds an opt-in prompt inclusion control.

## Known limitations

- This is a local MVP with no account, backend, database, or cross-device result history.
- Prompt rules are transparent heuristics; they do not understand meaning or judge answer quality.
- Saju lunar conversion and solar-term boundaries are simplified and must not be treated as an almanac-grade calculation.
- Result cards use a small canvas renderer rather than a full design/export system.
- Browser clipboard, Web Share, and PNG download behavior depends on device support.
