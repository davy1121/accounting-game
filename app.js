/* ===== 会计准则妙妙屋 · 首页 ===== */

/* 按准则号升序。基本准则无编号，但它是整个准则体系的总纲，排在最前。
   每格一个色相（等明度等彩度），颜色即准则身份：认色识准则。 */
const STANDARDS = [
  {
    no: '总', name: '基本准则',
    sum: '会计目标、基本假设和会计信息质量要求',
    tone: '#9B8AFF', toneDark: '#6B57D6',
    span: 5, slot: { z: -8,  ry: 0, rx: 0, ty: 0 },
  },
  {
    no: '1', name: '存货',
    sum: '成本怎么归集，跌价准备怎么提',
    tone: '#8ED000', toneDark: '#5F8C00',
    span: 7, slot: { z: 5,   ry: 0, rx: 0, ty: 0 },
  },
  {
    no: '3', name: '投资性房地产',
    sum: '两种后续计量模式怎么选、怎么相互转换',
    tone: '#FFB020', toneDark: '#C07B00',
    span: 7, slot: { z: -5,  ry: 0, rx: 0, ty: 0 },
  },
  {
    no: '6', name: '无形资产',
    sum: '研发支出哪些能资本化，之后怎么摊销',
    tone: '#00C2A8', toneDark: '#00806E',
    span: 5, slot: { z: 9,   ry: 0, rx: 0, ty: 0 },
  },
  {
    no: '8', name: '资产减值',
    sum: '什么时候要测减值，可收回金额怎么算',
    tone: '#FF3D8B', toneDark: '#C21E63',
    span: 12, href: '资产减值.html',
    inside: '里面有课件、案例视频和趣味游戏',
    slot: { z: 14,  ry: 0, rx: 0, ty: 0 },     // 唯一能进的，推到最前
  },
  {
    no: '22', name: '金融工具确认和计量',
    sum: '金融资产怎么分类，减值怎么计提',
    tone: '#2D9CFF', toneDark: '#0F6CBF',
    span: 8, slot: { z: -11, ry: 0, rx: 0, ty: 0 },
  },
  {
    no: '39', name: '公允价值计量',
    sum: '三个层级的输入值怎么取',
    tone: '#FF6B35', toneDark: '#C24A1B',
    span: 4, slot: { z: 7,   ry: 0, rx: 0, ty: 0 },
  },
];

const planeEl = document.getElementById('plane');

/* hex → rgba */
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

planeEl.innerHTML = STANDARDS.map((s, i) => {
  const ready = Boolean(s.href);
  const t = s.slot || {};
  const style = [
    '--tone:' + s.tone,
    '--tone-dark:' + s.toneDark,
    '--tone-glass:' + rgba(s.tone, .72),
    '--tone-solid:' + rgba(s.tone, .92),
    '--z:' + (t.z || 0) + 'px',
    '--ry:' + (t.ry || 0) + 'deg',
    '--rx:' + (t.rx || 0) + 'deg',
    '--ty:' + (t.ty || 0) + 'px',
  ].join(';');

  return `
    <div class="slot span-${s.span}" data-name="${s.name}" style="${style}">
      <div class="tile round card3d${ready ? ' is-feature' : ''}" role="button" tabindex="0"
              style="animation-delay:${i * 55}ms"
              aria-label="${ready ? `${s.name}，点一下放大，再点卡片上的按钮进入小屋` : `${s.name}，点一下放大`}">
        <div class="tile-main">
          <div class="tile-head">
            <span class="tile-no">${s.no}</span>
            <h2 class="tile-name">${s.name}</h2>
          </div>
          <p class="tile-sum">${s.sum}</p>
        </div>
        ${s.inside ? `<p class="tile-inside">${s.inside}</p>` : ''}
        <button class="tile-state${ready ? ' is-ok' : ''}" type="button" tabindex="-1">${ready ? '进入小屋' : '敬请期待'}</button>
      </div>
    </div>`;
}).join('');

/* 用「资产减值」那一格的颜色灌满屏幕，再展开成下一页 */
function openStandard(slot, s) {
  const card = slot.querySelector('.card3d');
  const r = card.getBoundingClientRect();
  window.ptLeave({
    href: s.href,
    fill: s.tone,
    radius: '20px',
    fromRect: { x: r.left, y: r.top, w: r.width, h: r.height },
    keepRect: { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height },
  });
}

const byName = (n) => STANDARDS.find((x) => x.name === n);

window.init3DScene({
  scene: document.getElementById('scene'),
  plane: planeEl,
  veil: document.getElementById('veil'),
  hint: document.getElementById('hint'),
  focusScale: 1.04,
  onAct(slot) {
    const s = byName(slot.dataset.name);
    if (!s) return;

    if (s.href) { openStandard(slot, s); return; }

    // 死路变指路：空状态直接给出下一步
    const openSlot = planeEl.querySelector('.slot .card3d.is-feature')?.closest('.slot');
    window.openComingSoon({
      kicker: s.no === '总' ? '总纲' : `准则 ${s.no}`,
      title: s.name,
      note: '这一条还在整理。目前能进去的只有「资产减值」。',
      tone: s.tone, toneDark: s.toneDark,
      actionLabel: '去看资产减值',
      onAction: () => openStandard(openSlot, byName('资产减值')),
    });
  },
});
