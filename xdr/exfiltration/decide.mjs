// XDR exfiltration 판정: 경보 규칙의 위험 등급(rule.level)으로 조치를 정합니다.
// 10 이상은 명확한 공격이라 차단, 5~9 는 애매한 시도라 알림, 그 아래는 정상 활동이라 기록만 합니다.
export function decide(alert) {
  const level = Number(alert?.rule?.level);
  if (Number.isFinite(level) && level >= 10) return { action: 'block', confidence: 0.9, reason: '위험 등급 10 이상인 명확한 공격입니다.' };
  if (Number.isFinite(level) && level >= 5) return { action: 'alert', confidence: 0.6, reason: '위험 등급 5~9 인 애매한 시도라 사람이 확인합니다.' };
  return { action: 'record', confidence: 0.8, reason: '위험 등급이 낮은 정상 활동이라 기록만 남깁니다.' };
}
