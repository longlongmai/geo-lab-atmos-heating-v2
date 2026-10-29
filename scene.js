// 大气受热过程：底图与箭头绘制、导出图片、课堂提交接口
// 学生页（index.html）、作品墙（wall.html）、老师开课页（teacher.html）共用
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1000, H = 625;
  const EARTH = { x: 500, y: 1100 }, R_GROUND = 650, R_TOP = 890;
  const SW = '#f5b400', LW = '#f0663a';

  // 可拖拽素材（与原页面一致的 6 种）
  const LIB = [
    { key: 'solar',            label: '太阳短波辐射',       color: SW, w: 12, len: 130 },
    { key: 'atmosAbsorbSolar', label: '大气吸收（太阳辐射）', color: SW, w: 7,  len: 90  },
    { key: 'surfaceSolar',     label: '到达地面太阳辐射',    color: SW, w: 9,  len: 120 },
    { key: 'groundLongwave',   label: '地面长波辐射',       color: LW, w: 9,  len: 120 },
    { key: 'atmosAbsorbGround',label: '大气吸收地面辐射',    color: LW, w: 8,  len: 100 },
    { key: 'backRadiation',    label: '大气逆辐射',         color: LW, w: 7,  len: 110 },
  ];
  const CFG = Object.fromEntries(LIB.map(c => [c.key, c]));
  const W_MIN = 3, W_MAX = 40;

  // SVG 文字描边样式（各页面共用，也写进导出图片）
  const LBL_CSS = '.lbl{font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round;fill:#1e2b3a}';
  const st = document.createElement('style');
  st.textContent = LBL_CSS;
  document.head.appendChild(st);

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const aw = a => a.w ?? CFG[a.key].w;

  // ---------- 底图 ----------
  // p 为 id 前缀：同一页面里有多张图（作品墙）时，渐变和滤镜 id 不能重复
  function drawBase(parent, cloudOn = true, p = '') {
    parent.innerHTML = '';
    const defs = el('defs', {}, parent);
    defs.innerHTML = `
      <linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0f3d6e"/><stop offset=".32" stop-color="#3f86c4"/>
        <stop offset=".62" stop-color="#9ccdee"/><stop offset="1" stop-color="#e3f3ff"/>
      </linearGradient>
      <radialGradient id="${p}sunGlow"><stop offset="0" stop-color="#fff3a6" stop-opacity=".95"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>
      <radialGradient id="${p}atmos" cx="${EARTH.x}" cy="${EARTH.y}" r="${R_TOP}" gradientUnits="userSpaceOnUse">
        <stop offset="${R_GROUND / R_TOP}" stop-color="#bfe3ff" stop-opacity=".55"/>
        <stop offset="1" stop-color="#bfe3ff" stop-opacity=".05"/>
      </radialGradient>
      <linearGradient id="${p}land" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8bc34a"/><stop offset=".25" stop-color="#689f38"/><stop offset="1" stop-color="#4e7a2a"/>
      </linearGradient>
      <filter id="${p}soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="${p}sel" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#1f8fc4" flood-opacity=".9"/></filter>`;
    el('rect', { width: W, height: H, fill: `url(#${p}sky)` }, parent);
    // 星点（太空）
    const stars = el('g', { fill: '#fff', opacity: .7 }, parent);
    [[420, 40], [520, 70], [610, 30], [720, 60], [820, 25], [900, 80], [960, 40], [360, 90], [660, 110], [860, 130]]
      .forEach(([x, y], i) => el('circle', { cx: x, cy: y, r: i % 3 ? 1.2 : 1.8 }, stars));
    // 大气层
    el('circle', { cx: EARTH.x, cy: EARTH.y, r: R_TOP, fill: `url(#${p}atmos)` }, parent);
    el('circle', { cx: EARTH.x, cy: EARTH.y, r: R_TOP, fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-dasharray': '14 10', opacity: .9 }, parent);
    label(parent, '大气上界', 900, 282, 24, '#fff', 'none');
    label(parent, '大 气 层', 680, 420, 18, '#2c5d86', 'none').setAttribute('opacity', '.55');
    // 太阳
    const sun = el('g', {}, parent);
    el('circle', { cx: 120, cy: 90, r: 95, fill: `url(#${p}sunGlow)` }, sun);
    for (let i = 0; i < 12; i++) {
      const t = i * Math.PI / 6;
      el('line', { x1: 120 + Math.cos(t) * 54, y1: 90 + Math.sin(t) * 54, x2: 120 + Math.cos(t) * 72, y2: 90 + Math.sin(t) * 72,
        stroke: '#ffd23f', 'stroke-width': 4, 'stroke-linecap': 'round' }, sun);
    }
    el('circle', { cx: 120, cy: 90, r: 44, fill: '#ffcf1f', stroke: '#ffe680', 'stroke-width': 3 }, sun);
    label(parent, '太阳', 120, 98, 20, '#7a4b00', 'none');
    // 云
    if (cloudOn) { cloud(parent, 320, 300, 1.2, p); cloud(parent, 680, 262, 1.0, p); }
    // 地面
    el('circle', { cx: EARTH.x, cy: EARTH.y, r: R_GROUND + 8, fill: '#3a8fd0', opacity: .5 }, parent);
    el('circle', { cx: EARTH.x, cy: EARTH.y, r: R_GROUND, fill: `url(#${p}land)` }, parent);
    label(parent, '地 面', 500, 560, 26, '#fff', 'none').setAttribute('opacity', '.9');
    // 固定辐射（底图自带）
    scatter(parent, 110, 420);
    fixed(parent, 110, 580, -Math.PI * .65, 80, 4, SW, '地面反射');
    fixed(parent, 480, 452, -Math.PI / 2, 292, 4, LW, '射向宇宙的地面辐射', 'above');
    fixed(parent, 360, 280, -Math.PI / 2.8, 100, 8, SW, '云层反射（太阳辐射）', 'left');
    fixed(parent, 680, 228, -Math.PI / 2, 150, 7, LW, '射向宇宙的大气辐射', 'side');
  }

  function label(parent, text, x, y, size, fill = '#1e2b3a', stroke = '#fff', anchor = 'middle') {
    const t = el('text', { x, y, 'font-size': size, 'text-anchor': anchor, class: 'lbl' }, parent);
    t.style.fill = fill;
    if (stroke === 'none') t.style.stroke = 'none';
    t.textContent = text;
    return t;
  }

  function cloud(parent, x, y, s, p) {
    const g = el('g', { transform: `translate(${x} ${y}) scale(${s})`, fill: '#fff' }, parent);
    el('g', { filter: `url(#${p}soft)`, opacity: .7 }, g).innerHTML =
      '<ellipse cx="15" cy="12" rx="80" ry="30"/>';
    [[-30, 10, 25], [0, -10, 35], [35, 0, 28], [60, 10, 22], [15, 15, 30]].forEach(([cx, cy, r]) => el('circle', { cx, cy, r }, g));
  }

  function scatter(parent, x, y) {
    const g = el('g', {}, parent);
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4;
      drawArrowShape(g, x + Math.cos(t) * 10, y + Math.sin(t) * 10, x + Math.cos(t) * 46, y + Math.sin(t) * 46, 4, SW, 9);
    }
    el('circle', { cx: x, cy: y, r: 5, fill: '#7a6450' }, g);
    label(g, '大气散射', x, y - 56, 19);
  }

  function fixed(parent, x, y, ang, len, w, color, text, mode) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const g = el('g', {}, parent);
    drawArrowShape(g, x, y, x2, y2, w, color);
    if (mode === 'end') label(g, text, x2 + 10, y2 + 4, 18, '#1e2b3a', '#fff', 'start');
    else if (mode === 'left') label(g, text, (x + x2) / 2 - 12, (y + y2) / 2 + 6, 18, '#1e2b3a', '#fff', 'end');
    else if (mode === 'side') label(g, text, (x + x2) / 2 + 14, (y + y2) / 2, 18, '#1e2b3a', '#fff', 'start');
    else if (mode === 'above') label(g, text, x2, y2 - 14, 18);
    else label(g, text, (x + x2) / 2, (y + y2) / 2 - 14, 18);
  }

  // 画一支箭头（杆 + 头），返回 {ux,uy,len}
  function drawArrowShape(parent, x1, y1, x2, y2, w, color, headOverride) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const head = Math.min(headOverride || Math.max(12, w * 2.1), len * .6);
    const bx = x2 - ux * head, by = y2 - uy * head, hw = Math.max(head * .62, w * 1.1);
    el('line', { x1, y1, x2: bx + ux * 1, y2: by + uy * 1, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, parent);
    el('polygon', { points: `${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`, fill: color }, parent);
    return { ux, uy, len };
  }

  function labelSide(a) {
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const vertical = Math.abs(dy) > Math.abs(dx) * 1.2;
    const side = (a.x1 + a.x2) / 2 > 860 ? -1 : 1;   // 靠右边缘时标签放左侧
    return { vertical, side };
  }

  // 标签放置：横向箭头放上方，竖向箭头放右侧
  function placeLabel(parent, a, text, size) {
    const mx = (a.x1 + a.x2) / 2, my = (a.y1 + a.y2) / 2;
    const { vertical, side } = labelSide(a);
    if (vertical) {
      return label(parent, text, mx + side * (aw(a) + 10), my + 6, size, '#1e2b3a', '#fff', side > 0 ? 'start' : 'end');
    }
    return label(parent, text, mx, my - aw(a) - 10, size);
  }

  // ---------- 静态渲染：一份作品（arrows + showCloud）画成独立 SVG ----------
  let uid = 0;
  function buildStaticSvg(model) {
    const p = `s${++uid}-`;
    const s = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });
    drawBase(el('g', {}, s), model.showCloud !== false, p);
    const g = el('g', {}, s);
    (model.arrows || []).forEach(a => {
      const c = CFG[a.key];
      if (!c) return;
      const ag = el('g', {}, g);
      drawArrowShape(ag, a.x1, a.y1, a.x2, a.y2, aw(a), c.color);
      placeLabel(ag, a, c.label, 19);
    });
    return s;
  }

  const pad = n => String(n).padStart(2, '0');
  const fmtTime = t => { const d = new Date(t); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  // ---------- 保存图片（2 倍清晰度，带小组名与时间） ----------
  function exportPng(model) {
    return new Promise((resolve, reject) => {
      const s = buildStaticSvg(model);
      s.setAttribute('xmlns', NS);
      s.setAttribute('width', W); s.setAttribute('height', H);
      const style = document.createElementNS(NS, 'style');
      style.textContent = `text{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif}${LBL_CSS}`;
      s.insertBefore(style, s.firstChild);
      const data = new XMLSerializer().serializeToString(s);
      const img = new Image();
      img.onload = () => {
        const S = 2, top = 64;
        const cv = document.createElement('canvas');
        cv.width = W * S; cv.height = (H + top) * S;
        const cx = cv.getContext('2d');
        cx.scale(S, S);
        cx.fillStyle = '#16324f'; cx.fillRect(0, 0, W, top);
        cx.fillStyle = '#fff'; cx.font = 'bold 24px "Microsoft YaHei", sans-serif'; cx.textBaseline = 'middle';
        cx.fillText('大气受热过程模型', 20, top / 2);
        cx.font = '18px "Microsoft YaHei", sans-serif'; cx.textAlign = 'right';
        const g = (model.name || '').trim();
        const now = model.time ? new Date(model.time) : new Date();
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        cx.fillText((g ? g + '　' : '') + ts, W - 20, top / 2);
        cx.drawImage(img, 0, top, W, H);
        const a = document.createElement('a');
        a.download = `大气受热过程_${g || '模型'}_${ts.replace(/[: ]/g, '-')}.png`;
        a.href = cv.toDataURL('image/png');
        a.click();
        resolve();
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    });
  }

  // ---------- 课堂：学生提交 → 中转服务 → 老师作品墙 ----------
  // 用免注册的 ntfy.sh 消息中转：学生页把作品发到“课堂码”对应的频道，作品墙实时接收。
  // 不需要账号和令牌；消息在中转服务上保留 12 小时，作品墙另在本机浏览器里留存一份。
  const RELAY = 'https://ntfy.sh/';
  const CHANNEL = 'geolab-atmos-q7m2x9-';
  const APP = 'atmos-heating';
  const KEYS = LIB.map(c => c.key);

  const newCode = () => String(Math.floor(1000 + Math.random() * 9000));
  const validCode = c => /^\d{4}$/.test(String(c || '').trim());
  function readCode() {
    const m = (location.search + location.hash).match(/[?#&]k=(\d{4})\b/);
    return m ? m[1] : null;
  }

  // 只发 ASCII（中文转成 \uXXXX），避免中转服务把非 ASCII 正文当成附件
  const asciiJson = o => JSON.stringify(o).replace(/[\u007f-\uffff]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));

  async function send(code, obj) {
    let r;
    try {
      r = await fetch(RELAY + CHANNEL + code, { method: 'POST', body: asciiJson({ app: APP, ...obj }) });
    } catch (e) {
      throw new Error('网络连接失败，请检查网络后重试');
    }
    if (r.status === 429) throw new Error('提交太频繁，请过几秒再试');
    if (!r.ok) throw new Error('提交失败（' + r.status + '），请稍后重试');
  }

  function submitWork(code, w) {
    const a = w.arrows.map(x => [KEYS.indexOf(x.key), Math.round(x.x1), Math.round(x.y1), Math.round(x.x2), Math.round(x.y2), x.w || 0]);
    return send(code, { type: 'work', name: w.name, note: (w.note || '').slice(0, 300), cloud: w.showCloud === false ? 0 : 1, a });
  }
  function submitScore(code, name, scores, total, remark) {
    return send(code, { type: 'score', name, scores, total, remark: remark || '' });
  }

  function workFromWire(o, time) {
    const arrows = (o.a || []).filter(x => Array.isArray(x) && KEYS[x[0]]).map((x, i) => {
      const a = { id: time + i, key: KEYS[x[0]], x1: clamp(+x[1] || 0, 0, W), y1: clamp(+x[2] || 0, 0, H), x2: clamp(+x[3] || 0, 0, W), y2: clamp(+x[4] || 0, 0, H) };
      if (x[5]) a.w = clamp(+x[5], W_MIN, W_MAX);
      return a;
    });
    return { name: String(o.name || '未命名').slice(0, 20), note: String(o.note || '').slice(0, 300), arrows, showCloud: o.cloud !== 0, time };
  }

  // 一节课的状态：每组最后一次提交、最后一次评分。事件按 id 去重，可重复喂入
  function createClassState() {
    const seen = new Set();
    const events = [];
    const works = new Map(), scores = new Map();
    function add(ev) {
      if (!ev || seen.has(ev.id)) return false;
      const o = ev.data;
      if (!o || o.app !== APP || typeof o.name !== 'string' || !o.name.trim()) return false;
      seen.add(ev.id);
      events.push(ev);
      if (o.type === 'work') {
        const prev = works.get(o.name);
        if (prev && prev.time > ev.time) return true;
        const w = workFromWire(o, ev.time);
        w.versions = (prev ? prev.versions : 0) + 1;
        works.set(w.name, w);
      } else if (o.type === 'score') {
        const prev = scores.get(o.name);
        if (!prev || prev.time <= ev.time) scores.set(o.name, { scores: o.scores || {}, total: +o.total || 0, remark: String(o.remark || ''), time: ev.time });
      }
      return true;
    }
    return { add, works, scores, events };
  }

  // 实时接收：一条长连接（SSE），断线后从最后一条消息接着收
  function subscribe(code, onEvent, onStatus) {
    let es = null, lastId = 'all', closed = false, retry = null;
    function open() {
      es = new EventSource(`${RELAY}${CHANNEL}${code}/sse?since=${lastId}`);
      es.onopen = () => onStatus(true);
      es.onmessage = m => {
        let msg;
        try { msg = JSON.parse(m.data); } catch (e) { return; }
        if (msg.event !== 'message') return;
        lastId = msg.id;
        let data = null;
        try { data = JSON.parse(msg.message); } catch (e) {}
        onEvent({ id: msg.id, time: msg.time * 1000, data });
      };
      es.onerror = () => {
        onStatus(false);
        es.close();
        if (!closed) { clearTimeout(retry); retry = setTimeout(open, 3000); }
      };
    }
    open();
    return () => { closed = true; clearTimeout(retry); es && es.close(); };
  }

  const DEFAULT_RUBRIC = [
    { name: '要素完整', max: 4, hint: '6 种辐射过程是否齐全、没有多余' },
    { name: '方向正确', max: 3, hint: '箭头起点、终点和方向是否符合辐射路径' },
    { name: '粗细合理', max: 3, hint: '箭头粗细是否反映能量多少（如大气逆辐射小于地面辐射）' },
  ];

  window.GeoScene = {
    NS, W, H, LIB, CFG, W_MIN, W_MAX, SW, LW,
    el, clamp, aw, drawBase, drawArrowShape, labelSide, placeLabel, buildStaticSvg, exportPng, fmtTime,
    newCode, validCode, readCode, submitWork, submitScore, createClassState, subscribe, DEFAULT_RUBRIC,
  };
})();
