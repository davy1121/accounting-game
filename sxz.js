/* 三贤者试炼 · 三条路九题
   单选 5 分 / 判断 5 分 / 多选 10 分；答错不扣分；三题全对得心 */
(function () {
  const PATHS = [
    {
      id: 'zhi', no: '一', name: '致知之路', sub: '理论 · 科目与计量',
      tone: '#0F6CBF', heart: '致知之心', heartDesc: '划掉一个非最优选项，本题答错不扣分',
      qs: [
        { type: 'single', pts: 5,
          q: '如果无形资产经减值测试发生减值损失，应借记的会计科目是？',
          o: ['资产减值损失', '管理费用', '资产减值准备', '营业外支出'],
          a: [0], why: '减值损失计入损益，借记「资产减值损失」，贷记「无形资产减值准备」。' },
        { type: 'judge', pts: 5,
          q: '使用寿命不确定的无形资产，若无减值迹象，无需减值测试。',
          o: ['正确', '错误'], a: [1],
          why: '错。使用寿命不确定的无形资产，无论是否有减值迹象，每年都必须进行减值测试。' },
        { type: 'multi', pts: 10,
          q: '资产可收回金额的计量依据包括？（多选）',
          o: ['资产的公允价值', '公允价值减去处置费用后的净额', '资产预计未来现金流量的现值', '资产预计未来现金流量'],
          a: [1, 2],
          why: '可收回金额 = 公允价值减处置费用后的净额 与 预计未来现金流量现值 两者中的较高者。' },
      ],
    },
    {
      id: 'li', no: '二', name: '力行之路', sub: '实操 · 范围与测试',
      tone: '#8ED000', heart: '力行之心', heartDesc: '跳过本题，直接得 5 分',
      qs: [
        { type: 'single', pts: 5,
          q: '按照《企业会计准则第 8 号——资产减值》的规定，资产减值的对象不包括？',
          o: ['对子公司、联营企业和合营企业的长期股权投资', '采用成本模式进行后续计量的投资性房地产', '存货', '固定资产'],
          a: [2], why: '存货适用《存货》准则，按可变现净值计量，不属于资产减值准则的适用范围。' },
        { type: 'judge', pts: 5,
          q: '无减值迹象的商誉，年末可以不进行减值测试。',
          o: ['正确', '错误'], a: [1],
          why: '错。企业合并形成的商誉，无论是否有减值迹象，每年年末都必须进行减值测试。' },
        { type: 'multi', pts: 10,
          q: '无需减值迹象、每年年末必须进行减值测试的资产有？（多选）',
          o: ['使用寿命确定的固定资产', '使用寿命不确定的无形资产', '企业合并形成的商誉', '对合营企业的长期股权投资'],
          a: [1, 2],
          why: '只有「使用寿命不确定的无形资产」和「企业合并形成的商誉」这两类，无论有无迹象都必须每年测试。' },
      ],
    },
    {
      id: 'zheng', no: '三', name: '正义之路', sub: '准则 · 红线与现金流',
      tone: '#C21E63', heart: '正义之心', heartDesc: '影游结束后，总用时减少 15 秒',
      qs: [
        { type: 'single', pts: 5,
          q: '下列资产减值准备，在减值因素消失后可以在原计提范围内转回的是？',
          o: ['固定资产', '商誉', '原材料', '长期股权投资'],
          a: [2], why: '原材料属于存货，按可变现净值计量，跌价准备可以转回；固定资产、商誉、长期股权投资属长期资产，不得转回。' },
        { type: 'judge', pts: 5,
          q: '预计未来现金流量与折现率，应统一考虑通货膨胀因素影响。',
          o: ['正确', '错误'], a: [0],
          why: '对。如果现金流量已按名义金额反映通胀，折现率也应用名义利率；两者口径必须一致。' },
        { type: 'multi', pts: 10,
          q: '预计资产未来现金流量应当考虑的内容有？（多选）',
          o: ['维持资产运转的现金流出', '资产持续使用的现金流入', '筹资活动现金流', '未来资产改良支出'],
          a: [0, 1],
          why: '预计未来现金流量只考虑资产当前状态下的持续使用与最终处置，不包括筹资活动，也不包括尚未承诺的未来改良支出。' },
      ],
    },
  ];

  const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const store = {
    save(pathId, gotHeart) {
      try {
        const prev = JSON.parse(localStorage.getItem('sxz') || '{}');
        localStorage.setItem('sxz', JSON.stringify({
          path: pathId, heart: gotHeart || null,
          hearts: gotHeart ? [gotHeart] : [],
          at: Date.now(),
        }));
      } catch (e) {}
    },
  };

  let cur = null, qi = 0, score = 0, picked = new Set(), answered = false, pathScore = [];

  const $ = (id) => document.getElementById(id);
  const elChoose = $('choose'), elQuiz = $('quiz'), elResult = $('result');

  /* ── 选路 ── */
  function renderPaths() {
    $('pathList').innerHTML = PATHS.map((p, i) => `
      <button class="path" data-i="${i}" type="button" style="--c:${p.tone}">
        <span class="path-top">
          <span class="path-no">${p.no}</span>
          <svg class="path-heart" viewBox="0 0 100 90" aria-hidden="true"><path d="M50 86S6 58 6 30C6 14 18 4 32 4c8 0 14 4 18 10 4-6 10-10 18-10 14 0 26 10 26 26 0 28-44 56-44 56z"/></svg>
        </span>
        <p class="path-name">${p.name}</p>
        <p class="path-sub">${p.sub}</p>
        <div class="path-tags">
          <span>判断 5</span><span>单选 5</span><span>多选 10</span>
        </div>
        <p class="path-reward">三题全对 → <b>${p.heart}</b></p>
        <span class="path-arrow" aria-hidden="true">→</span>
      </button>`).join('');
    $('pathList').addEventListener('click', (e) => {
      const b = e.target.closest('.path'); if (!b) return;
      start(PATHS[+b.dataset.i]);
    });
  }

  function start(p) {
    cur = p; qi = 0; score = 0; pathScore = [];
    elChoose.hidden = true; elResult.hidden = true; elQuiz.hidden = false;
    renderQ(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function paintScore(bump) {
    const el = $('qScore');
    el.textContent = '得分 ' + score;
    if (bump) {
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 400);
    }
  }

  function renderQ() {
    const q = cur.qs[qi];
    picked = new Set(); answered = false;
    $('qPath').textContent = cur.name;
    $('qStep').textContent = `第 ${qi + 1} / ${cur.qs.length} 题`;
    $('qTitle').textContent = q.q;
    const tname = q.type === 'single' ? '单选题 · 5 分' : q.type === 'judge' ? '判断题 · 5 分' : '多选题 · 10 分（漏选错选不得分）';
    $('qType').textContent = tname;
    paintScore();
    $('qOpts').innerHTML = q.o.map((t, i) => `
      <div class="opt" data-i="${i}">
        <span class="opt-key">${KEYS[i]}</span><span>${t}</span>
      </div>`).join('');
    $('qSubmit').hidden = false;
    $('qSubmit').textContent = '确认作答';
    $('qSubmit').dataset.mode = 'submit';     // ★ 关键：每题都要重置 mode
    $('qVerdict').hidden = true;
    $('qOpts').addEventListener('click', onPick);
  }

  function onPick(e) {
    const o = e.target.closest('.opt'); if (!o || answered) return;
    const q = cur.qs[qi], i = +o.dataset.i;
    if (q.type === 'multi') {
      picked.has(i) ? picked.delete(i) : picked.add(i);
      o.classList.toggle('on', picked.has(i));
    } else {
      picked = new Set([i]);
      [...$('qOpts').children].forEach((c) => c.classList.toggle('on', +c.dataset.i === i));
    }
  }

  $('qSubmit').addEventListener('click', () => {
    if (!picked.size) return;
    const mode = $('qSubmit').dataset.mode || 'submit';
    if (mode === 'next') { next(); return; }
    if (mode === 'retry') { retry(); return; }
    const q = cur.qs[qi];
    const right = new Set(q.a);
    const ok = picked.size === right.size && [...picked].every((x) => right.has(x));
    answered = true;
    // 标对错
    [...$('qOpts').children].forEach((c) => {
      const i = +c.dataset.i;
      if (right.has(i)) c.classList.add('right');
      else if (picked.has(i)) c.classList.add('wrong');
    });
    const firstTry = pathScore.length < qi + 1;   // 这一题是不是第一次作答
    if (firstTry) {
      pathScore.push(ok);
      if (ok) { score += q.pts; paintScore(true); }
    }
    const v = $('qVerdict');
    v.hidden = false;
    v.className = 'verdict ' + (ok ? 'ok' : 'bad');
    if (ok) {
      v.textContent = (firstTry ? `✓ 答对了，+${q.pts} 分。` : `✓ 对了。本题第一次答错，不计分。`) + q.why;
      $('qSubmit').textContent = qi === cur.qs.length - 1 ? '看结果' : '下一题 →';
      $('qSubmit').dataset.mode = 'next';
    } else {
      v.textContent = `✗ 答错了，本题不得分。` + q.why + '　——　可以再试一次。';
      $('qSubmit').textContent = '再试一次';
      $('qSubmit').dataset.mode = 'retry';
    }
  });

  function retry() {
    answered = false;
    picked = new Set();
    [...$('qOpts').children].forEach((c) => {
      c.classList.remove('on', 'right', 'wrong');
    });
    $('qVerdict').hidden = true;
    $('qSubmit').textContent = '确认作答';
    $('qSubmit').dataset.mode = 'submit';
  }

  function next() {
    qi++;
    if (qi < cur.qs.length) { renderQ(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else finish();
  }

  function finish() {
    const allRight = pathScore.every(Boolean);
    store.save(cur.id, allRight ? cur.heart : null);
    // ★ 三贤者的分数也带进影游
    try { localStorage.setItem('sxzScore', String(score)); localStorage.setItem('sxzTotal', '20'); } catch (e) {}
    elQuiz.hidden = true; elResult.hidden = false;
    $('rKicker').textContent = '试炼结束';
    $('rTitle').textContent = allRight ? `通过 ${cur.name}` : `未通过 ${cur.name}`;
    $('rText').textContent = allRight
      ? `三题全对，${cur.heart}归你了。在影游里点右下角的道具，就能用掉它。`
      : `得分 ${score} / 20。三题必须一次全对才能得到${cur.heart}。这一局没有拿到道具，直接进影游吧。`;
    $('rHeart').hidden = !allRight;
    $('rHeartName').textContent = cur.heart;
    if ($('rHeartDesc')) $('rHeartDesc').textContent = cur.heartDesc;
    const useBox = $('rHeartUse');
    if (useBox) {
      useBox.hidden = !allRight;
      const t = {zhi:'在影游的某个抉择上、选项出现之后点它：一个非最优选项会被划掉，而且这道题就算选错也不扣分。', li:'在影游的某个抉择上、选项出现之后点它：直接跳过这道题，并按折中记 5 分。', zheng:'在影游里随便哪一步点它都行：走完整个影游、结算时总用时直接减掉 15 秒。'}[cur.id];
      if ($('rHeartUseText')) $('rHeartUseText').textContent = t || '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const rg = document.getElementById('rulesGo');
  if (rg) rg.addEventListener('click', () => {
    const r = document.getElementById('rules'), c = document.getElementById('choose');
    if (r) r.hidden = true;
    if (c) c.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const ch0 = document.getElementById('choose');
  if (ch0 && document.getElementById('rules')) ch0.hidden = true;

  renderPaths();
})();
