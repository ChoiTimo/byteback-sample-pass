// 제출 묶음 만들기: 실제 배포에 점검 요청을 보내고 결과를 artifacts/submission.json 에 씁니다.
// 사용법: node scripts/bundle.mjs https://byteback-sample-pass.vercel.app <검사한 커밋>
import { mkdir, writeFile } from 'node:fs/promises';
import { runAttackChecks } from '../src/attack-check.mjs';

const [base = 'https://byteback-sample-pass.vercel.app', commit = 'unknown'] = process.argv.slice(2);
const attackAttempts = await runAttackChecks(base);
const bundle = { schema: 'aleph.submission.v1', step: 12, deploymentUrl: base, commit, checkedAt: new Date().toISOString(), attackAttempts };
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
await writeFile(new URL('../artifacts/submission.json', import.meta.url), JSON.stringify(bundle, null, 2) + '\n');
const count = k => attackAttempts.filter(a => a.result === k).length;
console.log(`점검 ${attackAttempts.length}건: 막음 ${count('blocked')}, 뚫림 ${count('breached')}, 실행 못 함 ${count('not_run')}`);
