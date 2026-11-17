const assert = require('node:assert/strict');
const test = require('node:test');
const { signQuery } = require('./signing');

const credentials = {"accessKeyId":"test-access-key","secretKey":"test-secret-key"};
const date = new Date("2026-11-17T10:00:00.123Z");
const fixtures = [
  {
    "name": "RTC POST",
    "service": "rtc",
    "request": {
      "method": "POST",
      "region": "ap-southeast-1",
      "params": {
        "Action": "StartVoiceChat",
        "Version": "2025-05-01"
      },
      "headers": {
        "Host": "rtc.ap-southeast-1.byteplusapi.com",
        "Content-Type": "application/json"
      }
    },
    "expected": "Action=StartVoiceChat&Version=2025-05-01&X-Algorithm=HMAC-SHA256&X-Credential=test-access-key%2F20261117%2Fap-southeast-1%2Frtc%2Frequest&X-Date=20261117T100000Z&X-NotSignBody=&X-SignedHeaders=&X-SignedQueries=Action%3BVersion%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-NotSignBody%3BX-SignedHeaders&X-Signature=ec787ff1766d2c19f2cbf4ed6ff66b90097aa5822fadee943748525a2cfbd07b"
  },
  {
    "name": "STS GET",
    "service": "sts",
    "request": {
      "method": "GET",
      "region": "ap-southeast-1",
      "params": {
        "Action": "AssumeRole",
        "Version": "2018-01-01",
        "RoleTrn": "trn:iam::123456789012:role/VoiceChatRoleForRTC",
        "RoleSessionName": "voice chat"
      },
      "headers": {
        "Host": "sts.ap-southeast-1.byteplusapi.com",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    },
    "expected": "Action=AssumeRole&RoleSessionName=voice%20chat&RoleTrn=trn%3Aiam%3A%3A123456789012%3Arole%2FVoiceChatRoleForRTC&Version=2018-01-01&X-Algorithm=HMAC-SHA256&X-Credential=test-access-key%2F20261117%2Fap-southeast-1%2Fsts%2Frequest&X-Date=20261117T100000Z&X-NotSignBody=&X-SignedHeaders=&X-SignedQueries=Action%3BRoleSessionName%3BRoleTrn%3BVersion%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-NotSignBody%3BX-SignedHeaders&X-Signature=bf746558fea2893802c3126b8e86d3ecf7f9e1eb014b38a592aeed871639eb50"
  },
  {
    "name": "session token",
    "service": "rtc",
    "request": {
      "method": "POST",
      "region": "ap-southeast-1",
      "params": {
        "Action": "StopVoiceChat",
        "Version": "2025-05-01"
      }
    },
    "credentials": {
      "accessKeyId": "test-access-key",
      "secretKey": "test-secret-key",
      "sessionToken": "test+session/token=="
    },
    "expected": "Action=StopVoiceChat&Version=2025-05-01&X-Algorithm=HMAC-SHA256&X-Credential=test-access-key%2F20261117%2Fap-southeast-1%2Frtc%2Frequest&X-Date=20261117T100000Z&X-NotSignBody=&X-Security-Token=test%2Bsession%2Ftoken%3D%3D&X-SignedHeaders=&X-SignedQueries=Action%3BVersion%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-NotSignBody%3BX-Security-Token%3BX-SignedHeaders&X-Signature=995a61e5c37a0321707fa44bac2f2612b2979454d74203a46e4ec9a2f1360888"
  },
  {
    "name": "encoded parameter",
    "service": "rtc",
    "request": {
      "method": "get",
      "region": "test-region",
      "pathname": "/api/",
      "params": {
        "z": null,
        "a": [
          "!*'()",
          "汉字",
          "a b"
        ],
        "empty": "",
        "flag": false,
        "count": 0,
        "Version": "2025-05-01"
      }
    },
    "expected": "Version=2025-05-01&X-Algorithm=HMAC-SHA256&X-Credential=test-access-key%2F20261117%2Ftest-region%2Frtc%2Frequest&X-Date=20261117T100000Z&X-NotSignBody=&X-SignedHeaders=&a=%21%2A%27%28%29&a=%E6%B1%89%E5%AD%97&a=a%20b&count=0&empty=&flag=false&X-SignedQueries=Version%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-NotSignBody%3BX-SignedHeaders%3Ba%3Bcount%3Bempty%3Bflag&X-Signature=e03292c5a253214b1be41e3ab6635e307366ab561c279340f0644eb4839aa926"
  }
];

for (const fixture of fixtures) {
  test(`signs ${fixture.name} queries`, () => {
    const request = structuredClone(fixture.request);
    assert.equal(signQuery(request, fixture.service, fixture.credentials || credentials, date), fixture.expected);
    assert.deepEqual(request, fixture.request);
  });
}

test('omits null and undefined query parameters', () => {
  const fixture = fixtures[0];
  const request = { ...fixture.request, params: { ...fixture.request.params, missing: undefined, empty: null } };
  assert.equal(signQuery(request, fixture.service, credentials, date), fixture.expected);
});

test('reuses a request across session credentials', () => {
  const fixture = fixtures[0];
  const request = structuredClone(fixture.request);
  const signed = signQuery(request, fixture.service, { ...credentials, sessionToken: 'session-token' }, date);
  assert.equal(new URLSearchParams(signed).get('X-Security-Token'), 'session-token');
  assert.equal(signQuery(request, fixture.service, credentials, date), fixture.expected);
  assert.deepEqual(request, fixture.request);
});

test('binds the signature to request scope, credentials, and timestamp', () => {
  const fixture = fixtures[0];
  const signature = new URLSearchParams(fixture.expected).get('X-Signature');
  for (const [request, service, credential, timestamp] of [
    [{ ...fixture.request, method: 'GET' }, fixture.service, credentials, date],
    [{ ...fixture.request, pathname: '/api/' }, fixture.service, credentials, date],
    [{ ...fixture.request, region: 'test-region' }, fixture.service, credentials, date],
    [fixture.request, 'sts', credentials, date],
    [fixture.request, fixture.service, { ...credentials, secretKey: 'other-secret-key' }, date],
    [fixture.request, fixture.service, credentials, new Date('2026-11-18T10:00:00Z')],
  ]) {
    assert.notEqual(new URLSearchParams(signQuery(request, service, credential, timestamp)).get('X-Signature'), signature);
  }
});
