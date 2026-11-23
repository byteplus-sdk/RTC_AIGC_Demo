# Changelog

## Unreleased

- 2026-11-20
    - Run Flexible and Realtime calls with `convo-cli dev` using temporary BytePlus credentials.
    - Set `DEMO_WEB_ORIGIN` for hosted deployments. Custom LLM credentials are sent only to the HTTPS endpoint configured in `CUSTOM_LLM_URL`.
- 2026-11-17 to 2026-11-19
    - Start the demo with `npm run dev` and choose Flexible or Realtime before dialing.
    - Fix camera input and keep screen reader calls active when screen sharing stops.
    - Fix subtitle grouping and support Markdown in AI subtitles.
    - Apply security updates to web and server dependencies.
- 2026-11-03
    - Support AI Gateway for speech recognition and synthesis in Flexible mode.
- 2026-10-22
    - Check provider settings before calls and end sessions when speech recognition quota runs out.

## [1.5.0]
- 2026-10-22
    - Refresh the UI with scene presets, multilingual voices, screen reading, and AI tutor avatars.
    - Add model configuration, deep thinking, vision input selection, web search, and MCP settings.
    - Upgrade the RTC Web SDK to 4.69.3 and add a configurable session timer.
    - Configure the web app and API server from the root `.env.local`. The web app reads the RTC AppID from the server at runtime.
    - Clean up RTC sessions after call failures and stop active agents when the API server shuts down.
    - Align provider parameters, credentials, and avatar configuration with the VoiceChat APIs; add request contract tests.

## [1.4.0]
- 2026-07-29
    - Support Akool digital human
- 2026-04-14
    - Add Google speech recognition and synthesis, AskEcho web search, MCP tools, and avatar support for Realtime calls.
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
