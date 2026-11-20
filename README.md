# BytePlus RTC Conversational AI Demo

Talk to an AI agent in your browser, or share your screen and ask it to explain
what you see. This React demo supports OpenAI Realtime and a Flexible mode
where you choose the speech recognition, language model, and text-to-speech providers.

[Try the online demo](https://demo.byteplus.com/rtc/solution/aigc) · [CLI setup](#cli-setup) · [Manual setup](#manual-setup)

## Setup and configuration

Use Node.js 22 (>=22.13) and npm 10. Choose one setup path below.

### CLI setup

The CLI saves your RTC settings and your choices for Flexible (model and speech resources), Realtime (OpenAI API key), or both in `.env.local`.

```shell
npm install -g @byteplus/convo-cli
convo-cli auth login --browser=open
convo-cli agent resources --write
convo-cli dev
```

> Leave `BYTEPLUS_ACCESS_KEY_ID`, `BYTEPLUS_SECRET_ACCESS_KEY`, and `BYTEPLUS_MODEL_API_KEY` empty — the CLI signs requests with temporary credentials and resolves your ModelArk key (`BYTEPLUS_MODEL_API_KEY_ID`) at runtime.

### Manual setup

From the cloned Demo root, install dependencies and create your local configuration.

```shell
nvm use
npm run setup
cp .env.example .env.local
```

Fill in the shared settings and the credentials for your chosen mode in `.env.local`.

```dotenv
# Both modes
RTC_APP_ID=
RTC_APP_KEY=
BYTEPLUS_ACCESS_KEY_ID=
BYTEPLUS_SECRET_ACCESS_KEY=

# Flexible (default) with ModelArk and BytePlus speech
BYTEPLUS_MODEL_ENDPOINT_ID=
BYTEPLUS_MODEL_API_KEY=
BYTEPLUS_SEED_SPEECH_APP_ID=
BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN=

# Realtime
OPENAI_API_KEY=
```

For the BytePlus speech example, enable both ASR and TTS for your speech application.

For a custom LLM, set `CUSTOM_LLM_URL` to its exact HTTPS endpoint and `CUSTOM_LLM_API_KEY` to the corresponding credential.

Credential sources: [RTC console](https://console.byteplus.com/rtc/listRTC), [IAM key management](https://console.byteplus.com/iam/keymanage) and [ModelArk console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint).
For other Flexible providers, see [.env.example](.env.example).

Start the demo:

```shell
npm run dev
```

## Make a call

Open the web URL printed in the terminal.

- **Flexible (default)** — Select **Call now**.
- **Realtime** — Open **Configure**, switch **Cascading Solution** to **End to End Solution**, then select **Apply** and **Call now**.

## Optional configuration

- **ModelArk.** Set the default Seed endpoint in `BYTEPLUS_MODEL_ENDPOINT_ID` or enter it in **Configure → Model endpoint ID**. To use multiple endpoints, set `BYTEPLUS_MODEL_ENDPOINTS` to a JSON map of model names to endpoint IDs.
- **Session duration.** `SESSION_DURATION_SECONDS` defaults to 1800.
- **Local services.** The web port starts at 3000 and the API defaults to 3001. Set `PORT` or `SERVER_PORT` to override them. Restart after editing `.env.local`. To run each service separately, use `npm run dev:server` and `npm run dev:web`. Check API availability with `GET /health`.

### AI Gateway (Flexible)

In `.env.local`, set the secure WebSocket URL (`wss://`) and key for each module you use:

```dotenv
ASR_GATEWAY_API_URL=
ASR_GATEWAY_API_KEY=
TTS_GATEWAY_API_URL=
TTS_GATEWAY_API_KEY=
```

In **Configure**, select **AI Gateway** for ASR or TTS. For TTS, enter a voice ID.
Pitch, speed and volume are optional. Enter extra data and headers as JSON objects.

## Validation and build

```shell
npm run typecheck
npm test
npm run build
```

The build writes to `web/dist/`. Set `REACT_APP_AIGC_PROXY_HOST` to the deployed
API URL before building. On the API server, set the same `REACT_APP_AIGC_PROXY_HOST`
and set `DEMO_WEB_ORIGIN` to the exact frontend origin (for example,
`https://demo.example.com`). For Flexible mode with ModelArk, set
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
