# Introduction
This is a minimally simplified server that can be launched locally. You need to start this server to provide services, and the front - end page will call the interfaces of this server.

This server mainly serves two purposes:
1. Injection of sensitive information. It is generally not recommended to define sensitive information in plain text directly in the front - end code (since front - end code is visible in the browser, posing a risk of leakage).
2. Invocation of Byteplus OpenAPI.

# Usage Guide
You can refer to the README.md file in the root directory or the following instructions:

## Install Dependencies
```
yarn
```
## Run the Project
```
node app.js
```
or
```
yarn dev
```

# File Directory and Explanation
```
.
├── app.js        // Server entry file.
├── token.js      // RTC access token generation utilities.
├── util.js       // Helper functions for API handling.
├── ...
└── sensitive.js  // File for injecting sensitive information.
```
The only file you need to pay attention to and modify is the `sensitive.js` file. You don't need to make any changes to other files.

You can fill in and modify the relevant information in `sensitive.js` as needed:
- ACCOUNT_ID: Primary account ID
- SUB_ACCOUNT_NAME: Sub - account name
- ACCOUNT_INFO: Primary account information
- **VOICE_CHAT_MODE**: Sensitive information under the one - stop solution mode
- **REALTIME_API_MODE**: Sensitive information under the Realtime solution mode
The relevant information is marked in the comments.

# Frequently Asked Questions
Refer to the README.md file in the root directory.