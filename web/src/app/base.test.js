import { Message } from '@arco-design/web-react';
import { resultHandler } from './base';

jest.mock('@arco-design/web-react', () => ({ Message: { error: jest.fn() } }));
jest.mock('@/config', () => ({ AIGC_PROXY_HOST: '' }));

beforeEach(() => Message.error.mockClear());

test.each([undefined, { token: 'test-token' }, 'ok'])(
  'metadata errors reject the response even when Result is %p',
  (Result) => {
    expect(() => resultHandler({
      ResponseMetadata: {
        Action: 'StartVoiceChat',
        Error: { Code: 'InvalidAccessKey', Message: 'Invalid account credentials' },
      },
      Result,
    })).toThrow('InvalidAccessKey: Invalid account credentials');
    expect(Message.error).toHaveBeenCalledTimes(1);
  }
);

test('successful responses retain their result', () => {
  const Result = { token: 'test-token' };
  expect(resultHandler({ ResponseMetadata: {}, Result })).toBe(Result);
  expect(resultHandler({ ResponseMetadata: {}, Result: 'ok' })).toBe('ok');
  expect(Message.error).not.toHaveBeenCalled();
});
