// 탐지 규칙: 같은 사용자(identity.sub)가 10분 창 안에서 조회를 120건보다 많이 하면 권한 회수를 제안합니다.
// 사건 기록에는 비밀값이나 메모 본문을 넣지 않습니다. 반환은 판정 계약 그대로입니다.

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 120;

export function detect(events) {
  const bySubject = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const sub = event?.identity?.sub;
    const at = Date.parse(event?.at);
    if (typeof sub !== 'string' || !Number.isFinite(at)) continue;
    if (!bySubject.has(sub)) bySubject.set(sub, []);
    bySubject.get(sub).push(at);
  }
  for (const [sub, times] of bySubject) {
    times.sort((a, b) => a - b);
    let start = 0;
    for (let end = 0; end < times.length; end += 1) {
      while (times[end] - times[start] >= WINDOW_MS) start += 1;
      if (end - start + 1 > LIMIT) return { action: 'propose_revocation', reasonCode: 'burst_read', subject: sub };
    }
  }
  return { action: 'observe' };
}
