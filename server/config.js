const RTC_ENDPOINT = 'https://rtc.ap-southeast-1.byteplusapi.com';

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function loadConfig(env = process.env) {
  const issues = configIssues(env);
  if (issues.length) throw new Error(issues.join('\n'));
  const common = {
    appId: required(env.RTC_APP_ID, 'RTC_APP_ID'),
    host: env.HOST?.trim() || '127.0.0.1',
    endpoint: env.BYTEPLUS_RTC_ENDPOINT?.trim() || RTC_ENDPOINT,
    region: env.BYTEPLUS_RTC_REGION?.trim() || 'ap-southeast-1',
    service: env.BYTEPLUS_RTC_SERVICE?.trim() || 'rtc',
    userAgent: env.BYTEPLUS_RTC_OPENAPI_USER_AGENT?.trim() || undefined,
    port: Number(env.SERVER_PORT || 3001),
    env,
  };
  if (env.BYTEPLUS_ACCESS_KEY_ID?.trim() && env.BYTEPLUS_SECRET_ACCESS_KEY?.trim()) {
    return {
      ...common, mode: 'openapi',
      credential: {
        accessKeyId: required(env.BYTEPLUS_ACCESS_KEY_ID, 'BYTEPLUS_ACCESS_KEY_ID'),
        secretKey: required(env.BYTEPLUS_SECRET_ACCESS_KEY, 'BYTEPLUS_SECRET_ACCESS_KEY'),
      },
    };
  }
  return {
    ...common, mode: 'cli',
    cliPath: required(env.BYTEPLUS_RTC_CLI_PATH, 'BYTEPLUS_RTC_CLI_PATH'),
    projectDir: required(env.BYTEPLUS_RTC_PROJECT_DIR, 'BYTEPLUS_RTC_PROJECT_DIR'),
  };
}

function configIssues(env) {
  const issues = [];
  if (!env.RTC_APP_ID?.trim()) issues.push('RTC_APP_ID is required');
  const accessKey = Boolean(env.BYTEPLUS_ACCESS_KEY_ID?.trim());
  const secretKey = Boolean(env.BYTEPLUS_SECRET_ACCESS_KEY?.trim());
  if (accessKey !== secretKey) {
    issues.push('BYTEPLUS_ACCESS_KEY_ID and BYTEPLUS_SECRET_ACCESS_KEY must be set together');
  } else if (!accessKey) {
    for (const key of ['BYTEPLUS_RTC_CLI_PATH', 'BYTEPLUS_RTC_PROJECT_DIR']) {
      if (!env[key]?.trim()) issues.push(`${key} is required`);
    }
  }
  const port = Number(env.SERVER_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    issues.push('SERVER_PORT must be an integer between 1 and 65535');
  }
  return issues;
}

module.exports = { loadConfig, required, configIssues };
