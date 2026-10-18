/* ============================================================
   成绩数据层 · Cloudflare Worker + D1
   学生：submitResult() 写入
   教师：fetchRanking() 读取并按「分数降序 → 用时升序」排序
   ============================================================ */
window.SCORE_DB = (function () {
  const API = 'https://steep-frog-7fa9.1823740477.workers.dev';
  const TABLE_NOTE = 'cloudflare-d1';

  /* 学生：提交成绩（失败自动存本地，下次打开重试） */
  async function submitResult(studentId, score, seconds) {
    const rec = {
      student_id: String(studentId).trim(),
      score: Number(score) || 0,
      seconds: Number((Number(seconds) || 0).toFixed(1)),
      at: Date.now(),
    };
    try {
      const r = await fetch(API + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: rec.student_id, score: rec.score, seconds: rec.seconds }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      removePending(rec);
      return { ok: true };
    } catch (e) {
      addPending(rec);
      return { ok: false, error: String(e.message || e), code: 'NET' };
    }
  }

  /* 教师：取排名 */
  async function fetchRanking() {
    const r = await fetch(API + '/ranking', { method: 'GET' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
    const rows = j.rows || [];

    // 同一姓名只保留最好的一次
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

  /* ── 待提交队列 ── */
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
  async function flushPending() {
    const list = loadPending(); if (!list.length) return { done: 0, left: 0 };
    let done = 0;
    for (const rec of list) {
      try {
        const r = await fetch(API + '/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: rec.student_id, score: rec.score, seconds: rec.seconds }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) { removePending(rec); done++; }
      } catch (e) { break; }
    }
    return { done, left: loadPending().length };
  }

  /* 工具 */
  function fmtTime(s) {
    s = Number(s) || 0;
    const m = Math.floor(s / 60), r = (s % 60).toFixed(1);
    return (m > 0 ? m + ' 分 ' : '') + r + ' 秒';
  }

  return { submitResult, fetchRanking, fmtTime, API,
           loadPending, hasPending, pendingText, flushPending };
})();
