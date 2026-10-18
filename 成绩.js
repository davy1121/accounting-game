/* ============================================================
   成绩数据层 · Supabase
   学生端：submitResult() 写入一条记录
   教师端：fetchRanking() 读取并排好序
   ============================================================ */
window.SCORE_DB = (function () {
  const URL = 'https://gcueueffbioxkcxlkpan.supabase.co';
  const KEY = 'sb_publishable_t2TgrUw_KlMJXMsJ2VRqdg_WDNJSCKa';
  const TABLE = 'results';

  const H = {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type': 'application/json',
  };

  /* 学生：提交一次成绩 */
  async function submitResult(studentId, score, seconds) {
    const r = await fetch(`${URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ student_id: String(studentId).trim(), score: Number(score), seconds: Number(seconds.toFixed(1)) }),
    });
    if (!r.ok) throw new Error('提交失败 ' + r.status + ' ' + (await r.text()).slice(0, 120));
    return true;
  }

  /* 教师：取排名（分数降序，同分用时升序） */
  async function fetchRanking() {
    const r = await fetch(
      `${URL}/rest/v1/${TABLE}?select=student_id,score,seconds,created_at&order=score.desc,seconds.asc`,
      { headers: H }
    );
    if (!r.ok) throw new Error('读取失败 ' + r.status);
    const rows = await r.json();

    // 同一学号只保留最好的一次（分数高优先，同分用时短优先）
    const best = new Map();
    for (const x of rows) {
      const k = x.student_id;
      const prev = best.get(k);
      if (!prev) { best.set(k, x); continue; }
      if (x.score > prev.score || (x.score === prev.score && x.seconds < prev.seconds)) best.set(k, x);
    }
    const list = [...best.values()].sort((a, b) => b.score - a.score || a.seconds - b.seconds);
    list.forEach((x, i) => { x.rank = i + 1; });
    return list;
  }

  /* 工具：秒 → 1 分 23.4 秒 */
  function fmtTime(s) {
    s = Number(s) || 0;
    const m = Math.floor(s / 60), r = (s % 60).toFixed(1);
    return (m > 0 ? m + ' 分 ' : '') + r + ' 秒';
  }

  return { submitResult, fetchRanking, fmtTime, URL, KEY };
})();
