/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

// You can add some logic to report.
class Logger {
  public debug(...args: any[]) {
    console.debug(...args);
  }

  public log(...args: any[]) {
    console.log(...args);
  }

  public error(...args: any[]) {
    console.error(...args);
  }

  public warn(...args: any[]) {
    console.warn(...args);
  }
}

export default new Logger();
