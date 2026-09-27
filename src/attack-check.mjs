// 1~11단계 점검: 실제 배포에 요청을 보내고, 그 응답으로 observed 를 만듭니다. 고정 문자열로 「막음」을 적지 않습니다.
// 요청을 보내지 못한 점검은 result 를 not_run 으로 두고 observed 에 그 사실을 적습니다.
import { decide } from './decider.mjs';
import { detect } from './detect.mjs';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const FAKE_JWT = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.';

async function probe(base, path, headers = {}) {
  try {
    const res = await fetch(new URL(path, base), { headers: { accept: 'application/json', ...headers }, redirect: 'manual' });
    const text = await res.text();
    return { ran: true, status: res.status, hasNotes: /"content"\s*:|"body"\s*:/u.test(text) };
  } catch (error) {
    return { ran: false, error: String(error?.message || error).slice(0, 80) };
  }
}

function attempt(attackId, stage, expected, r, blockedWhen) {
  if (!r.ran) return { attackId, stage, expected, observed: `요청을 보내지 못함(${r.error})`, result: 'not_run' };
  const blocked = blockedWhen(r);
  return { attackId, stage, expected, observed: `HTTP ${r.status}${r.hasNotes ? ', 메모 본문 포함' : ', 메모 본문 없음'}`,
    result: blocked ? 'blocked' : 'breached' };
}

const denied = r => (r.status === 401 || r.status === 403 || r.status === 404) && !r.hasNotes;

export async function runAttackChecks(baseUrl) {
  const base = new URL(baseUrl);
  const out = [];
  out.push(attempt('s01-static-notes', 1, '/data.json 에 메모가 없음', await probe(base, '/data.json'), denied));
  out.push(attempt('s02-static-copy', 2, '다른 정적 사본 없음', await probe(base, '/notes.json'), denied));
  out.push(attempt('s03-unauth-list', 3, '로그인 없는 목록 401', await probe(base, '/api/notes'), denied));
  out.push(attempt('s03-fake-token', 3, '위조 토큰 401', await probe(base, '/api/notes', { authorization: `Bearer ${FAKE_JWT}` }), denied));
  out.push(attempt('s04-query-identity', 4, '쿼리 신원 무시', await probe(base, `/api/notes?userId=${TEST_UUID}&role=instructor`), denied));
  out.push(attempt('s04-header-identity', 4, '헤더 신원 무시', await probe(base, '/api/notes', { 'x-user-id': TEST_UUID, 'x-role': 'instructor' }), denied));
  out.push(attempt('s05-direct-table', 5, '원본 주소 직접 읽기 거부', await probe(base, '/rest/v1/notes'), denied));
  out.push(attempt('s08-other-zone', 8, '반 공지 로그인 없이 거부', await probe(base, '/api/notices'), denied));
  out.push(attempt('s10-restore-unauth', 10, '로그인 없는 복원 요청 거부', await probe(base, `/api/restore/${TEST_UUID}`), denied));
  out.push(attempt('s11-device', 11, '승인 전 기기 상태', await probe(base, '/api/device/status'), r => r.status === 200 && !r.hasNotes));

  // 6~9단계는 판정기를 직접 불러 확인합니다(배포 요청이 아니라 코드 실행 결과입니다).
  const baseReq = { schema: 'aleph.decision.v1', requestId: 'check', method: 'GET', route: 'GET /api/notes/:id', deviceRegistered: true,
    stepUp: { verified: false }, recentEvents: [], signals: { source: 'check', region: 'local', network: 'usual', hour: 14 } };
  const cases = [
    ['s06-unregistered', 6, '미등록 기기 거부', { ...baseReq, deviceRegistered: false }, d => d.decision === 'deny'],
    ['s07-compound', 7, '복합 이상 재확인', { ...baseReq, signals: { source: 'check', region: 'foreign', network: 'unusual', hour: 3 } }, d => d.decision === 'step_up'],
    ['s08-unknown-route', 8, '모르는 경로 거부', { ...baseReq, route: 'GET /__unknown__' }, d => d.decision === 'deny'],
    ['s08-write-notice', 8, '반 공지 쓰기 거부', { ...baseReq, method: 'POST', route: 'POST /api/notices' }, d => d.decision === 'deny']
  ];
  for (const [attackId, stage, expected, req, ok] of cases) {
    const d = decide(req);
    out.push({ attackId, stage, expected, observed: `판정기 결과 ${d.decision}/${d.reasonCode}`, result: ok(d) ? 'blocked' : 'breached' });
  }
  // 9단계: 탐지 규칙을 직접 불러 10분 안 조회 121건이 회수 제안으로 이어지는지 확인합니다.
  const t0 = Date.now();
  const burst = Array.from({ length: 121 }, (_, i) => ({ at: new Date(t0 + i * 2000).toISOString(), method: 'GET', identity: { sub: 'check_user' } }));
  const found = detect(burst);
  out.push({ attackId: 's09-burst-read', stage: 9, expected: '조회 폭주 회수 제안', observed: `탐지 결과 ${found.action}${found.reasonCode ? '/' + found.reasonCode : ''}`,
    result: found.action === 'propose_revocation' ? 'blocked' : 'breached' });
  out.sort((a, b) => a.stage - b.stage);
  return out;
}
