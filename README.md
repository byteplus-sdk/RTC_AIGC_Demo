# Conversational AI Demo

Demo Online: https://demo.byteplus.com/rtc/solution/aigc

## RTC CLI integration

The `feat/rtc-cli-integration` branch is also an remote template for
`byteplus-rtc`. It keeps this Demo's UI and provider controls while adding a
local companion server that can delegate RTC token issuance and VoiceChat
Start/Stop to the authenticated CLI.

```shell
byteplus-rtc init --scene voice-agent --platform web
cd <generated-project>
byteplus-rtc auth login --browser=open
byteplus-rtc dev
```

Copy `.env.example` to `.env.local` and provide the RTC AppID plus the selected
model endpoint, model API-key resource ID, and speech application ID. Do not commit `.env.local`. When BytePlus
AK/SK are absent, the server uses the CLI's isolated Signin session. When both
AK/SK variables are present, the server signs BytePlus OpenAPI directly. RTC
tokens use `GetToken` Version `2025-06-01`; an RTC AppKey is optional.

In CLI mode, raw model and speech credentials are exchanged only inside the
short-lived `byteplus-rtc` process. The Node server receives selectors and the
final RTC request result, not the exchanged credentials.

## Introduction
- In the AIGC conversation scenario, the Volcengine AIGC - RTC Server cloud service provides an end - to - end AIGC capability link based on streaming voice by integrating RTC audio and video stream processing, ASR voice recognition, large - model interface call integration, and TTS voice generation capabilities.
- Users only need to call the standard - based OpenAPI interfaces to configure the required ASR, LLM, and TTS types and parameters. The Volcengine cloud computing service is responsible for edge user access, cloud resource scheduling, audio and video stream compression, text - to - voice conversion processing, and data subscription and transmission. This simplifies the development process, allowing developers to focus more on the training and debugging of the core capabilities of large models, thus rapidly promoting the innovation of AIGC product applications.
- At the same time, Volcengine RTC has mature technologies such as audio 3A processing and video processing, as well as large - scale audio and video chat capabilities. It can enable AIGC products to more conveniently support scenarios such as multimodal interaction and multi - person interaction, maintaining the naturalness and efficiency of interaction.

## Configuration Overview

Fill credentials in the root `.env.local`, which is excluded from Git.
The [.env.example](.env.example) template lists all supported fields.

### 🔧 Flexible Mode (VoiceChat Mode)

Fill the fields for the providers selected in the UI. Provider, voice, prompt and
recognition language can be changed in the settings panel.

```text
Flexible
├── ASR (Speech Recognition)
│   ├── Amazon
│   │   ├── AWS_ACCESS_KEY_ID                (Access Key ID)
│   │   └── AWS_SECRET_ACCESS_KEY            (Secret Access Key)
│   ├── Google
│   │   ├── GOOGLE_CREDENTIALS_JSON         (Service account JSON)
│   │   └── GOOGLE_RECOGNIZER_PATH          (Required for ASR v2)
│   └── BytePlus
│       ├── BYTEPLUS_SEED_SPEECH_APP_ID       (Speech application ID)
│       └── BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN (Speech AccessToken)
├── TTS (Text-to-Speech)
│   ├── BytePlus
│   │   ├── BYTEPLUS_SEED_SPEECH_APP_ID
│   │   └── BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN
│   ├── Amazon
│   │   ├── AWS_ACCESS_KEY_ID
│   │   └── AWS_SECRET_ACCESS_KEY
│   ├── OpenAI
│   │   ├── OPENAI_API_KEY                   (OpenAI API key)
│   │   └── OPENAI_TTS_URL                   (Optional speech endpoint)
│   └── Google
│       └── GOOGLE_CREDENTIALS_JSON
├── LLM (Large Language Model)
│   ├── Custom LLM (OpenAI compatible)
│   │   └── CUSTOM_LLM_API_KEY               (Falls back to OPENAI_API_KEY)
│   └── BytePlus ModelArk
│       ├── BYTEPLUS_MODEL_ENDPOINT_ID       (Model endpoint ID)
│       └── BYTEPLUS_MODEL_API_KEY           (ModelArk API key)
├── Web search (optional)
│   └── ASKECHO_API_KEY
└── Avatar (optional)
    ├── Volcano
    │   ├── AVATAR_APP_ID
    │   └── AVATAR_TOKEN
    └── Akool
        └── AKOOL_API_KEY
```

Get the model endpoint ID and API key from the
[ModelArk console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint).
The BytePlus speech application must have the selected ASR and TTS services enabled.
Wrap `GOOGLE_CREDENTIALS_JSON` in single quotes in `.env.local`.

### ⚡ Realtime Mode

```text
Realtime
├── OpenAI
│   └── OPENAI_API_KEY            (OpenAI API key)
└── Avatar (optional)
    └── Volcano
        ├── AVATAR_APP_ID         (Avatar application ID)
        └── AVATAR_TOKEN          (Avatar token)
```

## Project Structure

```text
.
├── server/          Koa API server
├── web/             React application
└── package.json     Development and build commands
```

## Environment Preparation

Requires Node.js 18 or later.

Install dependencies and create the configuration file in the repository root:

```shell
npm run setup
cp .env.example .env.local
```

Fill in the common RTC fields and the provider fields for your selected mode.

**Common RTC configuration**

Set `RTC_APP_ID` for both modes. Direct OpenAPI mode also requires BytePlus AK/SK.
Get the application credentials from the
[RTC console](https://console.byteplus.com/rtc/listRTC) and the access keys from
[IAM key management](https://console.byteplus.com/iam/keymanage).

```text
RTC
├── RTC_APP_ID                    (RTC application ID)
└── OpenAPI authentication
    ├── BYTEPLUS_ACCESS_KEY_ID    (Access Key ID with RTC API permissions)
    └── BYTEPLUS_SECRET_ACCESS_KEY (Secret Access Key)
```

**Optional settings**

`PORT` and `SERVER_PORT` default to `3000` and `3001`.
Set `REACT_APP_AIGC_PROXY_HOST` when using another API server;
leave it empty to use the development proxy.

## Quick Start

Start the server and web application in Flexible mode:

```shell
npm run dev
```

For Realtime mode:

```shell
npm run dev:realtime
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
For production builds, provide `REACT_APP_RTC_APP_ID`, `REACT_APP_MODEL_ENDPOINT_ID`
and `REACT_APP_AIGC_PROXY_HOST` in the build environment.

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