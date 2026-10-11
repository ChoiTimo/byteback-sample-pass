// 1~11단계 점검: 배포에 보낼 수 있는 점검은 실제 요청을 보내 그 응답으로 observed 를 만들고, 판정 규칙 점검은 판정기·탐지 규칙을 직접 실행합니다. 고정 문자열로 「막음」을 적지 않습니다.
// 요청을 보내지 못한 점검은 result 를 not_run 으로 두고 observed 에 그 사실을 적습니다.

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const FAKE_JWT = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.';

async function probe(base, path, headers = {}, caseId) {
  try {
    const res = await fetch(new URL(path, base), { headers: { accept: 'application/json', ...headers }, redirect: 'manual', alephEvidence: { caseId, requestKey: 'read' } });
    const text = await res.text();
    let ready; try { ready = JSON.parse(text).ready; } catch {}
    return { ran: true, status: res.status, ready, hasNotes: /"content"\s*:|"body"\s*:/u.test(text) };
  } catch (error) {
    return { ran: false, error: String(error?.message || error).slice(0, 80) };
  }
}

function attempt(attackId, stage, expected, r, blockedWhen) {
  if (!r.ran) return { attackId, stage, expected, observed: 'network_error', result: 'not_run' };
  const blocked = blockedWhen(r);
  return { attackId, stage, expected, observed: `HTTP ${r.status}${typeof r.ready === 'boolean' ? '; jsonReady=' + r.ready : ''}`,
    result: blocked ? 'blocked' : 'breached' };
}

const denied = r => (r.status === 401 || r.status === 403 || r.status === 404) && !r.hasNotes;

export async function runAttackChecks(baseUrl) {
  const base = new URL(baseUrl);
  const out = [];
  out.push(attempt('s01-static-notes', 1, '/data.json 에 메모가 없음', await probe(base, '/data.json', {}, 's01-static-notes'), denied));
  out.push(attempt('s02-static-copy', 2, '다른 정적 사본 없음', await probe(base, '/notes.json', {}, 's02-static-copy'), denied));
  out.push(attempt('s03-unauth-list', 3, '로그인 없는 목록 401', await probe(base, '/api/my/notes', {}, 's03-unauth-list'), denied));
  out.push(attempt('s03-fake-token', 3, '위조 토큰 401', await probe(base, '/api/my/notes', { authorization: `Bearer ${FAKE_JWT}` }, 's03-fake-token'), denied));
  out.push(attempt('s04-query-identity', 4, '쿼리 신원 무시', await probe(base, `/api/my/notes?userId=${TEST_UUID}&role=instructor`, {}, 's04-query-identity'), denied));
  out.push(attempt('s04-header-identity', 4, '헤더 신원 무시', await probe(base, '/api/my/notes', { 'x-user-id': TEST_UUID, 'x-role': 'instructor' }, 's04-header-identity'), denied));
  out.push(attempt('s05-direct-table', 5, '원본 주소 직접 읽기 거부', await probe(base, '/rest/v1/notes', {}, 's05-direct-table'), denied));
  out.push(attempt('s08-other-zone', 8, '반 공지 로그인 없이 거부', await probe(base, '/api/notices', {}, 's08-other-zone'), denied));
  out.push(attempt('s10-restore-unauth', 10, '로그인 없는 복원 요청 거부', await probe(base, `/api/restore/${TEST_UUID}`, {}, 's10-restore-unauth'), denied));
  out.push(attempt('s11-device', 11, '승인 전 기기 상태', await probe(base, '/api/device/status', {}, 's11-device'), r => r.status === 200 && !r.hasNotes));

  // 가상 규칙 입력을 기존 점검 API에서 실행하고, runner가 같은 HTTP 응답을 관측하게 한다.
  for (const [attackId, stage, expected] of [
    ['s06-unregistered', 6, '미등록 기기 거부'], ['s07-compound', 7, '복합 이상 재확인'],
    ['s08-unknown-route', 8, '모르는 경로 거부'], ['s08-all-notes', 8, '전체 메모 목록 거부'],
    ['s08-write-notice', 8, '반 공지 쓰기 거부'], ['s09-burst-read', 9, '조회 폭주 회수 제안']]) {
    const r = await probe(base, '/api/checks?case=' + attackId, {}, attackId);
    out.push(attempt(attackId, stage, expected, r, response => response.status === 200 && response.ready === true));
  }
  out.sort((a, b) => a.stage - b.stage);
  return out;
}
