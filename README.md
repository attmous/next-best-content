# NextBestContent by Tripods

> From audience signals to publish-ready content.

NextBestContent helps creators answer: **Based on what my audience is saying,
what should I create next?** The MVP is designed to turn creator-provided
comments into three evidence-backed opportunities, choose an independent
destination, generate a six-scene YouTube Short or six-page LinkedIn document,
and run a transparent preflight check.

## Current status

The repository now contains a working, credential-free MVP journey. The web
experience supports an explicit synthetic demo from audience signals through
content editing, deterministic preflight, and honest local exports. Live
analysis and generation remain deliberately disabled until their policy-gated
providers are implemented.

| Route | Responsibility | Current behavior |
| --- | --- | --- |
| `POST /api/analyze` | Normalize a source and return exactly three evidence-backed signals | Explicit `501 Not Implemented` stub |
| `POST /api/generate` | Turn one signal into exactly six Short scenes or carousel slides | Explicit `501 Not Implemented` stub |
| `POST /api/preflight` | Apply deterministic quality and safety checks to a content pack | Implemented with typed `200`, `400`, and `500` responses |

### What works now

- A responsive Listen → Decide → Create → Preflight journey at `/`.
- A registry-driven source and destination picker: YouTube and creator imports
  on the source side; YouTube Shorts and LinkedIn document posts on the output
  side.
- An explicit, clearly labeled synthetic demo with exactly three audience
  signals and six-scene Short or six-slide carousel drafts.
- Client-side JSON, CSV, and pasted-text comment import preparation with
  contract validation, row warnings, and a 100-comment cap. Analysis still
  stops at the explicit `501` until the backend route is implemented.
- Destination-aware editing, output switching, and seven transparent preflight
  checks.
- Caption/post-text copying, storyboard Markdown download, locally rendered
  carousel PNGs, and local multi-page PDF export for LinkedIn documents.
- Safe request validation and typed API errors with `Cache-Control: no-store`.

MP4 rendering, generated narration, live YouTube or LinkedIn analysis,
model-backed generation, and social publishing remain unavailable. LinkedIn
text posts are gated by the current content contract; X and Facebook are
clearly labeled as coming soon. The interface labels those limitations instead
of returning plausible fake results.

## Source modes

All outputs will carry provenance. Synthetic data must be visibly identified
and must never silently replace creator-provided or live data.

| Source | MVP intent | Status |
| --- | --- | --- |
| Creator import | Prepare up to 100 comments supplied as JSON, CSV, or pasted text by a creator who has the right to use them | Client-side parsing implemented; analysis route still `501` |
| Synthetic demo | Reproduce the full flow with clearly labeled, fictional fixture data | Implemented; explicit opt-in only |
| YouTube Data API | Read video metadata and top-level comments through an isolated adapter | Scaffolded, disabled by default |
| LinkedIn direct API | Read comments from a creator's post with approved Community Management API access | Gated; import preparation offered instead |

The YouTube adapter may be enabled only when both `ENABLE_YOUTUBE_API=true` and
`YOUTUBE_POLICY_APPROVED=true`, after the project owner explicitly confirms the
use case and implementation comply with the current
[YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies?hl=en),
including any required amendment or audit. This project does not scrape
YouTube.

## Destinations

Source and destination are independent: for example, a future LinkedIn-tagged
import can produce a YouTube Short, while a YouTube-derived signal can produce
a LinkedIn document.

| Destination | Current behavior |
| --- | --- |
| YouTube Short | Six-scene vertical storyboard with timing and voiceover copy |
| LinkedIn document post | Six-page editor with post copy, per-page PNGs, and a locally assembled PDF |
| LinkedIn text post | Unavailable until the shared contract supports text packs |
| X / Twitter | Coming soon; no draft or publish action |
| Facebook | Coming soon; no draft or publish action |

The YouTube Studio and LinkedIn links on the export screen are convenience
links only. Nothing is published automatically and no OAuth credentials are
stored in the browser.

## Model-key handling

The planned model adapter uses an OpenAI-compatible HTTP API. A caller may
supply a BYOK credential for one request; the server must not persist, cache,
log, or return that key, and model routes must use `Cache-Control: no-store`.
A server-owned `LLM_API_KEY` is ignored unless
`ENABLE_SERVER_LLM_KEY=true`. Operators remain responsible for deployment
access controls, abuse protection, and provider terms.

## Local setup

Use Node.js 22 or newer, matching the repository's declared engine.

```bash
npm ci
# Copy .env.example to .env.local; the base works with every feature flag off.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run lint` | Run the repository lint checks |
| `npm run typecheck` | Validate TypeScript without emitting files |
| `npm run test` | Run the Vitest contract and route tests once |
| `npm run build` | Create a production build and run framework/type validation |
| `npm run check` | Run lint, type-check, tests, and production build |
| `npm run start` | Serve a completed production build |

### Environment

Secrets stay blank in `.env.example` and belong only in `.env.local` or the
deployment secret store.

| Variable | Example default | Purpose |
| --- | --- | --- |
| `LLM_PROVIDER` | `openai-compatible` | Select the isolated model provider |
| `LLM_MODEL` | blank | Provider model identifier |
| `LLM_BASE_URL` | blank | OpenAI-compatible API base URL |
| `ENABLE_SERVER_LLM_KEY` | `false` | Permit use of the server-owned model key |
| `LLM_API_KEY` | blank | Optional server-owned model key |
| `ENABLE_YOUTUBE_API` | `false` | First live YouTube source gate |
| `YOUTUBE_POLICY_APPROVED` | `false` | Required explicit policy-approval gate |
| `YOUTUBE_API_KEY` | blank | YouTube Data API credential |
| `ENABLE_N8N` | `false` | Enable the optional n8n handoff |
| `N8N_WEBHOOK_URL` | blank | n8n rendering webhook |
| `N8N_WEBHOOK_SECRET` | blank | Secret used to authenticate the handoff |
| `ENABLE_ELEVENLABS` | `false` | Enable optional narration |
| `ELEVENLABS_API_KEY` | blank | ElevenLabs credential |
| `ELEVENLABS_VOICE_ID` | blank | Narration voice identifier |
| `ELEVENLABS_MODEL_ID` | `eleven_multilingual_v2` | Narration model identifier |
| `ENABLE_FAL` | `false` | Enable optional fal media generation |
| `FAL_KEY` | blank | fal credential |

## Architecture and parallel work

- `src/contracts/` is the Zod-backed source of truth for public requests,
  responses, errors, and provenance.
- `src/server/` owns use-case logic, policy gates, providers, and optional
  integration adapters.
- `src/app/api/` contains thin App Router handlers; the remaining `src/app/`
  owns the web experience.
- The MVP is stateless: no authentication, database, or permanent history.

`main` is the green integration baseline. Contract, server API, frontend, and
foundation work stays inside its ownership boundary and merges through reviewed
pull requests only after relevant tests, lint, and build checks pass. Changes to
shared contracts, package files, or the lockfile require coordination before
editing.

## Out of scope

Authentication, permanent history, direct LinkedIn ingestion, social
publishing, teams, billing, a general autonomous agent, YouTube scraping, and
guaranteed MP4 rendering are outside this hackathon base. Optional n8n,
ElevenLabs, and fal integrations must degrade to the storyboard or carousel
rather than break the core journey.

## License

[MIT](LICENSE) (c) 2026 Moustafa Attia.
