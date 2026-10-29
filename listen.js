// ===== 반복 듣기 모드 =====
const KINDS = [['단어', 'words'], ['회화', 'phrases'], ['헷갈리는 표현', 'confusing'], ['문법 예문', 'grammar'], ['⭐ 즐겨찾기', 'fav'], ['🔥 오답', 'miss'], ['전체 혼합', 'all']];
const ORDERS = ['일본어 → 한국어 → 일본어', '한국어 → 3초 대기 → 일본어', '일본어만 반복'];
const REPEATS = [1, 2, 3, 5];

function listFor(src, cat) {
  const base = { words: D.W, phrases: D.P, confusing: D.C, grammar: D.GE, all: D.ALL }[src];
  if (src === 'fav') return Store.favorites();
  if (src === 'miss') return Store.missedItems();
  return inCat(base, cat);
}

const L = { on: false, paused: false, items: [], order: [], at: 0, step: 0, rep: 0, cfg: null, lock: null, tick: 0, timer: null, gen: 0 };

Object.assign(App, {
  listenSetup() {
    const s = Store.get('listen', { kind: 0, cat: '', order: 0, repeat: 0, shuffle: false });
    render(`<h1>🎧 반복 듣기 모드</h1>
      <div class="sub">재생하는 동안 화면이 꺼지지 않게 유지돼요. 웹 버전은 화면을 끄거나 다른 앱으로 가면 소리가 멈춰요. 운전 중 화면 조작은 하지 마세요.</div>
      <div class="lbl">재생목록</div><select id="kind">${opts(KINDS.map(k => k[0]), s.kind)}</select>
      <div class="lbl">카테고리</div><select id="cat"></select>
      <div class="lbl">재생 방식</div><select id="order">${opts(ORDERS, s.order)}</select>
      <div class="lbl">일본어 속도</div><select id="speed">${opts(SPEED_NAMES, Voice.speedIndex())}</select>
      <div class="lbl">한 항목 반복 횟수</div><select id="repeat">${opts(REPEATS.map(n => n + '번'), s.repeat)}</select>
      <label class="chk"><input type="checkbox" id="shuffle" ${s.shuffle ? 'checked' : ''}> 무작위 순서로 재생</label>
      ${btn('go', '▶ 듣기 시작', 'primary')}${btn('home', '← 홈')}`, {
      go: () => {
        const v = id => document.getElementById(id);
        const kind = +v('kind').value, cat = v('cat').value;
        const cfg = { kind, cat, order: +v('order').value, repeat: +v('repeat').value, shuffle: v('shuffle').checked };
        Store.set('listen', cfg); Store.set('voice', +v('speed').value);
        App.listenStart({ src: KINDS[kind][1], cat: cat || null, order: cfg.order, repeat: REPEATS[cfg.repeat], shuffle: cfg.shuffle });
      },
      home: App.home,
    });
    const kindSel = document.getElementById('kind'), catSel = document.getElementById('cat');
    const fill = () => {
      const k = +kindSel.value, base = [D.W, D.P, D.C][k];
      catSel.innerHTML = '<option value="">전체</option>' + (base ? cats(base).map(c => `<option${c === s.cat && k === s.kind ? ' selected' : ''}>${esc(c)}</option>`).join('') : '');
      catSel.disabled = !base;
    };
    kindSel.onchange = fill; fill();
  },

  listenStart(cfg) {
    const items = listFor(cfg.src, cfg.cat);
    if (!items.length) return toast('재생할 항목이 없어요');
    App.listenStop(true);
    Object.assign(L, { on: true, paused: false, items, cfg, at: 0, step: 0, rep: 0, tick: Date.now(), gen: L.gen + 1 });
    L.order = cfg.shuffle ? shuffle(items.map((_, i) => i)) : items.map((_, i) => i);
    keepAwake();
    App.nowPlaying();
    play(L.gen);
  },

  nowPlaying() {
    if (!L.on) return App.listenSetup();
    const it = L.items[L.order[L.at]];
    render(`<h1>🎧 듣는 중</h1><div class="sub">${L.at + 1} / ${L.items.length}</div>
      <div class="card now"><div class="jp ${it.type === 'p' || it.disp.length > 8 ? 's' : ''}">${esc(it.disp)}</div>
        ${it.disp !== it.kana ? `<div class="kana">${esc(it.kana)}</div>` : ''}<div class="pron">[${esc(it.pron)}]</div><div class="ko">${esc(it.ko)}</div></div>
      <div class="row">${btn('prev', '⏮ 이전')}${btn('pause', L.paused ? '▶ 계속' : '⏸ 일시정지')}${btn('next', '다음 ⏭')}</div>
      <div class="row">${btn('fav', Store.isFav(it.key) ? '★ 저장됨' : '☆ 즐겨찾기')}</div>
      ${btn('stop', '■ 듣기 끝내기', 'primary')}`, {
      prev: () => jump(-1), next: () => jump(1),
      pause: () => { L.paused = !L.paused; speechSynthesis.cancel(); L.gen++; if (!L.paused) { L.step = 0; play(L.gen); } App.nowPlaying(); },
      fav: () => { toast(Store.toggleFav(it.key) ? '즐겨찾기에 저장' : '즐겨찾기 해제'); App.nowPlaying(); },
      stop: () => { App.listenStop(); App.listenSetup(); },
    });
  },

  listenStop(silent) {
    if (L.on) logListen();
    L.on = false; L.gen++; clearTimeout(L.timer);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (L.lock) { L.lock.release().catch(() => {}); L.lock = null; }
    if (!silent) toast('듣기를 끝냈어요');
  },
});

