# API Server

The Koa server generates RTC room tokens, injects provider credentials and calls BytePlus OpenAPI.

Configure the root `.env.local` following the [project README](../README.md#configuration-overview).

Start both services from the repository root:

```shell
npm run dev
```

For Realtime mode:

```shell
npm run dev:realtime
```

To start the API server separately:

```shell
npm run dev:server
```

The API server loads the root `.env.local` and listens on port `3001` by default.

CLI-generated projects delegate RTC token issuance and VoiceChat Start/Stop to `byteplus-rtc`.
Set `RTC_APP_ID` and the resource selectors in the root `.env.local`.
When both BytePlus AK/SK variables are set, the server calls BytePlus OpenAPI.
