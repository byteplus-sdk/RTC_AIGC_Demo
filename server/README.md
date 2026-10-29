# API server

The Koa server generates RTC room tokens, injects provider credentials, and calls
BytePlus OpenAPI.

Configure the root `.env.local` following the
[project README](../README.md#setup-and-configuration), then run from the repository root:

```shell
npm run dev:server
```

The API listens on port 3001 by default. Set `SERVER_PORT` to change it.

| Endpoint | Response |
| :-- | :-- |
| `GET /health` | `{ ok }` reports API availability. |
| `POST /preflight?action=StartVoiceChat` | `{ ready, issues }` reports provider configuration and access checks. The web app calls it when settings change and before joining a room. |
