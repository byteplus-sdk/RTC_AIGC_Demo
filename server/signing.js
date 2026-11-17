const { createHash, createHmac } = require('node:crypto');

function encode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function queryString(params) {
  return Object.entries(params).map(([key, value]) => {
    const name = encode(key);
    if (!name) return '';
    const values = Array.isArray(value) ? value.map(encode).sort() : [encode(value)];
    return `${name}=${values.join(`&${name}=`)}`;
  }).filter(Boolean).join('&');
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

function signQuery(request, service, credentials, date = new Date()) {
  const datetime = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const scope = `${datetime.slice(0, 8)}/${request.region}/${service}/request`;
  const query = {
    ...request.params,
    'X-Date': datetime,
    'X-NotSignBody': '',
    'X-Credential': `${credentials.accessKeyId}/${scope}`,
    'X-Algorithm': 'HMAC-SHA256',
    'X-SignedHeaders': '',
    'X-SignedQueries': undefined,
    'X-Signature': undefined,
  };
  if (credentials.sessionToken) query['X-Security-Token'] = credentials.sessionToken;
  const params = Object.fromEntries(Object.keys(query).sort()
    .filter((key) => query[key] !== undefined && query[key] !== null)
    .map((key) => [key, query[key]]));
  const canonical = [
    request.method.toUpperCase(), request.pathname || '/', queryString(params), '\n', '', hash(''),
  ].join('\n');
  const stringToSign = ['HMAC-SHA256', datetime, scope, hash(canonical)].join('\n');
  const key = [datetime.slice(0, 8), request.region, service, 'request']
    .reduce((signingKey, value) => hmac(signingKey, value), credentials.secretKey);
  params['X-SignedQueries'] = Object.keys(params).sort().join(';');
  params['X-Signature'] = hmac(key, stringToSign).toString('hex');
  return queryString(params);
}

module.exports = { signQuery };
