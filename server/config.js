function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function loadConfig(env = process.env) {
  const issues = configIssues(env);
  if (issues.length) throw new Error(issues.join('\n'));
  return {
    appId: required(env.RTC_APP_ID, 'RTC_APP_ID'),
    appKey: required(env.RTC_APP_KEY, 'RTC_APP_KEY'),
    credential: {
      accessKeyId: required(env.BYTEPLUS_ACCESS_KEY_ID, 'BYTEPLUS_ACCESS_KEY_ID'),
      secretKey: required(env.BYTEPLUS_SECRET_ACCESS_KEY, 'BYTEPLUS_SECRET_ACCESS_KEY'),
    },
    host: env.HOST?.trim() || '127.0.0.1',
    port: Number(env.SERVER_PORT || 3001),
  };
}

function configIssues(env) {
  const issues = [];
  for (const key of ['RTC_APP_ID', 'RTC_APP_KEY', 'BYTEPLUS_ACCESS_KEY_ID', 'BYTEPLUS_SECRET_ACCESS_KEY']) {
    if (!env[key]?.trim()) issues.push(`${key} is required`);
  }
  const port = Number(env.SERVER_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    issues.push('SERVER_PORT must be an integer between 1 and 65535');
  }
  return issues;
}

module.exports = { loadConfig, required, configIssues };
