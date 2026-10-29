# Conversational AI Demo

A React demo for voice and video conversations with AI agents using BytePlus RTC,
speech recognition, language models, and text-to-speech.

[Online demo](https://demo.byteplus.com/rtc/solution/aigc)

## Setup and configuration

Use Node.js 22 (>=22.13) and npm 10. Run from the repository root:

```shell
nvm use
npm run setup
cp .env.example .env.local
```

Set `RTC_APP_ID`, `RTC_APP_KEY`, `BYTEPLUS_ACCESS_KEY_ID`, and
`BYTEPLUS_SECRET_ACCESS_KEY` in `.env.local`.

- Flexible mode: configure credentials for the ASR, LLM, and TTS providers selected in the UI.
- Realtime mode: set `OPENAI_API_KEY`.

[.env.example](.env.example) lists the provider and optional feature settings.
Get credentials from the [RTC console](https://console.byteplus.com/rtc/listRTC),
[IAM key management](https://console.byteplus.com/iam/keymanage), and
[ModelArk console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint).
Enable the selected ASR/TTS services for your speech application.
Git excludes `.env.local`; restart the services after editing it.

`BYTEPLUS_MODEL_ENDPOINT_ID` sets the default Seed model endpoint.
`BYTEPLUS_MODEL_ENDPOINTS` maps model names to endpoint IDs as a JSON object.
You can edit model settings in Configure. `SESSION_DURATION_SECONDS` sets the
session limit (default: 1800 seconds).

## Quick start

```shell
npm run dev
```

This starts the API and web app in Realtime mode. Use `npm run dev:flexible`
for Flexible mode, then open the web URL printed at startup.

The web app selects an available port starting at 3000. Set `PORT` to require
a specific port; `SERVER_PORT` defaults to 3001. Startup reports missing
configuration and occupied ports. `GET /health` checks API availability.

To run the services in separate terminals, use `npm run dev:server` and
`npm run dev:web` (or `npm run dev:web:flexible`).

## Validation and build

```shell
npm run typecheck
npm test
npm run build
```

The build writes to `web/dist/`. Set `REACT_APP_AIGC_PROXY_HOST` to the deployed
API URL before building. For Flexible mode with ModelArk, set
`REACT_APP_MODEL_ENDPOINT_ID` to populate the default endpoint.
`REACT_APP_RTC_APP_ID` overrides the AppID returned by the API server.

## Troubleshooting

| Issue | Check |
| :-- | :-- |
| No response or stuck on "AI preparing..." | Review the provider check in the UI, credentials in `.env.local`, service activation, and quota. See the [setup guide](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1315561). |
| `token_error` | Check the token request in the browser's Network panel and the API logs. Confirm that the AppID, RoomId, and UserId match the token. |
| "The task has been started" | Stop the existing conversation before starting another with the same RoomId and UserId. |
| Microphone or camera unavailable | Check browser and operating system device permissions. |
| "Invalid 'Authorization' header" | Check `BYTEPLUS_ACCESS_KEY_ID` and `BYTEPLUS_SECRET_ACCESS_KEY` in `.env.local`. |

## Related documentation

- [Overview](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310537)
- [Demo experience](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310559)
- [Solution integration](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310560)
- [API server](server/README.md)

## Security and privacy

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Changelog

### OpenAPI Updates
Refer to [OpenAPI Updates](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-116363) for updates related to Real-time Conversational AI.

### Release Notes

#### [1.5.0]
- 2026-10-22
    - Refresh the UI with scene presets, multilingual voices, screen reading, and AI tutor avatars.
    - Add model configuration, deep thinking, vision input selection, web search, and MCP settings.
    - Upgrade the RTC Web SDK to 4.69.3 and add a configurable session timer.
    - Align provider parameters, credentials, and avatar configuration with the VoiceChat APIs; add request contract tests.

#### [1.4.0]
- 2026-07-29
    - Support Akool digital human
- 2026-01-27
    - Upgrade API endpoints and region
- 2025-11-06
    - Support BytePlus Avatar

- 2025-08-04
    - Upgrade SDK version to 4.67.2
    - Support BytePlus ASR（Speech-to-Text (ASR) - Streaming）
    - fix AI Settings UI
- 2025-07-08
    - Upgrade SDK version to 4.66.20 
- 2025-06-16
    - Updated Demo guide and fixed some parameter errors.
    - Modify the Endpoint ID of Byteplus Ark Model. which needs to be filled in by the user.
- 2025-06-06
    - Initial Release
