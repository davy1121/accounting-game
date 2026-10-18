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

  /* 学生：提交一次成绩（失败自动存本地，下次打开重试） */
  async function submitResult(studentId, score, seconds) {
    const rec = {
      student_id: String(studentId).trim(),
      score: Number(score),
      seconds: Number(seconds.toFixed(1)),
      at: Date.now(),
    };
    try {
      const r = await fetch(`${URL}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ student_id: rec.student_id, score: rec.score, seconds: rec.seconds }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      removePending(rec);
      return { ok: true };
    } catch (e) {
      addPending(rec);
      return { ok: false, error: String(e.message || e), code: 'NET' };
    }
  }

  /* ── 待提交队列（网断了也不丢成绩） ── */
  function pendingKey() { return 'scorePending'; }
  function loadPending() {
    try { return JSON.parse(localStorage.getItem(pendingKey()) || '[]'); } catch (e) { return []; }
  }
  function savePending(list) {
    try { localStorage.setItem(pendingKey(), JSON.stringify(list)); } catch (e) {}
  }
  function addPending(rec) {
    const list = loadPending().filter((x) => x.student_id !== rec.student_id);
    list.push(rec); savePending(list);
  }
  function removePending(rec) {
    savePending(loadPending().filter((x) => x.student_id !== rec.student_id));
  }
  function hasPending() { return loadPending().length > 0; }
  function pendingText() {
    return loadPending().map((x) => `姓名:${x.student_id}  分数:${x.score}  用时:${x.seconds}秒`).join('\n');
  }
  /* 重试所有待提交（页面打开时自动调） */
  async function flushPending() {
    const list = loadPending(); if (!list.length) return { done: 0, left: 0 };
    let done = 0;
    for (const rec of list) {
      try {
        const r = await fetch(`${URL}/rest/v1/${TABLE}`, {
          method: 'POST',
          headers: { ...H, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ student_id: rec.student_id, score: rec.score, seconds: rec.seconds }),
        });
        if (r.ok) { removePending(rec); done++; }
      } catch (e) { break; }
    }
    return { done, left: loadPending().length };
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

  return { submitResult, fetchRanking, fmtTime, URL, KEY,
           loadPending, hasPending, pendingText, flushPending };
})();
