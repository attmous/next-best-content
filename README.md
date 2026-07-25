# NextBestContent by Tripods

> From audience signals to publish-ready content.

NextBestContent helps creators answer: **Based on what my audience is saying,
what should I create next?** The MVP is designed to turn creator-provided
comments into three evidence-backed opportunities, choose an independent
destination, generate a six-scene YouTube Short or six-page LinkedIn document,
and run a transparent preflight check.

## Current status

The repository contains a credential-free synthetic journey plus a
schema-validated live backend. Operators can enable model-backed creator
imports immediately, while live YouTube reading remains behind separate
configuration and policy-approval gates.

| Route | Responsibility | Current behavior |
| --- | --- | --- |
| `POST /api/analyze` | Normalize creator-owned imports or a gated YouTube source and return exactly three evidence-backed signals | Implemented with OpenAI structured output |
| `POST /api/generate` | Turn one signal into a six-scene YouTube Short or six-page LinkedIn document draft | Implemented with OpenAI structured output |
| `POST /api/preflight` | Apply deterministic quality and safety checks to a content pack | Implemented with typed `200`, `400`, `413`, and `500` responses |
| `GET /api/capabilities` | Tell the UI which integrations and outputs are actually available | Implemented from server-side configuration and policy gates |

### What works now

- A responsive Listen → Decide → Create → Preflight journey at `/`.
- A registry-driven source and destination picker: YouTube and creator imports
  on the source side; YouTube Shorts and LinkedIn document posts on the output
  side.
- Accessible, self-contained inline SVG icons for platforms, actions, statuses,
  and warnings, paired with visible text labels and no remote icon dependency.
- An explicit, clearly labeled synthetic demo with exactly three audience
  signals and six-scene Short or six-slide carousel drafts.
- Client-side JSON, CSV, and pasted-text comment import preparation with
  contract validation, row warnings, and a 100-comment cap.
- Model-backed analysis that returns exactly three source-backed opportunities:
  a request, an unanswered question, and a strong reaction.
- Creator-owned YouTube, LinkedIn, or other comment imports with explicit
  rights confirmation and source provenance.
- A policy-gated YouTube Data API adapter for public or unlisted video metadata
  and up to 100 top-level comments.
- Destination-aware editing, output switching, and seven transparent preflight
  checks.
- Caption/post-text copying, storyboard Markdown download, locally rendered
  carousel PNGs, and local multi-page PDF export for LinkedIn documents.
- Safe request validation, sanitized typed API errors, unique request IDs, and
  `Cache-Control: no-store`.

Direct LinkedIn comment reads and social publishing are not represented as
working capabilities. The shippable LinkedIn path is a creator-owned
CSV/JSON import followed by an editable document draft and local export.
LinkedIn text posts are gated by the current content contract; X and Facebook
are clearly labeled as coming soon. Generated narration and guaranteed MP4
rendering remain optional future work.

## Source modes

All analysis results carry explicit provenance, with live and imported sources
established by the server. Synthetic data is visibly identified and never
silently replaces creator-provided or live data. Until the stateless
analysis-to-generation handoff is signed, the public generation route
deliberately marks output provenance as unknown.

| Source | MVP intent | Status |
| --- | --- | --- |
| Creator import | Prepare and analyze up to 100 comments supplied as JSON, CSV, or pasted text by a creator who has the right to use them | Client-side parsing and model-backed analysis implemented |
| Synthetic demo | Reproduce the full flow with clearly labeled, fictional fixture data | Implemented; explicit opt-in only |
| YouTube Data API | Read video metadata and top-level comments through an isolated adapter | Implemented; disabled by default |
| LinkedIn direct API | Read comments from a creator's post with approved Community Management API access | Unavailable in the MVP; use creator import |

The YouTube adapter may be enabled only when both `ENABLE_YOUTUBE_API=true` and
`YOUTUBE_POLICY_APPROVED=true`, after the project owner explicitly confirms the
use case and implementation comply with the current
[YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies?hl=en),
including any required amendment or audit. A configured `YOUTUBE_API_KEY` is
also required. This project does not use yt-dlp or scrape YouTube.

## Destinations

Source and destination are independent: for example, a LinkedIn-tagged
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

The model adapter uses the official OpenAI Responses endpoint with
[strict structured output](https://developers.openai.com/api/docs/guides/structured-outputs)
and `store: false`. The default
[`gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
model balances intelligence and cost. A server-owned `OPENAI_API_KEY` is
ignored unless `ENABLE_OPENAI_API=true`. Request-scoped keys are rejected
unless `ENABLE_OPENAI_BYOK=true`; when enabled, they take precedence for that
request and are never persisted, cached, logged, or returned.

This repository does not yet provide user authentication or durable
rate-limiting. Do not expose a deployment with a server-owned paid key to the
public internet without deployment-level access control, quotas, and abuse
prevention.

Analysis provenance is established by the server while it handles the source.
Because the MVP is stateless, `/api/generate` does not trust a caller-provided
provenance label and marks the generated pack as unknown until a signed
analysis-to-generation handoff is introduced.

## Creator import format

`POST /api/analyze` accepts normalized JSON. A browser may parse a creator-owned
CSV locally and submit the same shape; the server never fetches an arbitrary
import URL. A synthetic CSV template is available at
[`examples/synthetic-comments.csv`](examples/synthetic-comments.csv).

```json
{
  "source": {
    "type": "import",
    "platform": "linkedin",
    "rightsConfirmed": true,
    "comments": [
      {
        "author": "Audience member 1",
        "text": "Could you show the complete setup?",
        "likeCount": 4
      },
      {
        "author": "Audience member 2",
        "text": "Which option works best for a beginner?",
        "likeCount": 2
      },
      {
        "author": "Audience member 3",
        "text": "The worked example was the most useful part.",
        "likeCount": 7
      }
    ]
  }
}
```

Imports require at least three usable comments for analysis. The API accepts at
most 100 and never passes author names or like counts to the model; those fields
are reattached only after the model selects opaque evidence IDs.

All JSON routes reject request bodies larger than 2 MiB with a typed
`413 VALIDATION_ERROR`.

## Local setup

Use Node.js 24, matching `.nvmrc` and the CI runtime. The package metadata keeps
Node.js 22 as its minimum compatibility floor, but Node.js 24 is the verified
release target.

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
| `ENABLE_OPENAI_API` | `false` | Permit use of the server-owned OpenAI key |
| `OPENAI_API_KEY` | blank | Server-owned OpenAI credential |
| `OPENAI_MODEL` | `gpt-5.6-terra` | Responses API model identifier |
| `OPENAI_REASONING_EFFORT` | `medium` | Reasoning effort for analysis and generation |
| `OPENAI_TIMEOUT_MS` | `45000` | Whole model-operation timeout, capped below the route budget |
| `OPENAI_MAX_INPUT_CHARS` | `600000` | Maximum serialized source input size |
| `ENABLE_OPENAI_BYOK` | `false` | Permit request-scoped model credentials |
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
publishing, X/Twitter and Facebook adapters, teams, billing, a general
autonomous agent, YouTube scraping, and guaranteed MP4 rendering are outside
this hackathon MVP. Optional n8n, ElevenLabs, and fal integrations must degrade
to the storyboard or document draft rather than break the core journey.

## License

[MIT](LICENSE) (c) 2026 Moustafa Attia.
