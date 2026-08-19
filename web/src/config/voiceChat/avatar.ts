/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';
import ArkSVG from '@/assets/img/Ark.svg';

/**
 * @brief Byteplus Avatar Type
 */
export enum BYTE_PLUS_AVATAR_TYPE {
  Linyunzhi = '250623-zhibo-linyunzhi',
}

export enum AKOOL_AVATAR_TYPE {
  Tristan = 'dvp_Tristan_cloth2_1080P',
}

const BYTEPLUS_AVATAR = {
  [BYTE_PLUS_AVATAR_TYPE.Linyunzhi]: {
    avatarRole: '250623-zhibo-linyunzhi',
    description: 'linyunzhi',
    icon: ArkSVG,
  },
};

const AKOOL_AVATAR = {
  [AKOOL_AVATAR_TYPE.Tristan]: {
    avatarRole: AKOOL_AVATAR_TYPE.Tristan,
    description: 'Akool Avatar',
    icon: ArkSVG,
  },
};

export const AvatarMap = {
  [Provider.None]: {},
  [Provider.Byteplus]: BYTEPLUS_AVATAR,
  [Provider.Akool]: AKOOL_AVATAR,
};

/** Realtime mode: BytePlus avatar only (Akool not supported). */
export const RealtimeAvatarMap = {
  [Provider.None]: {},
  [Provider.Byteplus]: BYTEPLUS_AVATAR,
};

export type IAvatarType = BYTE_PLUS_AVATAR_TYPE | AKOOL_AVATAR_TYPE | (string & {});

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class AvatarManager {
  provider: Provider.None | Provider.Byteplus | Provider.Akool = Provider.None;

  avatarRoleId: IAvatarType =
    AvatarMap[Provider.Byteplus][BYTE_PLUS_AVATAR_TYPE.Linyunzhi].avatarRole;

  backgroundUrl =
    'https://mediaservice-fe.volccdn.com/obj/vcloud-fe/aigc/static/image/CHILDREN_ENCYCLOPEDIA_BG.c1d3284c.png';

  #paramsMap: {
    [Provider.None]: {
      Enabled: false;
    };
    [Provider.Byteplus]: {
      Enabled: boolean;
      /**
       * @note Injected by server, refer to Server/sensitive.js.
       */
      AvatarAppID: string;
      /**
       * @note Injected by server, refer to Server/sensitive.js.
       */
      AvatarToken: string;
      AvatarType: '3min';
      AvatarRole: IAvatarType;
      BackgroundUrl: string;
      VideoBitrate: number;
    };
    [Provider.Akool]: {
      Enabled: boolean;
      Provider: 'Akool';
      /**
       * @note Injected by server, refer to Server/sensitive.js.
       */
      AvatarUserID: string;
      ProviderParams: {
        /**
         * @note Injected by server, refer to Server/sensitive.js.
         */
        ApiKey: string;
        AvatarId: string;
      };
    };
  };

  constructor() {
    this.#paramsMap = {
      [Provider.None]: {
        Enabled: false,
      },
      [Provider.Byteplus]: {
        Enabled: true,
        AvatarAppID: '',
        AvatarToken: '',
        AvatarType: '3min',
        AvatarRole: BYTE_PLUS_AVATAR_TYPE.Linyunzhi,
        BackgroundUrl: '',
        VideoBitrate: 4000,
      },
      [Provider.Akool]: {
        Enabled: true,
        Provider: 'Akool',
        AvatarUserID: '',
        ProviderParams: {
          ApiKey: '',
          AvatarId: AKOOL_AVATAR_TYPE.Tristan,
        },
      },
    };
  }

  get value() {
    switch (this.provider) {
      case Provider.Byteplus:
        this.#paramsMap[this.provider].BackgroundUrl = this.backgroundUrl;
        this.#paramsMap[this.provider].AvatarRole = this.avatarRoleId;
        return this.#paramsMap[this.provider];
      case Provider.Akool:
        this.#paramsMap[this.provider].AvatarUserID = String(this.avatarRoleId);
        this.#paramsMap[this.provider].ProviderParams.AvatarId = this.avatarRoleId;
        return this.#paramsMap[this.provider];
      case Provider.None:
      default:
        return this.#paramsMap[Provider.None] || {};
    }
  }
}
