function isGoogleLlm(config) {
  try {
    return new URL(config?.Url).origin === 'https://generativelanguage.googleapis.com';
  } catch {
    return false;
  }
}

module.exports = { isGoogleLlm };
