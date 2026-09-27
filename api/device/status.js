// 기기 승인 상태는 서버(엔진)의 판정으로만 정합니다. 화면의 버튼이나 설치 표시는 근거가 되지 않습니다.
// 이 표본에는 등록된 기기 세션이 없으므로 항상 승인 전 상태를 돌려줍니다.
export default function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.status(200).json({ approved: false, reason: "device_not_registered" });
}
