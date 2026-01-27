/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const { Signer } = require('@byteplus/vcloud-sdk-nodejs');
const fetch = require('node-fetch');
const TokenManager = require('./token');
const Privileges = require('./token').privileges;

const { ACCOUNT_ID, SUB_ACCOUNT_NAME, ACCOUNT_INFO } = require('./sensitive');

/**
 * @brief Judge whether the api is belong to voice chat mode.
 */
const isVoiceChatMode = (apiName) => ['StartVoiceChat', 'StopVoiceChat'].includes(apiName);

/**
 * @brief Get session token.
 */
const getSessionToken = async () => {
  const openApiRequestDataSTS = {
    region: 'ap-southeast-1',
    method: 'GET',
    params: {
      Action: 'AssumeRole',
      Version: '2018-01-01',
      RoleTrn: `trn:iam::${ACCOUNT_ID}:role/VoiceChatRoleForRTC`,
      RoleSessionName: SUB_ACCOUNT_NAME,
    },
    headers: {
      Host: 'sts.ap-southeast-1.byteplusapi.com',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  const signer = new Signer(openApiRequestDataSTS, 'sts');
  const stsSignedUri = `https://sts.ap-southeast-1.byteplusapi.com?${signer.getSignUrl({
    accessKeyId: ACCOUNT_INFO.accessKeyId,
    secretKey: ACCOUNT_INFO.secretKey,
  })}`;
  const sts = await fetch(stsSignedUri, {
    method: 'GET',
    headers: openApiRequestDataSTS.headers,
  });
  const {
    Result: { Credentials },
  } = await sts.json();
  const {
    AccessKeyId: accessKeyId,
    SecretAccessKey: secretKey,
    SessionToken: sessionToken,
  } = Credentials;
  ACCOUNT_INFO.accessKeyId = accessKeyId;
  ACCOUNT_INFO.secretKey = secretKey;
  ACCOUNT_INFO.sessionToken = sessionToken;
};

/**
 * @brief Generate rtc access token.
 */
const generateRtcAccessToken = (props) => {
  const { appID, appKey, roomID, userID } = props;
  const key = new TokenManager.AccessToken(appID, appKey, roomID, userID);

  // 0 means forever
  key.addPrivilege(Privileges.PrivSubscribeStream, 0);
  // 0 means forever
  key.addPrivilege(Privileges.PrivPublishStream, 0);
  // 24 hours
  key.expireTime(Math.floor(new Date() / 1000) + 24 * 3600);

  return key.serialize();
};

module.exports = {
  isVoiceChatMode,
  getSessionToken,
  generateRtcAccessToken,
};
