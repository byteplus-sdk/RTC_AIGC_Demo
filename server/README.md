# API server

The Koa server issues RTC room tokens and manages VoiceChat sessions through
BytePlus OpenAPI or an authenticated CLI process.

Configure the root `.env.local` following the
[project README](../README.md#setup-and-configuration), then run from the repository root:

```shell
npm run dev:server
```

The API listens on port 3001 by default. Set `SERVER_PORT` to change it.

CLI-generated projects use `BYTEPLUS_RTC_CLI_PATH` and `BYTEPLUS_RTC_PROJECT_DIR`
to delegate token issuance and VoiceChat Start/Stop to the CLI. Set `RTC_APP_ID`
and the resource selectors in the root `.env.local`. With both BytePlus access
key variables set, the server calls BytePlus OpenAPI.

| Endpoint | Response |
| :-- | :-- |
| `GET /health` | `{ ok, agentMode }` reports API availability and authentication mode. |
| `POST /preflight?action=StartVoiceChat` | `{ ready, issues }` reports provider configuration and access checks. The web app calls it when settings change and before joining a room. |
