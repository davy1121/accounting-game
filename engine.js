/* ============================================================
   互动影游 · 引擎
   ★ 这个文件不用改。要改剧情请编辑「story.js」。
   ============================================================ */

(function () {
  /* 顶层 const 不会挂到 window 上（只有 var 会），所以两种都试 */
  const S = (typeof STORY !== 'undefined' && STORY) ? STORY : window.STORY;
  if (!S) { console.error('story.js 没有加载，或 STORY 结构不对'); return; }

  const $ = (id) => document.getElementById(id);
  const elChapter = $('chapter'), elStep = $('step'), elTitle = $('title');
  const elStage = $('stage'), elVideo = $('video'), elText = $('stageText'), elPlay = $('playBtn');
  const elSummary = $('summary');
  const elPrompt = $('prompt'), elChoices = $('choices');
  const btnRestart = $('restartBtn'), btnRestartTop = $('restartTop'), btnSkip = $('skipBtn');

  const path = [];            // 走过的节点，用来算进度、显示路径
  const warns = new Set();    // 走过的警示节点，用来统计玩家踩了几个坑
  const scored = new Set();   // 已经计过分的节点（只记首次作答）
  var visitedNodes = new Set();   // 进过哪些节点（返回不清）
  var timeLog = {};               // 每题用时
  let score = 0;              // 当前得分
  let current = null;
  const elScore = $('score');

  /* 节点文本里可以写 %warn%，会替换成踩坑次数。
     结局靠它区分「一路守住」和「踩过坑但退回来了」。 */
  const fill = (t) => String(t == null ? '' : t)
    .replace(/%warn%/g, warns.size)
    .replace(/%score%/g, score);

  /* 更新分数徽章。扣分时变红抖一下，让玩家看见代价。 */
  function paintScore(delta) {
    if (!elScore) return;
    elScore.textContent = '得分 ' + score;
    elScore.classList.toggle('is-down', score < 0);
    if (delta) {
      elScore.classList.add('is-bump');
      setTimeout(() => elScore.classList.remove('is-bump'), 220);
    }
  }

  /* ---------- 打乱选项顺序 ----------
     选项在剧本里的顺序是「第 1 个最好、第 2 个折中、第 3 个最差」。
     不打乱的话，学生只要连点第一个就能拿满分。
     每次载入、每次重来都重新洗牌，位置不固定。
     分值挂在选项对象上，跟着选项一起移动，所以不会洗错。 */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function shuffleAll() {
    Object.keys(S.nodes).forEach((k) => {
      const n = S.nodes[k];
      if (n.choices && n.choices.length > 1) n.choices = shuffle(n.choices);
    });
  }

  /* ---------- 渲染一个节点 ---------- */
  function go(id) {
    const n = S.nodes[id];
    if (!n) { console.error('找不到节点：' + id); return; }
    current = id;
    visitedNodes.add(id);
    if (!window.__visitCount) window.__visitCount = {};
    window.__visitCount[id] = (window.__visitCount[id] || 0) + 1;
    paintScore();
    if (n.warnNode) warns.add(id);
    // 警示节点本身不算一步；回退到走过的节点也不重复计
    if (!n.warnNode && path.indexOf(id) === -1) path.push(id);

    // 主题色跟着节点走
    if (n.tone) elStage.style.setProperty('--tone', n.tone);

    elChapter.textContent = fill(n.chapter);
    elStep.textContent = n.end ? '结局' : '第 ' + path.length + ' 步';
    elTitle.textContent = fill(n.title);
    paintBag();
    if (elSummary) { elSummary.hidden = !!(n.video); elSummary.textContent = fill(n.summary || ''); }
    elPrompt.textContent = fill(n.prompt);
    // ★ 结局：藏掉「返回上一步 / 重新开始 / 跳过本段」，只留结局自己的按钮
    const acts = $('actions');
    if (acts) acts.hidden = !!n.end;
    const ft = document.querySelector('.game-foot');
    // 「重来一次」只在非坏结局出现；坏结局（chapter 含「坏」）不给
    const isBadEnd = !!n.end && /坏/.test(String(n.chapter || ''));
    if (ft) ft.hidden = !n.end || isBadEnd;
    if (n.end) { renderReview(); submitOnce(); }   // 结局：渲染回顾 + 提交成绩
    else { const rb = $('review'); if (rb) rb.hidden = true; }
    document.title = (n.title ? fill(n.title) + ' · ' : '') + '资产减值 互动影游';

    // 选项
    elChoices.innerHTML = '';
    if (n.choices && n.choices.length) {
      n.choices.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice round';
        b.innerHTML =
          '<span class="choice-key">' + (i + 1) + '</span>' +
          '<span class="choice-main">' +
            '<span class="choice-label">' + c.label + '</span>' +
            (c.note ? '<span class="choice-note">' + c.note + '</span>' : '') +
          '</span>';
        b.addEventListener('click', () => choose(id, c));
        elChoices.appendChild(b);
      });
      elChoices.hidden = false;
    } else {
      elChoices.hidden = true;
    }

    btnRestart.hidden = !n.end;
    // 第一次必须看完；来过一次（答过或返回重选）就能跳
    // ★ 第一次必须看完；这次算「第几次进入本节点」
    if (!window.__visitCount) window.__visitCount = {};
    btnSkip.hidden = !n.video || (window.__visitCount[current] || 1) < 2;

    renderMedia(n);
  }

  /* ---------- 题目在视频播完后才揭晓 ----------
     视频存在时，先把题干和选项藏起来，让玩家先看完这 5 秒的场景；
     播完（或点跳过）再把题目淡入，并滚动到它。
     视频加载失败时直接揭晓，不会把玩家卡住。 */
  function revealQuestion() {
    if (elSummary && elSummary.textContent) {
      elSummary.hidden = false;
      // 简介在视频下方，小屏幕上会被挤出视口 → 自动滚过去
      try { elSummary.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    if (elPrompt) elPrompt.hidden = false;
    elChoices.hidden = false;
    elChoices.classList.remove('is-in');
    void elChoices.offsetWidth;      // 强制重排，保证动画能重放
    elChoices.classList.add('is-in');
    elChoices.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function hideQuestion() {
    if (elPrompt) elPrompt.hidden = true;
    elChoices.classList.remove('is-in');
    elChoices.hidden = true;
  }
  /* ---------- 选定一个选项（点击与键盘共用） ----------
     只记首次作答。选错会进警示节点，退回重选时这一题已经记过了，
     再选对也不加分。退回是为了看懂为什么错，不是为了刷分。 */
  /* ---------- 三贤者道具（一次性） ---------- */
  // 三颗心机制不同、价值相同：期望值都是 +5 分
  //   致知  排除 1 个错误项 + 答错不扣分 → 50% 命中，期望 +5
  //   力行  改选一次，第一次不计分        → 抹掉一次错误，期望 +5
  //   正义  撤销上一步，退回重选          → 抹掉一次错误，期望 +5
  var TIME_CUT = 15;   // 力行之心：本题用时减少的秒数
  var HEART_INFO = {
    '致知之心': { desc: '划掉一个非最优选项，本题答错不扣分', kind: 'eliminate' },
    '力行之心': { desc: '跳过本题，直接得 5 分',             kind: 'skip5' },
    '正义之心': { desc: '影游结束后，总用时减少 15 秒',      kind: 'totalcut' },
  };
  function loadHeart() {
    try {
      const d = JSON.parse(localStorage.getItem('sxz') || '{}');
      if (!d.heart) return null;
      if (sessionStorage.getItem('heartUsed') === '1') return null;   // 本次已用掉
      return d.heart;
    } catch (e) { return null; }
  }
  var heart = loadHeart();

  function paintBag() {
    const bar = $('bag');
    if (!bar) return;
    if (!heart) { bar.hidden = true; return; }
    bar.hidden = false;
    $('bagName').textContent = heart;
    $('bagDesc').textContent = HEART_INFO[heart] ? HEART_INFO[heart].desc : '';
    const used = sessionStorage.getItem('heartUsed') === '1';
    $('bagBtn').disabled = used;
    $('bagUsed').hidden = !used;
  }

  function useHeart() {
    if (!heart) return;
    const info = HEART_INFO[heart]; if (!info) return;
    const n = S.nodes[current];

    // ★ 必须等视频播完、选项出现之后才能用
    const opts = [...document.querySelectorAll('#choices .choice')];
    if (!opts.length) { showToast(0, '等这段视频播完、选项出现后才能用道具'); return; }
    if (!n || !n.choices || n.choices.length < 2) { showToast(0, '这一段没有可用的抉择'); return; }

    let used = false;

    // ① 致知：划掉一个非最优选项 + 本题答错不扣分
    if (info.kind === 'eliminate') {
      const bad = opts.filter((_, i) => Number(n.choices[i].score) < 10);
      if (bad.length) {
        const el = bad[bad.length - 1];
        el.classList.add('is-eliminated');
        el.setAttribute('aria-disabled', 'true');
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.32';
        el.style.textDecoration = 'line-through';
        window.__heartNode = current;
        showToast(0, '致知之心：已划掉一个非最优选项，本题答错不扣分');
        used = true;
      }
    }
    // ③ 正义：影游结束后总用时减 15 秒
    else if (info.kind === 'totalcut') {
      window.__totalCut = (window.__totalCut || 0) + 15;
      showToast(0, '正义之心：影游结束后，总用时减少 15 秒');
      used = true;
    }
    // ② 力行：本题用时减少 15 秒
    else if (info.kind === 'timecut') {
      window.__timeCut = (window.__timeCut || 0) + TIME_CUT;
      showToast(0, '力行之心：本题用时减少 ' + TIME_CUT + ' 秒');
      used = true;
    }
    // ③ 正义：跳过本题，直接得 5 分
    else if (info.kind === 'skip5') {
      const mid = [...n.choices].sort((a, b) => Math.abs((a.score || 0) - 5) - Math.abs((b.score || 0) - 5))[0];
      showToast(0, '正义之心：跳过本题，直接得 5 分');
      sessionStorage.setItem('heartUsed', '1');
      heart = null; paintBag();
      choose(current, mid, true);   // 按折中（+5）继续剧情
      return;
    }

    if (!used) return;
    sessionStorage.setItem('heartUsed', '1');
    heart = null;
    paintBag();
  }

  /* ---------- 全局计时（从点「开始游戏」起，全程不停） ---------- */
  var tickId = null, sessionStart = 0, totalElapsed = 0;

  function startClock() {
    stopClock();
    sessionStart = Date.now();
    totalElapsed = 0;
    const t = $('timer'); if (!t) return;
    t.hidden = false;
    t.className = 'game-timer round';
    t.textContent = '⏱ 0.0 秒';
    tickId = setInterval(() => {
      totalElapsed = (Date.now() - sessionStart) / 1000;
      t.textContent = '⏱ ' + totalElapsed.toFixed(1) + ' 秒';
      if (totalElapsed >= 300) t.className = 'game-timer round warn';
      if (totalElapsed >= 600) t.className = 'game-timer round danger';
    }, 100);
  }

  function stopClock() {
    if (tickId) { clearInterval(tickId); tickId = null; }
  }

  function resetClock() {
    stopClock();
    const t = $('timer'); if (t) t.hidden = true;
    sessionStart = 0; totalElapsed = 0;
  }

  /* ---------- 作答记录（结局回顾用） ---------- */
  if (!window.__answers) window.__answers = [];
  function recordAnswer(nodeId, c) {
    const n = S.nodes[nodeId]; if (!n) return;
    window.__answers = window.__answers.filter((x) => x.node !== nodeId);
    window.__answers.push({
      node: nodeId, chapter: n.chapter, title: n.title,
      prompt: n.prompt, label: c.label, note: c.note,
      score: Number(c.score) || 0, explain: n.explain || '',
    });
  }

  function choose(nodeId, c, forcedFive) {
    if (forcedFive) { c = Object.assign({}, c, { score: 5 }); }
    const now = totalElapsed || ((Date.now() - sessionStart) / 1000);
    const prev = Object.values(timeLog).reduce((a, b) => a + b, 0);
    let thisElapsed = Math.max(0.1, now - prev);
    if (window.__timeCut) { thisElapsed = Math.max(0.1, thisElapsed - window.__timeCut); window.__timeCut = 0; }
    timeLog[nodeId] = thisElapsed;
    // ★ 力行之心：本题第一次选择不计分，允许改选一次
    if (window.__allowRetry && nodeId === window.__heartNode && !window.__retried) {
      window.__retried = true;
      window.__allowRetry = false;
      showToast(0, '力行之心：这次不计分，请重新选一次');
      // 把刚点的那项标成「已作废」，让玩家知道要另选
      try {
        [...document.querySelectorAll('#choices .choice')].forEach((el, i) => {
          if (n_of(i) === c) { el.style.opacity = '.32'; el.style.textDecoration = 'line-through'; el.style.pointerEvents = 'none'; }
        });
      } catch (e) {}
      function n_of(i){ return S.nodes[current].choices[i]; }
      return;   // 不记分、不跳转
    }
    if (!scored.has(nodeId)) {
      scored.add(nodeId);
      let v = Number(c.score) || 0;
      if (v < 0 && nodeId === window.__heartNode) {
        v = 0;   // 道具容错：本题最低 0 分
        showToast(0, '道具生效：本题答错不扣分'); recordAnswer(nodeId, c);
      } else {
        score += v; paintScore(v); showToast(v, c.note);
      recordAnswer(nodeId, c);
      submitProgress();          // ★ 每做一次选择就提交一次，防止中途退出丢分
      }
    } else {
      showToast(0, '这一段已经计过分了，重选不加分');
    }
    go(c.to);
  }

  /* ---------- 得分反馈 ---------- */
  let toastTimer = null;
  function showToast(delta, note) {
    const t = $('scoreToast'); if (!t) return;
    let cls = '', head = '';
    if (delta > 0)       { cls = 'is-up';   head = '+' + delta + ' 分'; }
    else if (delta < 0)  { cls = 'is-down'; head = delta + ' 分'; }
    else if (delta === 0){ cls = 'is-mid';  head = '±0 分'; }
    t.className = 'score-toast ' + cls;
    t.innerHTML = head
      ? head + (note ? '<small>' + note + '</small>' : '')
      : '<small>' + (note || '') + '</small>';
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2000);
  }
  /* ---------- 视频 / 文本 双模式 ---------- */
  function renderMedia(n) {
    elVideo.pause();
    elVideo.removeAttribute('src');
    elVideo.hidden = true;
    elPlay.hidden = true;

    // 没有视频 → 文字和题目一起直接出
    if (!n.video) {
      elText.textContent = fill(n.text);
      elText.hidden = false;
      revealQuestion();
      return;
    }

    // 有视频 → 先看场景，题目等播完再出
    elText.hidden = true;
    if (elSummary) { elSummary.textContent = fill(n.summary || ''); elSummary.hidden = false; }
    elVideo.hidden = false;
    if (elSummary) elSummary.hidden = true;      // 播的时候先藏简介
    elVideo.src = n.video;
    hideQuestion();

    // 加载失败（文件还没做 / 编码不支持）→ 回落文字，并立刻揭晓题目
    elVideo.onerror = () => {
      elVideo.hidden = true;
      elText.textContent = fill(n.text) + '\n\n（视频没加载出来，先用文字顶上）';
      elText.hidden = false;
      revealQuestion();
      console.warn('视频加载失败：' + n.video);
    };

    // 播完 → 揭晓题目
    elVideo.onended = () => {
      if (elSummary && elSummary.textContent) elSummary.hidden = false;
      revealQuestion();
    };

    const p = elVideo.play();
    if (p && p.catch) {
      p.catch(() => { elPlay.hidden = false; });   // 被自动播放策略拦了 → 给个播放键
    }
  }

  elPlay.addEventListener('click', () => {
    elPlay.hidden = true;
    elVideo.play();
  });

  /* ---------- 操作 ---------- */
  // ── 开场页 ──
  const elIntro = $('intro'), elStart = $('startGame');
  let started = false;
  function showIntro() {
    if (!elIntro) return;
    elIntro.hidden = false;
    const root = $('gameRoot'); if (root) root.classList.add('is-intro');
    // ★ 开场页期间不加载、不播放任何视频
    try {
      if (elVideo) { elVideo.pause(); elVideo.removeAttribute('src'); elVideo.load(); elVideo.hidden = true; }
      if (elPlay) elPlay.hidden = true;
      if (elText) elText.hidden = true;
      const sm = $('summary'); if (sm) sm.hidden = true;
      const pr = $('prompt'); if (pr) pr.hidden = true;
      const ch = $('choices'); if (ch) { ch.innerHTML = ''; }
    } catch (e) {}
    document.querySelectorAll('.game-hud, .game-title, #summary, #prompt, #choices')
      .forEach(x => { if (x) x.hidden = true; });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function hideIntro() {
    if (!elIntro) return;
    elIntro.hidden = true;
    const root = $('gameRoot'); if (root) root.classList.remove('is-intro');
    document.querySelectorAll('.game-hud, .game-title')
      .forEach(x => { if (x) x.hidden = false; });
    started = true;
    restart();
    if (!sessionStart) startClock();   // 只在第一次启动；重来不重启
  }
  if (elStart) elStart.addEventListener('click', hideIntro);
  if ($('bagBtn')) $('bagBtn').addEventListener('click', useHeart);

  // ── 结局后：回顾全部作答 + 解析 ──
  function renderReview() {
    const box = $('review'); if (!box) return;
    const list = window.__answers || [];
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    const total = list.reduce((a, x) => a + x.score, 0);
    const right = list.filter((x) => x.score > 0).length;
    let html = '<h3 class="rv-title">这一局你做了什么</h3>';
    const cut = window.__totalCut || 0;
    const shown = Math.max(0, totalElapsed - cut);
    const tmin = Math.floor(shown / 60), tsec = (shown % 60).toFixed(1);
    const tstr = tmin > 0 ? `${tmin} 分 ${tsec} 秒` : `${tsec} 秒`;
    const sxzS = Number(localStorage.getItem('sxzScore') || 0);
    const ttl = total + sxzS;
    html += `<p class="rv-stat">三贤者 ${sxzS} 分　·　影游 ${total} 分　·　<b>合计 ${ttl} 分</b></p>`;
    html += `<p class="rv-stat">共 ${list.length} 个抉择　·　最优 ${right} 个　·　本局得分 <strong>${total > 0 ? '+' : ''}${total}</strong>　·　思考总用时 <strong>${tstr}</strong>${cut ? `（已减 ${cut} 秒）` : ''}</p>`;
    list.forEach((x, i) => {
      const cls = x.score >= 10 ? 'ok' : x.score > 0 ? 'mid' : 'bad';
      const tag = x.score >= 10 ? '+10 最优' : x.score > 0 ? '+5 折中' : x.score < 0 ? x.score + ' 越界' : '0 道具生效';
      html += `<div class="rv-item ${cls}">
        <p class="rv-no">${String(i + 1).padStart(2, '0')}　${x.chapter} · ${x.title}<span class="rv-tag">${tag}</span></p>
        <p class="rv-q">${x.prompt || ''}</p>
        <p class="rv-a">你的选择：${x.label}${timeLog[x.node] ? `　<span class="rv-time">用时 ${timeLog[x.node].toFixed(1)} 秒</span>` : ''}</p>
        <p class="rv-e"><b>解析</b>　${x.explain || '（暂无解析）'}</p>
      </div>`;
    });
    box.innerHTML = html;
  }

  /* ---------- 提交成绩到 Supabase（只提交一次） ---------- */
  var submitted = false;
  /* ---------- 每次选择后都提交一次（保险） ---------- */
  var lastSubmitAt = 0;
  function submitProgress() {
    const sid = localStorage.getItem('studentId');
    if (!sid || !window.SCORE_DB) return;
    const now = Date.now();
    if (now - lastSubmitAt < 800) return;   // 防抖
    lastSubmitAt = now;
    const sxzScore = Number(localStorage.getItem('sxzScore') || 0);
    const cut = window.__totalCut || 0;
    const secs = Math.max(0, totalElapsed - cut);
    SCORE_DB.submitResult(sid, score + sxzScore, secs)
      .then((r) => { if (!r || !r.ok) console.warn('进度提交失败'); })
      .catch(() => {});
  }

  function submitOnce() {
    if (submitted) return;
    const sid = localStorage.getItem('studentId');
    if (!sid || !window.SCORE_DB) return;      // 没输学号（比如直接打开）就不交
    submitted = true;
    const cut = window.__totalCut || 0;
    const secs = Math.max(0, totalElapsed - cut);
    // ★ 加上三贤者的分（0~20）
    const sxzScore = Number(localStorage.getItem('sxzScore') || 0);
    const totalScore = score + sxzScore;
    window.__finalScore = totalScore;

    SCORE_DB.submitResult(sid, totalScore, secs).then((r) => {
      if (!r || r.ok) { console.log('成绩已提交', sid, score, secs.toFixed(1)); return; }
      // ★ 提交失败：把成绩摊在页面上，让学生截图发给老师
      const box = document.createElement('div');
      box.className = 'submit-fail';
      box.innerHTML = '<b>成绩没能上传（网络问题）</b>' +
        '<p>请把下面这一行截图，发给老师登记：</p>' +
        '<code>' + sid + '　' + totalScore + ' 分　' + secs.toFixed(1) + ' 秒</code>' +
        '<p class="sf-tip">下次用同一个名字打开本页，会自动重试上传。</p>';
      const host = document.querySelector('#review') || document.body;
      host.parentNode.insertBefore(box, host.nextSibling);
      console.warn('提交失败，已存本地待重试');
    });
  }

  function restart() {
    window.__answers = []; window.__visitCount = {}; visitedNodes.clear(); window.__totalCut = 0; submitted = false;
    Object.keys(timeLog).forEach(k => delete timeLog[k]);
    // ★ 计时不归零：只要开始过就一直跑
    const tm = $('timer');
    if (tm && sessionStart) { tm.hidden = false; }
    sessionStorage.removeItem('heartUsed');
    heart = loadHeart(); paintBag();
    path.length = 0;
    warns.clear();
    scored.clear();
    score = 0;
    paintScore();
    shuffleAll();          // 重来换个顺序，防止靠位置记忆
    go(S.start);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const btnBack = $('backBtn');
  if (btnBack) btnBack.addEventListener('click', () => {
    let prev = null;
    for (let i = path.length - 1; i >= 0; i--) {
      const nd = S.nodes[path[i]];
      if (nd && nd.choices && nd.choices.length && path[i] !== current) { prev = path[i]; break; }
    }
    if (!prev) { showToast(0, '还没有上一步可以返回'); return; }
    scored.delete(prev);
    window.__answers = (window.__answers || []).filter((x) => x.node !== prev);
    delete timeLog[prev];
    const idx = path.lastIndexOf(current);
    if (idx > 0) path.splice(idx, 1);
    showToast(0, '已返回上一步，可以重选（计时继续）');
    go(prev);
  });

  btnRestart.addEventListener('click', restart);
  btnRestartTop.addEventListener('click', restart);
  btnSkip.addEventListener('click', () => {
    elVideo.pause();
    revealQuestion();               // 跳过 = 直接看题目
  });

  // 键盘：数字键选选项，R 重来
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const n = S.nodes[current];
    if (/^[1-9]$/.test(e.key) && n && n.choices && n.choices[+e.key - 1]) {
      choose(current, n.choices[+e.key - 1]);
    } else if (e.key === 'r' || e.key === 'R') {
      if (!started) { showIntro(); return; }   // 开场页期间不渲染节点、不碰视频
      restart();
    }
  });

  shuffleAll();
  // ★ 有开场页时只显示开场页，不渲染节点（否则视频会预先播放）
  if (elIntro) { showIntro(); } else { go(S.start); }
})();
