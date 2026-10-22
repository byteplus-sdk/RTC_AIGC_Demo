const test = require('node:test');
const assert = require('node:assert/strict');
const { preflight, probeSpeech } = require('./preflight');
const request = { Config: { LLMConfig: { Provider: 'BytePlus', EndPointId: 'ep-selected' }, ASRConfig: { Provider: 'BytePlus', ProviderParams: { ApiResourceId: 'volc.seedasr.sauc.duration' } }, TTSConfig: { Provider: 'BytePlus', ProviderParams: { ResourceId: 'seed-tts-2.0' } } } };
test('missing configuration blocks before any network check', async () => {
 let calls=0;
 const result=await preflight('StartVoiceChat', request, {}, {validate:()=>{throw new Error('AKOOL_API_KEY is required');}, probe:async()=>{calls++;}});
 assert.equal(result.ready,false); assert.equal(calls,0); assert.match(result.issues[0].message,/AKOOL_API_KEY/);
});
test('speech authorization failures identify the failing service without secrets', async () => {
 const result=await preflight('StartVoiceChat', request, {}, {validate:()=>{}, probe:async (kind)=>{if(kind==='TTS') throw new Error('not granted');}});
 assert.equal(result.ready,false); assert.match(result.issues[0].message,/TTS.*not granted/);
});
test('all selected speech services must pass', async () => {
 const kinds=[];
 const result=await preflight('StartVoiceChat',request,{}, {validate:()=>{},probe:async kind=>kinds.push(kind)});
 assert.equal(result.ready,true);assert.deepEqual(kinds,['ASR','TTS']);
});
test('an empty or placeholder model endpoint blocks a call', async () => {
 const result=await preflight('StartVoiceChat',{Config:{LLMConfig:{Provider:'BytePlus',EndPointId:'Your model ID'}}},{},{validate:()=>{}});
 assert.equal(result.ready,false);
});

test('speech probes return actionable authorization errors and discard upstream body', async () => {
 const {EventEmitter}=require('node:events');
 const request=options=>{
  assert.equal(options.headers['X-Api-Resource-Id'],'seed-tts-2.0');
  const req=new EventEmitter();req.end=()=>{
   const res={statusCode:403,resume(){}};req.emit('response',res);
  };return req;
 };
 await assert.rejects(probeSpeech('TTS',{ProviderParams:{ResourceId:'seed-tts-2.0'}},{},request),/activate the service/);
});
