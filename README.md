# Interactive AIGC scenario RTC Demo

Demo Online: https://demo.byteplus.com/rtc/solution/aigc

## Introduction
- In the AIGC conversation scenario, the Volcengine AIGC - RTC Server cloud service provides an end - to - end AIGC capability link based on streaming voice by integrating RTC audio and video stream processing, ASR voice recognition, large - model interface call integration, and TTS voice generation capabilities.
- Users only need to call the standard - based OpenAPI interfaces to configure the required ASR, LLM, and TTS types and parameters. The Volcengine cloud computing service is responsible for edge user access, cloud resource scheduling, audio and video stream compression, text - to - voice conversion processing, and data subscription and transmission. This simplifies the development process, allowing developers to focus more on the training and debugging of the core capabilities of large models, thus rapidly promoting the innovation of AIGC product applications.
- At the same time, Volcengine RTC has mature technologies such as audio 3A processing and video processing, as well as large - scale audio and video chat capabilities. It can enable AIGC products to more conveniently support scenarios such as multimodal interaction and multi - person interaction, maintaining the naturalness and efficiency of interaction.

## Configuration Overview

This demo supports two operation modes with different configuration requirements:

### 🔧 Flexible Mode (VoiceChat Mode)
Allows independent configuration of ASR, LLM, and TTS components with multiple provider options.

You need to copy `./Server/sensitive.js` to `./Server/sensitive.js` and fill the following fields into `VOICE_CHAT_MODE` in `./Server/sensitive.js` according to the ASR/LLM/TTS vendor you use.

Besides, if using `BytePlusArk` as `LLM Module`, you need to fill the model endpoint ID in `ArkModel` (`File`: `src/config/voiceChat/llm.ts`), which could be gain from [BytePlus Ark Console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint).

```
VOICE_CHAT_MODE
├── ASRConfig (Speech Recognition)
│   ├── amazon
│   │   ├── ID (Access Key ID)
│   │   └── Secret (Secret Access Key)
│   ├── google
│   │   └── CredentialsJSON (Service Account JSON)
│   └── BytePlus
│       ├── AppId (BytePlus ASR App ID)
│       ├── AccessToken (BytePlus ASR Access Token)
│       └── ApiResourceId (Service Plan Type)

│
├── TTSConfig (Text-to-Speech)
│   ├── byteplus_Bidirectional_streaming
│   │   └── app
│   │       ├── appid (BytePlus TTS App ID)
│   │       └── token (BytePlus TTS Access Token)
│   ├── amazon
│   │   ├── ID (Access Key ID)
│   │   └── Secret (Secret Access Key)
│   └── openai
│       ├── URL (API Endpoint)
│       └── APIKey (OpenAI API Key)
│
└── LLMConfig (Large Language Model)
    ├── CustomLLM (OpenAI Compatible)
    │   ├── Url (API Endpoint)
    │   └── APIKey (API Key)
    └── BytePlusArk
        └── APIKey (BytePlus Ark API Key)
```

### ⚡ Realtime Mode
Uses OpenAI's integrated ASR+TTS solution with only LLM being configurable.

You need to fill the OpenAI token into `REALTIME_API_MODE` in `./Server/sensitive.js`.

```
REALTIME_API_MODE
└── LLMConfig (OpenAI Realtime API)
    └── Token (OpenAI API Key)
```

## Environment Preparation
- **Node Version: 16.0+**
1. Two terminals are required to start the server and the front-end page respectively.

2. **RTC Basic Configuration** (copy `src/config/constants.ts.copy` to `src/config/constants.ts`) and fill the following fields:
   - **AppId**: Your BytePlus RTC App ID (required)
   - **Token**: Token generated in [Byteplus Console](https://console.byteplus.com/rtc/listRTC) or leave it undefined for token auto-generation, demo will invoke api(defined in `./Server/app.js`) to generate token, which require your `RTC_APP_KEY` in `./Server/sensitive.js`.

3. **Server Configuration** (`Server/sensitive.js`)
   - **RTC Basic Configuration**: Configure `RTC_APP_KEY` if you want to auto generate token in server.
   - **API Provider Credentials**:
     - **Flexible Mode**:
        - Configure `ASR`, `TTS`, and `LLM` provider credentials as shown in the configuration tree above.
        - If using `BytePlusArk` as `LLM Module`, you need to fill the model endpoint ID in `ArkModel` (`File`: `src/config/voiceChat/llm.ts`), which could be gain from [BytePlus Ark Console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint).
     - **Realtime Mode**: Only requires OpenAI `APIKey` in `LLMConfig.Token`.

Refer to the configuration tree structure above for the complete list of required fields.

## Quick Start
Please note that both the server and the web need to be started. The steps are as follows:

### Server
Enter the project root directory
#### Install Dependencies
```shell
cd Server
yarn
```
#### Run the project
```shell
node app.js
```
or
```
yarn dev
```

### Front-End Page
Enter the project root directory
#### Install Dependencies
```shell
yarn
```
#### Run the project

For **Flexible Mode** (customizable ASR/LLM/TTS):
```shell
yarn dev:flexible
```

For **Realtime Mode** (OpenAI integrated solution):
```shell
yarn dev:realtime
```
### FAQ
| Issue | Solution |
| :-- | :-- |
| **After starting the AI agent, there is no response to conversation, or it keeps showing "AI preparing..."** | <li>This may be due to incomplete console permissions. Please refer to the [setup process](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1315561) to confirm all required operations are completed. This is the most likely cause, so please carefully verify that all necessary permissions have been granted.</li><li>There may be parameter issues, such as case sensitivity or type errors. Please double-check for these types of problems.</li><li>Related resources may not be enabled or there may be insufficient quota/overdue payments. Please verify again.</li><li>**Please ensure the model ID(See `src/config/voiceChat/llm.ts`) and other configurations are correct and available.**</li> |
| **Browser shows `Uncaught (in promise) r: token_error` error** | Please check if the RTC Token filled in your project is valid. Verify that the UserId, RoomId used to generate the Token, and the Token itself match what's configured in the project. The Token may also be expired - try regenerating it. |
| **[StartVoiceChat]Failed(Reason: The task has been started. Please do not call the startup task interface repeatedly.)** error | If you've set fixed values for RoomId and UserId, repeatedly calling startAudioBot will cause errors. Simply call stopAudioBot first, then call startAudioBot again. |
| Why aren't my devices working normally even though my microphone and camera are functioning? | This may be due to device permissions not being granted. Please check device permission settings. |
| API calls return "Invalid 'Authorization' header, Pls check your authorization header" error | The AK/SK in `Server/sensitive.js` is incorrect |
| What is RTC? | **R**eal **T**ime **C**ommunication. For more information about RTC concepts, please refer to the [official documentation](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-66812). |

If you encounter issues beyond those listed above, please feel free to contact us for feedback.

### Related Documentation
- [Overview](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310537)
- [Demo Experience](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310559)
- [Solution Integration](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310560)

## Changelog

### OpenAPI Updates
Refer to [OpenAPI Updates](https://docs.byteplus.com/en/docs/byteplus-rtc/docs-116363) for updates related to Real-time Conversational AI.

### Release Notes

#### [1.4.0]
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