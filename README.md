# Conversational AI Demo

Demo Online: https://demo.byteplus.com/rtc/solution/aigc

## Introduction
- In the AIGC conversation scenario, the Volcengine AIGC - RTC Server cloud service provides an end - to - end AIGC capability link based on streaming voice by integrating RTC audio and video stream processing, ASR voice recognition, large - model interface call integration, and TTS voice generation capabilities.
- Users only need to call the standard - based OpenAPI interfaces to configure the required ASR, LLM, and TTS types and parameters. The Volcengine cloud computing service is responsible for edge user access, cloud resource scheduling, audio and video stream compression, text - to - voice conversion processing, and data subscription and transmission. This simplifies the development process, allowing developers to focus more on the training and debugging of the core capabilities of large models, thus rapidly promoting the innovation of AIGC product applications.
- At the same time, Volcengine RTC has mature technologies such as audio 3A processing and video processing, as well as large - scale audio and video chat capabilities. It can enable AIGC products to more conveniently support scenarios such as multimodal interaction and multi - person interaction, maintaining the naturalness and efficiency of interaction.

## Setup and Configuration

Requires Node.js 18 or later. Run in the repository root:

```shell
npm run setup
cp .env.example .env.local
```

Fill in `.env.local` following the comments in [.env.example](.env.example):

- **Both modes:** `RTC_APP_ID`, `RTC_APP_KEY`, `BYTEPLUS_ACCESS_KEY_ID`, `BYTEPLUS_SECRET_ACCESS_KEY`.
- **Realtime:** add `OPENAI_API_KEY`.
- **Flexible:** choose ASR, LLM and TTS providers in the UI, then fill their credential groups. Custom LLM uses `CUSTOM_LLM_API_KEY`, falling back to `OPENAI_API_KEY`.
- **Optional features:** fill search or avatar credentials when enabled.
- **Local settings:** `PORT=3000`, `SERVER_PORT=3001`; an empty `REACT_APP_AIGC_PROXY_HOST` uses the development proxy.

Get credentials from the [RTC console](https://console.byteplus.com/rtc/listRTC),
[IAM key management](https://console.byteplus.com/iam/keymanage) and
[ModelArk console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint).
Enable the selected ASR/TTS services for your BytePlus speech application.
`.env.local` is excluded from Git.

## Quick Start

Start the server and web application in Realtime mode:

```shell
npm run dev
```

For Flexible mode:

```shell
npm run dev:flexible
```

Open http://localhost:3000. The API server runs at http://localhost:3001.
Both commands load the root `.env.local`. Restart after changing configuration.

**Validation and Build**

```shell
npm run typecheck
npm test
npm run build
```

The production web output is written to `web/build/`.
For production builds, set `REACT_APP_AIGC_PROXY_HOST` to the API server URL.
`REACT_APP_RTC_APP_ID` takes precedence when set; otherwise the browser reads
`RTC_APP_ID` from the API server on first join. Reload the page after changing it.
For Flexible mode with ModelArk, also set `REACT_APP_MODEL_ENDPOINT_ID` at build time.

### FAQ
| Issue | Solution |
| :-- | :-- |
| **After starting the AI agent, there is no response to conversation, or it keeps showing "AI preparing..."** | <li>This may be due to incomplete console permissions. Please refer to the [setup process](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1315561) to confirm all required operations are completed. This is the most likely cause, so please carefully verify that all necessary permissions have been granted.</li><li>There may be parameter issues, such as case sensitivity or type errors. Please double-check for these types of problems.</li><li>Related resources may not be enabled or there may be insufficient quota/overdue payments. Please verify again.</li><li>**Check `BYTEPLUS_MODEL_ENDPOINT_ID` and the provider credentials in `.env.local`.**</li> |
| **Browser shows `Uncaught (in promise) r: token_error` error** | Please check if the RTC Token filled in your project is valid. Verify that the UserId, RoomId used to generate the Token, and the Token itself match what's configured in the project. The Token may also be expired - try regenerating it. |
| **[StartVoiceChat]Failed(Reason: The task has been started. Please do not call the startup task interface repeatedly.)** error | If you've set fixed values for RoomId and UserId, repeatedly calling startAudioBot will cause errors. Simply call stopAudioBot first, then call startAudioBot again. |
| Why aren't my devices working normally even though my microphone and camera are functioning? | This may be due to device permissions not being granted. Please check device permission settings. |
| API calls return "Invalid 'Authorization' header, Pls check your authorization header" error | Check `BYTEPLUS_ACCESS_KEY_ID` and `BYTEPLUS_SECRET_ACCESS_KEY` in `.env.local`. |
| What is RTC? | **R**eal **T**ime **C**ommunication. For more information about RTC concepts, please refer to the [official documentation](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-66812). |

If you encounter issues beyond those listed above, please feel free to contact us for feedback.

### Related Documentation
- [Overview](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310537)
- [Demo Experience](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310559)
- [Solution Integration](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310560)

## Security and privacy

This project takes security seriously.
For vulnerability reporting and supported versions, see [SECURITY.md](SECURITY.md)

## Changelog

### OpenAPI Updates
Refer to [OpenAPI Updates](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-116363) for updates related to Real-time Conversational AI.

### Release Notes

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

### Model and session settings

`BYTEPLUS_MODEL_ENDPOINT_ID` configures the default Seed model endpoint.
`BYTEPLUS_MODEL_ENDPOINTS` accepts a JSON object mapping the model names shown in Configure to your endpoint IDs. Each selected ModelArk endpoint can also be edited in Configure.

Google LLM models use `GOOGLE_LLM_API_KEY`. Custom LLMs use `CUSTOM_LLM_URL` and `CUSTOM_LLM_API_KEY`; the URL and model name can be edited in Configure. Credentials stay in the server environment.

`SESSION_DURATION_SECONDS` sets the local demo session limit (default: 1800 seconds). The sidebar displays the remaining session time and the demo leaves the room when the limit expires.
