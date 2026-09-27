// 학생이 만든 판정기입니다. 제공 엔진(ALEPH SDP 엔진)이 요청마다 decide(request) 를 부르고, 결과대로 통과·거부·재확인을 집행합니다.
// 요청 계약(aleph.decision.v1)에 있는 값만 읽습니다. 역할·위치 같은 계약 밖 값은 읽지 않습니다.

export const RULE_IDS = Object.freeze(['device_registered', 'device_not_registered', 'step_up_required', 'route_not_allowed', 'write_not_allowed']);

// 구역 규칙: 경로(route)별로 구역을 나눕니다. 이 표에 없는 경로는 모두 거부합니다(route_not_allowed).
//   내 메모(my-notes): GET /notes/:id, GET /api/notes, GET /api/notes/:id. 읽기만 허용합니다.
//   반 공지(class-notices): GET /api/notices. 읽기만 허용합니다.
//   강사 자료(instructor-materials): 이 앱에서는 어떤 경로도 열지 않습니다. 표에 없으므로 거부됩니다.
// 쓰기 요청(POST·PUT·PATCH·DELETE)은 구역과 관계없이 모두 거부합니다(write_not_allowed). 반 공지·강사 자료 쓰기도 여기서 막힙니다.
// GET /api/notes 는 로그인한 본인의 메모만 돌려주는 경로입니다(서버 함수가 세션의 주인으로 거릅니다).
// 다른 사람의 메모를 모아 여는 전체 목록 경로(예: /api/notes/all, /api/admin/notes)는 표에 없으므로 거부됩니다.
// 메모 한 건의 주인 비교는 엔진과 서버 함수가 맡습니다. 요청 계약에 역할 값이 없으므로 역할로 구역을 여는 코드는 두지 않습니다.
const ZONES = Object.freeze({
  'GET /notes/:id': 'my-notes',
  'GET /api/notes': 'my-notes',
  'GET /api/notes/:id': 'my-notes',
  'GET /api/notices': 'class-notices'
});
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// 위험 신호 세기. 알 수 없는 값(unknown)이나 없는 값은 위험으로 세지도, 정상값으로 바꿔 넣지도 않습니다.
function riskCount(request) {
  const signals = request.signals || {};
  let count = 0;
  if (signals.region === 'foreign') count += 1;
  if (signals.network === 'unusual') count += 1;
  if (Number.isInteger(signals.hour) && signals.hour >= 0 && signals.hour < 6) count += 1;
  const events = Array.isArray(request.recentEvents) ? request.recentEvents : [];
  if (events.some(e => e && e.kind === 'risk_signal' && Number(e.count) >= 10)) count += 1;
  return count;
}

function result(request, decision, reasonCode, ruleId) {
  return { schema: 'aleph.decision.v1', requestId: request.requestId, decision, reasonCode, ruleIds: [ruleId] };
}

export function decide(request) {
  if (WRITE_METHODS.has(request.method)) return result(request, 'deny', 'write_not_allowed', 'write_not_allowed');
  if (!Object.hasOwn(ZONES, request.route)) return result(request, 'deny', 'route_not_allowed', 'route_not_allowed');
  if (request.deviceRegistered !== true) return result(request, 'deny', 'device_not_registered', 'device_not_registered');
  // 복합 이상: 위험 신호가 두 개 이상 겹칠 때만 재확인을 요구합니다. 지역 하나만으로는 막지 않습니다.
  const verified = request.stepUp?.verified === true;
  if (riskCount(request) >= 2 && !verified) return result(request, 'step_up', 'step_up_required', 'step_up_required');
  return result(request, 'allow', 'device_registered', 'device_registered');
}
