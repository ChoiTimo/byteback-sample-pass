// 작전실 화면이 보여 줄 점검 기록 요약입니다. 저장소의 artifacts/submission.json(실제 배포에 요청을 보내 만든 기록)을 그대로 셉니다.
import { readFile } from "node:fs/promises";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    const bundle = JSON.parse(await readFile(new URL("../artifacts/submission.json", import.meta.url), "utf8"));
    const attempts = Array.isArray(bundle.attackAttempts) ? bundle.attackAttempts : [];
    const blocked = attempts.filter(a => a.result === "blocked").length;
    const notRun = attempts.filter(a => a.result === "not_run").length;
    res.status(200).json({ checkedAt: bundle.checkedAt, commit: bundle.commit, total: attempts.length, blocked, notRun,
      failed: attempts.length - blocked - notRun });
  } catch {
    res.status(503).json({ error: "checks_unavailable", message: "점검 기록을 읽지 못했습니다." });
  }
}
