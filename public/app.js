// 접속 앱 화면 코드. 기기 개인키·서명 원문·토큰을 브라우저 저장소에 두지 않습니다.
// 기기 승인 여부는 서버(엔진)의 응답으로만 판단하고, 승인 전에는 메모 제목·본문을 요청하지도 보여 주지도 않습니다.

const $ = id => document.getElementById(id);

async function getJson(path) {
  const res = await fetch(path, { credentials: 'same-origin', headers: { accept: 'application/json' } });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function loadDevice() {
  const { status, body } = await getJson('/api/device/status');
  const approved = status === 200 && body?.approved === true;
  $('device-state').textContent = approved
    ? '서버가 이 기기를 승인했습니다. 메모를 불러옵니다.'
    : '이 기기는 아직 승인되지 않았습니다. 강사에게 기기 등록을 요청하세요. 승인 전에는 메모를 보여 주지 않습니다.';
  return approved;
}

async function loadNotes() {
  const { status, body } = await getJson('/api/my/notes');
  if (status !== 200 || !Array.isArray(body?.notes)) {
    $('device-state').textContent = '로그인이 필요합니다. 메모는 서버가 확인한 뒤에만 보입니다.';
    return;
  }
  const list = $('note-list');
  list.replaceChildren(...body.notes.map(n => {
    const li = document.createElement('li');
    li.textContent = n.title;
    return li;
  }));
  $('notes').hidden = false;
}

async function loadOps() {
  const { status, body } = await getJson('/api/checks');
  if (status !== 200 || !body) {
    $('ops-meta').textContent = '서버 점검 기록을 읽지 못했습니다. 수치를 표시하지 않습니다.';
    return;
  }
  for (const dd of document.querySelectorAll('#ops-stats dd')) {
    const v = body[dd.dataset.k];
    dd.textContent = Number.isInteger(v) ? String(v) : '-';
  }
  $('ops-meta').textContent = `기록 시각 ${body.checkedAt ?? '-'} · 검사한 커밋 ${String(body.commit ?? '-').slice(0, 12)}`;
}

(async () => {
  loadOps();
  if (await loadDevice()) await loadNotes();
})();
