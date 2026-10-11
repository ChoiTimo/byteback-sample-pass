import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/checks.js';

async function request(query) {
  let status, body;
  const res = { setHeader(){}, status(n){status=n;return this;}, json(value){body=value;} };
  await handler({query},res);return {status,body};
}
test('공개 가상 입력만 실행하고 알려지지 않은 요청은 거부한다',async()=>{
  for(const id of ['s06-unregistered','s07-compound','s08-unknown-route','s08-all-notes','s08-write-notice','s09-burst-read']) {
    const r=await request({case:id});assert.equal(r.status,200);assert.equal(r.body.ready,true);
    assert.ok(r.body.decision||r.body.action);assert.ok(!JSON.stringify(r.body).includes('check_user'));
  }
  assert.equal((await request({case:'unknown'})).status,400);
  assert.equal((await request({case:['s06-unregistered']})).status,400);
});
test('기존 요약을 유지하고 미실행 건을 성공으로 합산하지 않는다',async()=>{
  const r=await request({});assert.equal(r.status,200);
  assert.equal(r.body.total,r.body.blocked+r.body.failed+r.body.notRun);
  assert.match(r.body.commit,/^[a-f0-9]{40}$/u);
});
