/* ===== 资产减值 · 详情页（3D 卡片）=====

   ★ 内容只改下面这个 SECTIONS 数组。
     加 href 那一格就自动变成「可打开」：
       .html → 站内跳转；其他 → 新标签打开；留空 '' → 敬请期待

   3D 摆放：每一格可以在 slot 里调
     z    深度（px，越大越靠前）
     ry   绕 Y 轴倾斜（deg）  rx  绕 X 轴倾斜（deg）
     ty   垂直错落（px）
     fd   漂浮动画延迟（s，错开相位）
*/
const SECTIONS = [
  {
    cn: '一',
    name: 'PPT 课件',
    sum: '减值迹象、可收回金额、资产组、商誉减值',
    tone: '#2D9CFF', toneDark: '#0F6CBF',
    inside: '研究生课程课件，共 59 页',
    href: 'cas8-slides.pptx',
    slot: { z: -30, ry: 9,  rx: 4,  ty: -16, fd: 0 },
  },
  {
    cn: '二',
    name: '案例视频',
    sum: '用一家真实公司走一遍完整的减值测试',
    tone: '#9B8AFF', toneDark: '#6B57D6',
    href: 'case.mp4',
    slot: { z: 46,  ry: 0,  rx: -2, ty: 14,  fd: -2.4 },
  },
  {
    cn: '三',
    name: '趣味游戏',
    sum: '先过三贤者试炼，再进互动影游',
    tone: '#8ED000', toneDark: '#5F8C00',
    href: 'sxz.html',
    slot: { z: -22, ry: -9, rx: 4,  ty: -8,  fd: -4.6 },
  },
];

/* hex → rgba，用来做半透明玻璃填充（不依赖 color-mix，兼容性更稳） */
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

const planeEl = document.getElementById('plane');
const veilEl = document.getElementById('veil');
const hintEl = document.getElementById('hint');

planeEl.innerHTML = SECTIONS.map((s, i) => {
  const ready = Boolean(s.href);
  const t = s.slot || {};
  const style = [
    '--tone:' + s.tone,
    '--tone-dark:' + s.toneDark,
    '--tone-glass:' + rgba(s.tone, .62),      // 浅色：场亮，可以透一点
    '--tone-solid:' + rgba(s.tone, .88),      // 暗色：场暗，必须更实，否则深字压不住
    '--z:' + (t.z || 0) + 'px',
    '--ry:' + (t.ry || 0) + 'deg',
    '--rx:' + (t.rx || 0) + 'deg',
    '--ty:' + (t.ty || 0) + 'px',
    '--fd:' + (t.fd || 0) + 's',
  ].join(';');

  return `
    <div class="slot" data-name="${s.name}" style="${style}">
      <div class="tile round card3d card3d--glass" role="button" tabindex="0"
              aria-label="${ready ? `打开${s.name}` : `${s.name}，敬请期待`}">
        <div class="tile-main">
          <div class="tile-head">
            <span class="tile-no">${s.cn}</span>
            <h2 class="tile-name">${s.name}</h2>
          </div>
          <p class="tile-sum">${s.sum}</p>
        </div>
        ${s.inside ? `<p class="tile-inside">${s.inside}</p>` : ''}
        <button class="tile-state${ready ? ' is-ok' : ''}" type="button" tabindex="-1">${ready ? '打开' : '敬请期待'}</button>
      </div>
    </div>`;
}).join('');

const byName = (n) => SECTIONS.find((x) => x.name === n);

/* ================= 3D 交互 =================
   视差 + 点击放大 + 再点执行，实现都在 common.js 的 init3DScene 里，
   首页和详情页共用同一套。 */
function act(s) {
  if (s.href) {
    if (/\.html?$/i.test(s.href)) window.location.href = s.href;
    else window.open(s.href, '_blank');
    return;
  }
  const ready = SECTIONS.find((x) => x.href);
  window.openComingSoon({
    kicker: `资产减值 · ${s.cn}`,
    title: s.name,
    note: s.name === '案例视频'
      ? '案例视频还在剪。课件和互动影游已经能看了。'
      : '这一项还在做。',
    tone: s.tone, toneDark: s.toneDark,
    actionLabel: ready ? `打开${ready.name}` : '',
    onAction: ready ? () => window.open(ready.href, '_blank') : null,
  });
}

window.init3DScene({
  scene: document.getElementById('scene'),
  plane: planeEl,
  veil: veilEl,
  hint: hintEl,
  focusScale: 1.06,
  onAct(slot) {
    const s = byName(slot.dataset.name);
    if (s) act(s);
  },
});

/* ================= 返回妙妙屋 ================= */
const backEl = document.querySelector('.back');
if (backEl) {
  backEl.addEventListener('click', (e) => {
    e.preventDefault();
    const origin = window.ptReadOrigin();
    window.ptLeave({
      href: backEl.getAttribute('href') || 'index.html',
      fill: (origin && origin.fill) || '#FF3D8B',
      shrinkTo: origin && origin.rect,
    });
  });
}
