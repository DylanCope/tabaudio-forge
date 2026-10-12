const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function makeRecorderContext(stopThrows = false) {
  const counts = {tracks:0, recorder:0, closed:0, timers:0, complete:0};
  const events = {};
  const context = vm.createContext({
    chrome:{runtime:{onMessage:{addListener(){}},sendMessage:async m=>{if(m.type==='RECORDING_COMPLETE') counts.complete++; return {ok:true};}}},
    addEventListener(name,cb){events[name]=cb},
    clearInterval(){counts.timers++}, setInterval(){return 1},
    t:x=>x, counts, stopThrows,
  });
  vm.runInContext(fs.readFileSync(path.join(root,'offscreen.js'),'utf8'),context);
  vm.runInContext(`persistCurrentRecordingMeta=async()=>{};
    mediaStream={getTracks:()=>[{stop(){counts.tracks++}}]};
    audioContext={close(){counts.closed++;return Promise.resolve()}};
    recorder={state:'recording',stop(){counts.recorder++;if(stopThrows)throw Error('stop failed');this.state='inactive'}};
    progressTimer=1;status.state='recording';`,context);
  return {context,counts,events};
}
(async()=>{
  for (const stopThrows of [false,true]) {
    const {context,counts}=makeRecorderContext(stopThrows);
    await vm.runInContext(`storeDataChunk=async()=>{throw Error('QuotaExceededError')};
      handleDataAvailable({data:{size:1}});chunkWriteQueue`,context);
    assert.equal(counts.tracks,1); assert.equal(counts.closed,1); assert.equal(counts.recorder,1);
    assert.equal(vm.runInContext('status.state',context),'error');
    assert.equal(vm.runInContext('recorder.onstop',context),null);
    await vm.runInContext('finalizeRecording()',context);
    assert.equal(counts.complete,0,'Failed partial capture must not be reported as a successful file');
  }
  {
    const {context,counts,events}=makeRecorderContext();
    events.error({message:'Unexpected runtime error'});
    assert.equal(counts.tracks,1); assert.equal(counts.closed,1);
    assert.equal(vm.runInContext('status.state',context),'error');
  }
  {
    const {context,counts}=makeRecorderContext();
    vm.runInContext('stopRecording()',context);
    assert.equal(vm.runInContext('status.state',context),'saving');
    assert.equal(counts.recorder,1);
  }
  {
    const context=vm.createContext({document:{querySelector(){return {}},addEventListener(){}}});
    vm.runInContext(fs.readFileSync(path.join(root,'popup.js'),'utf8'),context);
    assert.equal(vm.runInContext('getControlVisibility("error").stop.visible',context),true);
    assert.equal(vm.runInContext('getControlVisibility("error").stop.disabled',context),false);
  }
  {
    const listener={addListener(){}};
    const context=vm.createContext({importScripts(){},chrome:{runtime:{onMessage:listener,onStartup:listener,onInstalled:listener,sendMessage:async()=>({})},tabs:{onRemoved:listener},downloads:{onChanged:listener},alarms:{onAlarm:listener},storage:{session:{get:async()=>({})}}}});
    vm.runInContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),context);
    await vm.runInContext('loadSessionState()',context);
    vm.runInContext('status.state="error";hasOffscreenDocument=async()=>true;setStatus=async()=>{};sendToOffscreen=async type=>({type});',context);
    const result=await vm.runInContext('forwardControl("OFFSCREEN_STOP")',context);
    // forwardControl returns worker status; observe the forwarded command separately.
    vm.runInContext('sendToOffscreen=async type=>{globalThis.forwarded=type;return {}}',context);
    await vm.runInContext('forwardControl("OFFSCREEN_STOP")',context);
    assert.equal(context.forwarded,'OFFSCREEN_STOP');
  }
  console.log('PASS: storage errors (including throwing stop), unexpected errors, failed finalization, normal Stop, error UI and worker Stop forwarding.');
})().catch(error=>{console.error(error);process.exitCode=1});

