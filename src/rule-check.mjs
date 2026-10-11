// 공개 시험 표본의 가상 입력만 실행한다. 실제 세션·메모·기기 상태는 읽거나 바꾸지 않는다.
import { decide } from './decider.mjs';
import { detect } from './detect.mjs';

export function runRuleCheck(caseId) {
  const base = { schema: 'aleph.decision.v1', requestId: 'check', method: 'GET',
    route: 'GET /api/notes/:id', deviceRegistered: true, stepUp: { verified: false }, recentEvents: [],
    signals: { source: 'check', region: 'local', network: 'usual', hour: 14 } };
  const cases = {
    's06-unregistered': [{ ...base, deviceRegistered: false }, 'deny'],
    's07-compound': [{ ...base, signals: { source: 'check', region: 'foreign', network: 'unusual', hour: 3 } }, 'step_up'],
    's08-unknown-route': [{ ...base, route: 'GET /__unknown__' }, 'deny'],
    's08-all-notes': [{ ...base, route: 'GET /api/notes' }, 'deny'],
    's08-write-notice': [{ ...base, method: 'POST', route: 'POST /api/notices' }, 'deny'],
  };
  if (Object.hasOwn(cases, caseId)) {
    const [request, expected] = cases[caseId], result = decide(request);
    return { ready: result.decision === expected, decision: result.decision, reasonCode: result.reasonCode };
  }
  if (caseId === 's09-burst-read') {
    const t0 = Date.now();
    const events = Array.from({ length: 121 }, (_, i) => ({ at: new Date(t0 + i * 2000).toISOString(),
      method: 'GET', identity: { sub: 'check_user' } }));
    const result = detect(events);
    return { ready: result.action === 'propose_revocation', action: result.action };
  }
  return null;
}