function logListen() { const now = Date.now(); if (!L.paused) Store.bump('listen', Math.round((now - L.tick) / 1000)); L.tick = now; }

function jump(d) {
  speechSynthesis.cancel(); L.gen++; clearTimeout(L.timer);
  L.at = (L.at + d + L.items.length) % L.items.length; L.step = 0; L.rep = 0; L.paused = false;
  App.nowPlaying(); play(L.gen);
}

// 화면 꺼짐 방지 (지원하는 브라우저만)
async function keepAwake() {
  try { if ('wakeLock' in navigator) L.lock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (!L.on) return;
  if (document.visibilityState === 'visible') {
    keepAwake(); L.tick = Date.now();
    if (!L.paused) { speechSynthesis.cancel(); L.gen++; L.step = 0; play(L.gen); }
  } else logListen();
});

function play(gen) {
  if (!L.on || L.paused || gen !== L.gen) return;
  const it = L.items[L.order[L.at]], o = L.cfg.order, rate = SPEEDS[Voice.speedIndex()];
  const steps = o === 2 ? 1 : 3;
  if (L.step === 0 && document.getElementById('app').querySelector('.now')) App.nowPlaying();
  if (o === 1 && L.step === 1) { L.step = 2; L.timer = setTimeout(() => play(gen), 3000); return; }
  const korean = o === 0 ? L.step === 1 : o === 1 ? L.step === 0 : false;
  const koRate = Math.min(0.95, Math.max(rate, 0.85));
  Voice.say(korean ? it.ko : it.kana, korean ? 'ko' : 'ja', korean ? koRate : rate, () => {
    if (gen !== L.gen) return;
    L.timer = setTimeout(() => {
      if (gen !== L.gen) return;
      L.step++;
      if (L.step >= steps) {
        L.step = 0; L.rep++;
        if (L.rep >= L.cfg.repeat) {
          L.rep = 0; L.at++; logListen();
          if (L.at >= L.items.length) { L.at = 0; if (L.cfg.shuffle) L.order = shuffle(L.order); }
        }
      }
      play(gen);
    }, 900);
  });
}
