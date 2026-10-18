/* ===== 会计准则妙妙屋 · 通用组件 ===== */

/* ---------- 进度说明（批条） ----------
   window.openComingSoon({ kicker, title, note, actionLabel, onAction }) */
(function () {
  let wrap = null;
  let lastFocus = null;
  let actionHandler = null;

  function build() {
    const el = document.createElement('div');
    el.className = 'cs';
    el.hidden = true;
    el.innerHTML = `
      <div class="cs-mask" data-close></div>
      <div class="cs-card" role="dialog" aria-modal="true" aria-labelledby="csTitle">
        <p class="cs-kicker" id="csKicker"></p>
        <h2 class="cs-title" id="csTitle"></h2>
        <p class="cs-note" id="csNote"></p>
        <div class="cs-actions">
          <button class="cs-btn is-primary" type="button" id="csAction"></button>
          <button class="cs-btn" type="button" data-close>知道了</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) close();
    });
    el.querySelector('#csAction').addEventListener('click', () => {
      const run = actionHandler;
      close();
      if (run) run();
    });
    return el;
  }

  function open(opts) {
    if (!wrap) wrap = build();
    const o = opts || {};

    if (o.tone) wrap.style.setProperty('--tone', o.tone);
    if (o.toneDark) wrap.style.setProperty('--tone-dark', o.toneDark);

    wrap.querySelector('#csKicker').textContent = o.kicker || '';
    wrap.querySelector('#csTitle').textContent = o.title || '敬请期待';
    wrap.querySelector('#csNote').textContent = o.note || '这一条还在整理。';

    const action = wrap.querySelector('#csAction');
    const label = o.actionLabel || '';
    action.textContent = label;
    action.hidden = !label;
    actionHandler = o.onAction || null;

    lastFocus = document.activeElement;
    wrap.hidden = false;
    requestAnimationFrame(() => wrap.classList.add('show'));
    (label ? action : wrap.querySelector('[data-close]')).focus();
  }

  function close() {
    if (!wrap || wrap.hidden) return;
    wrap.classList.remove('show');
    setTimeout(() => { wrap.hidden = true; }, 240);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap && !wrap.hidden) close();
  });

  window.openComingSoon = open;
})();


/* ---------- 页面转场 ----------
   正向：点条目 → 该行放大铺满 → 跳转 → 到达页幕布淡出
   返回：点返回 → 幕布淡入覆盖 → 跳转 → 首页幕布收缩回那一行 */
(function () {
  const T_KEY = 'mmw-transition';   // 单次消费：到达页读取后立即清除
  const O_KEY = 'mmw-origin';       // 持久保留：那一行的位置，供返回时收缩

  /* 幕布取 --幕 的计算值，浅色/暗色各自换值，不在 JS 里写死颜色 */
  const curtainFill = () => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--幕').trim();
    return v || '#1D2B3F';
  };

  const reduceMotion = () =>
    window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function save(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }
  function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  /* opts: { href, fill?, fromRect?, keepRect?, shrinkTo?, delay? }
     fromRect 有值 → 从该矩形放大铺满；无值 → 幕布原地淡入覆盖 */
  window.ptLeave = function (opts) {
    const o = opts || {};
    if (!o.href) return;

    const fill = o.fill || curtainFill();
    const payload = { fill };
    if (o.shrinkTo) payload.rect = o.shrinkTo;
    save(T_KEY, payload);
    // 记下这一格的颜色，返回时幕布才收得回同一种颜色
    if (o.keepRect) save(O_KEY, { fill, rect: o.keepRect });

    if (reduceMotion()) { window.location.href = o.href; return; }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = document.createElement('div');
    el.className = 'pt-fly';

    if (o.fromRect) {
      const r = o.fromRect;
      el.style.cssText =
        `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;` +
        `background:${fill};border-radius:${o.radius || '20px'};` +
        `transition:transform .07s ease-out, border-radius .07s ease-out;`;
      document.body.appendChild(el);
      void el.offsetWidth;                  // 锁定初始状态，否则过渡不触发

      // 蓄力：先微缩一下（保持中心不动），再弹开。
      // 只说了一句话：这一格被按下去，然后撑开成全屏。
      const k = 0.94;
      const cx = (1 - k) * r.w / 2;
      const cy = (1 - k) * r.h / 2;

      requestAnimationFrame(() => {
        el.style.transform = `translate(${cx}px,${cy}px) scale(${k})`;

        setTimeout(() => {
          el.style.transition =
            'transform .38s cubic-bezier(.22,1.08,.36,1), border-radius .38s ease';
          el.style.transform =
            `translate(${-r.x}px,${-r.y}px) scale(${vw / r.w},${vh / r.h})`;
          el.style.borderRadius = '0';
        }, 72);
      });

      setTimeout(() => { window.location.href = o.href; }, o.delay || 470);
    } else {
      el.style.cssText =
        `left:0;top:0;width:100vw;height:100vh;background:${fill};opacity:0;` +
        `transition:opacity .3s ease;`;
      document.body.appendChild(el);
      void el.offsetWidth;
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => { window.location.href = o.href; }, o.delay || 330);
    }
  };

  window.ptReadOrigin = () => read(O_KEY);

  function playEnter() {
    const root = document.documentElement;
    if (!root.classList.contains('is-entering')) return;
    if (reduceMotion()) { root.classList.remove('is-entering'); return; }

    const curtain = document.querySelector('.pt-curtain');
    if (!curtain) return;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add('is-leaving');
    }));
    setTimeout(() => { root.classList.remove('is-entering'); }, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playEnter);
  } else {
    playEnter();
  }
})();


/* ---------- 入场动画兜底 ----------
   格子的入场动画用 animation-fill-mode: backwards 做错峰，
   代价是「动画没跑起来时元素停在 opacity: 0」。
   浏览器正常情况下不会发生，但汇报现场不能赌：
   1.2 秒后凡是没有真正显示的格子，直接摘掉动画。 */
(function () {
  function sweep() {
    document.querySelectorAll('.tile').forEach((el) => {
      if (getComputedStyle(el).opacity === '0') el.style.animation = 'none';
    });
  }
  // 页面在后台时动画会被浏览器暂停，切回来再扫一次
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(sweep, 1400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(sweep, 1200));
  } else {
    setTimeout(sweep, 1200);
  }
})();


/* ============================================================
   3D 悬浮场景（首页七格 / 详情页三格共用）
   ────────────────────────────────────────────────────────────
   提供三件事：
     ① 鼠标移动 → 场景旋转（视差），并给每格按深度追加位移
     ② 点一次 → 卡片放大居中；再点一次 → 执行动作
     ③ Esc / 点空白 → 还原

   参数：
     scene   场景容器（有 perspective 的那层）
     plane   会旋转的那层
     veil    聚光遮罩（必须放在最外层，见下）
     hint    提示文字（可选）
     onAct(slot)   第二次点击时执行的动作
     focusScale    放大倍率，默认 1.06

   ★ veil 必须挂在 body 级：.scene 有 perspective、.page 转场时会加
     transform，两者都会成为 position:fixed 后代的包含块，
     把遮罩困在里面（实测踩过两次）。
   ============================================================ */
window.init3DScene = function (opts) {
  const scene = opts.scene;
  const plane = opts.plane;
  if (!scene || !plane) return null;

  const veil = opts.veil || null;
  const hint = opts.hint || null;
  const onAct = opts.onAct || function () {};
  const focusScale = opts.focusScale || 1.06;

  const slots = () => Array.from(plane.querySelectorAll('.slot'));
  let focused = null;

  /* ---------- ① 鼠标视差 ---------- */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MAX_Y = 9, MAX_X = 6;

  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  const enabled = fine.matches && !reduce.matches;

  function frame() {
    if (focused) return;          // 放大时场景保持正对，不跟它抢 transform
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    plane.style.transform =
      'rotateX(' + cy.toFixed(3) + 'deg) rotateY(' + cx.toFixed(3) + 'deg)';

    // 按深度追加位移：越靠前的格子走得越多，视差更明显
    const k = 0.55;
    slots().forEach((s) => {
      const z = parseFloat(s.style.getPropertyValue('--z')) || 0;
      const f = z / 46 * k;
      s.style.transform =
        'translate3d(' + (cx * f).toFixed(2) + 'px,' + (-cy * f).toFixed(2) + 'px,0)';
    });

    if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
    }
  }
  function kick() { if (raf === null) raf = requestAnimationFrame(frame); }

  if (enabled) {
    scene.addEventListener('mousemove', (e) => {
      const r = scene.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width * 2 - 1) * MAX_Y;
      ty = -((e.clientY - r.top) / r.height * 2 - 1) * MAX_X;
      kick();
    });
    scene.addEventListener('mouseleave', () => { tx = 0; ty = 0; kick(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { tx = 0; ty = 0; kick(); }
    });
  }

  /* ---------- ② 放大 / 还原 ---------- */
  function unfocus() {
    if (!focused) return;
    const c = focused.querySelector('.card3d');
    if (c) c.style.transform = '';        // 去掉内联，回到 CSS 静态摆位
    focused.classList.remove('is-focus');
    scene.classList.remove('is-focused');
    slots().forEach((s) => s.classList.remove('is-dim'));
    if (veil) veil.hidden = true;
    if (hint) hint.classList.remove('is-hidden');
    focused = null;
  }

  function focus(slot) {
    focused = slot;
    /* 放大时先把场景摆正（旋转归零）。
       不摆正的话，卡片是在一个倾斜的坐标系里做位移，投影到屏幕会偏
       （实测最多偏 53px）；摆正后居中精确，卡片也是正视的、更好读。 */
    scene.classList.add('is-focused');
    tx = 0; ty = 0; cx = 0; cy = 0;
    plane.style.transform = '';
    slots().forEach((s) => { s.style.transform = ''; });

    const card = slot.querySelector('.card3d');
    if (card) {
      const cr = card.getBoundingClientRect();
      const Z = 170;                                    // 沿 Z 推近的距离
      const pRaw = getComputedStyle(slot).perspective;
      const P = pRaw === 'none' ? 0 : (parseFloat(pRaw) || 900);
      const depthScale = P > Z ? P / (P - Z) : 1;       // 透视放大倍数

      /* ★ 两个坑：
         ① 卡片静止时自己也带一点 Z（--z），getBoundingClientRect 量到的
            是投影后的尺寸，要先还原成布局尺寸再算，否则倍率估不准。
         ② translate3d 里的 dx/dy 在槽的 3D 空间里，投影到屏幕时同样会被
            放大 depthScale 倍。所以「想要的屏幕位移」必须除以 depthScale。
            不除的话居中会偏（实测偏了 34px）。
         合起来：尺寸和位置都要按透视换算，卡片才会精确落在视口正中。 */
      const zRest = parseFloat(slot.style.getPropertyValue('--z')) || 0;
      const restScale = P > zRest ? P / (P - zRest) : 1;
      const boxW = cr.width / restScale;
      const boxH = cr.height / restScale;

      const atZ_W = boxW * depthScale;                  // 推到 Z、未额外缩放时的尺寸
      const atZ_H = boxH * depthScale;

      const M = 40;                                     // 距视口边缘留白（兼顾 7px 硬投影）
      const fit = Math.min(
        (window.innerWidth - M * 2) / atZ_W,
        (window.innerHeight - M * 2) / atZ_H,
        1.35                                            // 小卡片也别放太大
      );
      const k = Math.max(0.2, Math.min(focusScale, fit));

      const dx = (window.innerWidth / 2 - (cr.left + cr.width / 2)) / depthScale;
      const dy = (window.innerHeight / 2 - (cr.top + cr.height / 2)) / depthScale;

      card.style.transform =
        'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,' + Z + 'px) ' +
        'rotateY(0deg) rotateX(0deg) scale(' + k.toFixed(3) + ')';
    }
    slots().forEach((s) => s.classList.toggle('is-dim', s !== slot));
    slot.classList.add('is-focus');

    // 放大的卡片上，那个动作按钮才是唯一「不退出」的点击目标。
    // 让它可以被 Tab 到，并把焦点移过去，键盘用户回车即可执行。
    const act = slot.querySelector('.tile-state');
    if (act) { act.tabIndex = 0; try { act.focus({ preventScroll: true }); } catch (e) { act.focus(); } }
    if (veil) veil.hidden = false;
    if (hint) hint.classList.add('is-hidden');
  }

  /* ---------- ③ 事件 ---------- */
  /* 点击规则（只用一个处理器，避免「聚焦又立刻被退出」）：
       · 点「动作按钮」        → 执行
       · 已放大时点任意地方     → 退出（含卡片本身、别的卡片、背景）
       · 未放大时点卡片        → 放大
     卡片本身不再承担「执行」，否则第二次点它就分不清是「再看一眼」还是「进去」，
     「点哪都退出」也就不成立了。 */
  document.addEventListener('click', (e) => {
    const act = e.target.closest('.tile-state');
    if (act && plane.contains(act)) { onAct(act.closest('.slot')); return; }

    if (focused) { unfocus(); return; }

    const card = e.target.closest('.card3d');
    if (card && plane.contains(card)) focus(card.closest('.slot'));
  });

  plane.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.tile-state')) return;   // 按钮自己处理回车
    const card = e.target.closest('.card3d');
    if (!card) return;
    e.preventDefault();
    if (!focused) focus(card.closest('.slot'));
  });

  if (veil) veil.addEventListener('click', unfocus);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && focused) unfocus();
  });

  return { unfocus, focus, isFocused: () => focused };
};
