const { isIPv4 } = require('node:net');
const cors = require('koa2-cors');

function hostname(value) {
  return value.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '').replace(/^::ffff:(?=\d+\.)/, '');
}

function companionCors(config, env) {
  const webPort = Number(env.PORT || 3000);
  const webOrigin = env.DEMO_WEB_ORIGIN?.trim();
  const apiHost = URL.parse(env.REACT_APP_AIGC_PROXY_HOST)?.host;
  const configuredHost = hostname(config.host);
  const corsHeaders = cors({ origin: ctx => ctx.get('Origin') });
  return async (ctx, next) => {
    const { localAddress, localPort } = ctx.req.socket;
    const hosts = new Set([configuredHost, hostname(localAddress), 'localhost', '::1']);
    const ports = new Set([localPort, webPort]);
    const allowed = url => {
      const host = hostname(url.hostname);
      return (hosts.has(host) || (isIPv4(host) && host.startsWith('127.'))) &&
        ports.has(Number(url.port || 80));
    };
    const host = ctx.get('Host');
    const target = /^[a-z\d.[\]:-]+$/i.test(host) && URL.parse(`http://${host}`);
    if (!target || (!allowed(target) && host.toLowerCase() !== apiHost)) ctx.throw(403, 'Unrecognized companion host');
    const origin = ctx.get('Origin');
    if (!origin && ctx.headers.origin === undefined) return next();
    const url = URL.parse(origin);
    if (!url || url.origin !== origin || !['http:', 'https:'].includes(url.protocol) ||
        (origin !== webOrigin && !(url.protocol === 'http:' && allowed(url)))) {
      ctx.throw(403, 'Unrecognized browser origin');
    }
    return corsHeaders(ctx, next);
  };
}

module.exports = { companionCors };
