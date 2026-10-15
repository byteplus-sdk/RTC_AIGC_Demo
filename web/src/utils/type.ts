/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

/**
 * @brief Create a function to check if a value is an enum type.
 * @param enumType
 */
export const createIsEnumType = <T extends Record<string, string>>(enumType: T) => {
  return (value: unknown): value is T[keyof T] => {
    return Object.values(enumType).includes(value as T[keyof T]);
  };
};
