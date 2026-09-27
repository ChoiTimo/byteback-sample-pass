// 로그인 없는 요청과 위조 토큰은 모두 401 로 거절합니다. 메모 본문은 응답에 넣지 않습니다.
// 이 표본에는 실제 로그인 기능이 없으므로 어떤 요청도 자료를 받지 못합니다(세션 확인은 ALEPH SDP 엔진 몫).
export default function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.status(401).json({ error: "login_required", message: "로그인이 필요합니다." });
}
