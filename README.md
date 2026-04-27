# opusx

## OpusX

OpusX is a full-stack API proxy platform that issues custom `sk-ox-*` keys and proxies requests to Anthropic without exposing the real Anthropic API key to end users.

## Stack

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma
- NextAuth (credentials + magic link)
- Recharts + react-hot-toast

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Run `pnpm install`.
3. Run Prisma migration and generation:
   - `pnpm prisma:generate`
   - `pnpm prisma:migrate`
4. Seed admin and sample key:
   - `pnpm db:seed`
5. Start app:
   - `pnpm dev`

## Key API Endpoints

- `POST /api/v1/messages` - Anthropic proxy route
- `POST /api/v1/chat/completions` - OpenAI compatible route
- `GET /api/v1/models` - model list
- `POST /api/key-check` - public key status checker
- `GET/POST /api/user/keys` - user key management
- `GET /api/user/usage` - user usage logs
- `GET /api/admin/stats` - admin platform stats

## Test With Claude Code

Use:

```bash
ANTHROPIC_BASE_URL=http://localhost:3000/api
ANTHROPIC_API_KEY=sk-ox-your-key
```

## Notes

- Real Anthropic key is never exposed in responses.
- API routes return `{ error: string }` on failures.
- API keys are shown in full only once at creation time.
