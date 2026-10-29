// ===== 화면: 홈 · 문자 · 카드 · 헷갈리는 표현 · 문법 =====
const App = {
  home() {
    const t = Store.dayStats(0), st = Store.streak();
    render(`<h1>🇯🇵 일본어 드라이브</h1>
      <div class="sub">오늘 ${t.q}문제 · 공부 ${Math.floor(t.study / 60)}분 · 듣기 ${Math.floor(t.listen / 60)}분${st ? ' &nbsp;🔥 ' + st + '일 연속' : ''}</div>
      ${btn('listen', '🎧 반복 듣기 모드', 'primary')}
      ${btn('speed', '🐢 음성 속도: ' + SPEED_NAMES[Voice.speedIndex()] + ' (눌러서 변경)')}
      ${btn('kana', '✍️ 문자 학습 (히라가나·가타카나)')}
      ${btn('words', '📖 단어 공부 (' + D.W.length + ')')}
      ${btn('phrases', '🗣️ 회화 공부 (' + D.P.length + ')')}
      ${btn('grammar', '📚 문법 공부 (' + D.G.length + ')')}
      ${btn('confusing', '🔀 헷갈리는 표현 (' + cats(D.C).length + ')')}
      ${btn('quiz', '📝 단어·문장 퀴즈')}
      ${btn('review', '🔥 오답노트')}
      ${btn('fav', '⭐ 즐겨찾기')}
      ${btn('stats', '📊 학습 기록')}
      <div class="sub">※ 홈 화면에 추가하면 앱처럼 쓸 수 있어요 (아이폰: 사파리 공유 → 홈 화면에 추가)</div>`, {
      listen: () => App.listenSetup(),
      speed: () => { Store.set('voice', (Voice.speedIndex() + 1) % SPEEDS.length); App.home(); Voice.jp('こんにちは。にほんごを べんきょうしましょう。'); },
      kana: () => App.kanaSetup(),
      words: () => App.catList(D.W, '📖 단어 공부'),
      phrases: () => App.catList(D.P, '🗣️ 회화 공부'),
      grammar: () => App.grammarList(),
      confusing: () => App.confusingList(),
      quiz: () => App.quizSetup(),
      review: () => App.review(),
      fav: () => App.favorites(),
      stats: () => App.stats(),
    });
  },

  // ---------- 문자 ----------
  kanaSetup() {
    const s = Store.get('kanaSet', 0), sc = Store.get('kanaScript', 0);
    render(`<h1>✍️ 문자 학습</h1>
      <div class="lbl">문자 범위</div><select id="set">${opts(['기본 46자', '탁음·반탁음 (が·ぱ)', '요음 (きゃ·しゅ)', '전체'], s)}</select>
      <div class="lbl">문자 종류</div><select id="script">${opts(['히라가나', '가타카나', '혼합'], sc)}</select>
      <div style="height:8px"></div>
      ${btn('a', '로마자 → 문자 4지선다', 'primary')}${btn('b', '문자 → 로마자 4지선다')}
      ${btn('c', '로마자 → 문자 직접 입력')}${btn('d', '🖐 손글씨 따라 쓰기')}${btn('e', '📋 문자표 보기')}${btn('home', '← 홈')}`, {
      a: () => { prep(); App.score = [0, 0]; App.kanaChoice(false); },
      b: () => { prep(); App.score = [0, 0]; App.kanaChoice(true); },
      c: () => { prep(); App.score = [0, 0]; App.kanaInput(); },
      d: () => { prep(); App.handwriting(0); },
      e: () => { prep(); App.kanaChart(); },
      home: App.home,
    });
    function prep() {
      const set = +document.getElementById('set').value, scr = +document.getElementById('script').value;
      Store.set('kanaSet', set); Store.set('kanaScript', scr);
      const tables = [];
      if (set === 0 || set === 3) tables.push(D.kana.basic);
      if (set === 1 || set === 3) tables.push(D.kana.dakuten);
      if (set === 2 || set === 3) tables.push(D.kana.yoon);
      App.pool = [];
      tables.forEach(t => t.forEach(k => { if (scr !== 1) App.pool.push([k[0], k[1]]); if (scr !== 0) App.pool.push([k[0], k[2]]); }));
    }
  },

  kanaChart() {
    render(`<h1>📋 문자표</h1><div class="grid">${App.pool.map((k, i) => `<div data-a="say" data-v="${i}">${k[1]}<small>${k[0]}</small></div>`).join('')}</div>
      <div class="sub">글자를 누르면 소리가 나와요</div>${btn('back', '← 문자 학습')}`,
      { say: v => Voice.jp(App.pool[v][1]), back: App.kanaSetup });
  },

  gradeKana(q, ok, next) {
    App.score[1]++; Store.answer(ok); Voice.jp(q[1]);
    if (ok) { App.score[0]++; Store.reduceMiss('k|' + q[1]); toast('정답! ⭕'); next(); return; }
    Store.addMiss('k|' + q[1]);
    modal(`<b>❌ 틀렸어요</b><div class="huge">${q[1]}</div><div class="center">${q[0]}</div>`, next);
  },

  kanaChoice(rev) {
    const q = pick(App.pool), o = [rev ? q[0] : q[1]];
    for (let g = 0; o.length < 4 && g < 200; g++) { const x = pick(App.pool), s = rev ? x[0] : x[1]; if (!o.includes(s)) o.push(s); }
    const os = shuffle(o);
    render(`<h1>문자 퀴즈</h1><div class="sub">정답 ${App.score[0]} / ${App.score[1]}</div>
      <div class="huge" data-a="say">${rev ? q[1] : q[0]}</div>
      <div class="big"><div class="row">${btn('o', os[0], '', 0)}${btn('o', os[1], '', 1)}</div><div class="row">${btn('o', os[2] || '', '', 2)}${btn('o', os[3] || '', '', 3)}</div></div>
      ${btn('back', '← 문자 학습')}`, {
      say: () => rev && Voice.jp(q[1]),
      o: v => os[v] && App.gradeKana(q, os[v] === (rev ? q[0] : q[1]), () => App.kanaChoice(rev)),
      back: App.kanaSetup,
    });
  },

  kanaInput() {
    const q = pick(App.pool);
    render(`<h1>직접 입력 시험</h1><div class="sub">정답 ${App.score[0]} / ${App.score[1]}</div>
      <div class="huge">${q[0]}</div><input type="text" id="ans" placeholder="일본어 키보드로 입력" autocomplete="off">
      <div style="height:8px"></div>${btn('ok', '채점하기', 'primary')}
      <div class="sub">※ 키보드 설정에서 일본어 자판을 추가해야 해요</div>${btn('back', '← 문자 학습')}`, {
      ok: () => { const a = document.getElementById('ans').value.trim(); if (!a) return toast('답을 입력하세요'); App.gradeKana(q, a === q[1], App.kanaInput); },
      back: App.kanaSetup,
    });
  },

  handwriting(idx) {
    const n = App.pool.length, i = ((idx % n) + n) % n, q = App.pool[i];
    let guide = true;
    render(`<h1>🖐 손글씨 따라 쓰기</h1><div class="sub">${i + 1} / ${n} · ${q[0]} (${q[1]})</div>
      <canvas id="cv" width="600" height="600"></canvas>
      <div class="row">${btn('clr', '지우기')}${btn('g', '가이드 숨기기')}${btn('say', '🔊')}</div>
      <div class="row">${btn('prev', '◀ 이전')}${btn('rnd', '무작위')}${btn('next', '다음 ▶')}</div>
      <div class="sub">연한 글자를 따라 쓴 다음, '가이드 숨기기'로 혼자 써보세요.</div>${btn('back', '← 문자 학습')}`, {
      clr: () => draw(true), g: (v, el) => { guide = !guide; el.textContent = guide ? '가이드 숨기기' : '가이드 보이기'; draw(true); },
      say: () => Voice.jp(q[1]), prev: () => App.handwriting(i - 1), next: () => App.handwriting(i + 1),
      rnd: () => App.handwriting(Math.floor(Math.random() * n)), back: App.kanaSetup,
    });
    const cv = document.getElementById('cv'), cx = cv.getContext('2d');
    function draw(clear) {
      if (!clear) return;
      cx.clearRect(0, 0, 600, 600);
      cx.strokeStyle = '#ebeef4'; cx.lineWidth = 3; cx.setLineDash([18, 14]);
      cx.beginPath(); cx.moveTo(300, 0); cx.lineTo(300, 600); cx.moveTo(0, 300); cx.lineTo(600, 300); cx.stroke(); cx.setLineDash([]);
      if (guide) { cx.fillStyle = '#dce2ec'; cx.font = (q[1].length > 1 ? 260 : 440) + 'px "Hiragino Sans","Noto Sans JP",sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(q[1], 300, 320); }
      cx.strokeStyle = '#141e3c'; cx.lineWidth = 22; cx.lineCap = 'round'; cx.lineJoin = 'round';
    }
    draw(true);
    let down = false;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 600 / r.height]; };
    cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); cx.beginPath(); cx.moveTo(x, y); });
    cv.addEventListener('pointermove', e => { if (!down) return; const [x, y] = pt(e); cx.lineTo(x, y); cx.stroke(); });
    cv.addEventListener('pointerup', () => { down = false; });
  },

  // ---------- 카드 ----------
  catList(list, title) {
    const cs = cats(list);
    render(`<h1>${title}</h1>${btn('all', '전체 (' + list.length + ')')}
      ${cs.map((c, i) => btn('c', esc(c) + ' (' + inCat(list, c).length + ')', '', i)).join('')}${btn('home', '← 홈')}`, {
      all: () => App.cards(list, title + ' · 전체', 0), c: v => App.cards(inCat(list, cs[v]), cs[v], 0), home: App.home,
    });
  },

  cards(data, title, start) {
    if (!data.length) return toast('항목이 없어요');
    const n = data.length, pos = ((start % n) + n) % n, it = data[pos], hide = Store.get('hide', false), fav = Store.isFav(it.key);
    const small = it.type === 'p' || it.disp.length > 8;
    render(`<h1>${esc(title)}</h1><div class="sub">${pos + 1} / ${n}</div>
      <div class="card tap" data-a="reveal">
        <div class="jp ${small ? 's' : ''}">${esc(it.disp)}</div>${it.disp !== it.kana ? `<div class="kana">${esc(it.kana)}</div>` : ''}
        <div class="m ${hide ? 'hidden' : ''}"><div class="pron">[${esc(it.pron)}]</div><div class="ko">${esc(it.ko)}</div>
        ${it.note ? `<div class="note">💡 ${esc(it.note)}</div>` : ''}</div></div>
      <div class="row">${btn('say', '🔊 듣기')}${btn('fav', fav ? '★ 저장됨' : '☆ 즐겨찾기')}${btn('hide', hide ? '뜻 보이기' : '뜻 가리기')}</div>
      <div class="row">${btn('prev', '◀ 이전')}${btn('rnd', '무작위')}${btn('next', '다음 ▶')}</div>
      ${hide ? '<div class="sub">카드를 누르면 뜻이 보여요</div>' : ''}${btn('home', '← 홈')}`, {
      reveal: () => { $app.querySelector('.m').classList.remove('hidden'); Voice.jp(it.kana); },
      say: () => Voice.jp(it.kana),
      fav: () => { toast(Store.toggleFav(it.key) ? '즐겨찾기에 저장' : '즐겨찾기 해제'); App.cards(data, title, pos); },
      hide: () => { Store.set('hide', !hide); App.cards(data, title, pos); },
      prev: () => App.cards(data, title, pos - 1), next: () => App.cards(data, title, pos + 1),
      rnd: () => App.cards(data, title, Math.floor(Math.random() * n)), home: App.home,
    });
    Voice.jp(it.kana);
  },

  // ---------- 헷갈리는 표현 ----------
  confusingList() {
    const cs = cats(D.C);
    render(`<h1>🔀 헷갈리는 표현</h1>${cs.map((c, i) => btn('s', esc(c), '', i)).join('')}${btn('home', '← 홈')}`,
      { s: v => App.confusingSet(+v), home: App.home });
  },

  confusingSet(i) {
    const cs = cats(D.C), n = cs.length; i = ((i % n) + n) % n;
    const items = inCat(D.C, cs[i]);
    render(`<h1>${esc(cs[i])}</h1>${items.map((it, k) => `<div class="card tap" data-a="say" data-v="${k}">
        <div class="jp s">${esc(label(it))}</div><div class="ko">[${esc(it.pron)}] ${esc(it.ko)}</div>
        ${it.note ? `<div class="note">💡 ${esc(it.note)}</div>` : ''}</div>`).join('')}
      <div class="sub">카드를 누르면 발음을 들을 수 있어요</div>
      <div class="row">${btn('prev', '◀ 이전')}${btn('list', '목록')}${btn('next', '다음 ▶')}</div>`, {
      say: v => Voice.jp(items[v].kana), prev: () => App.confusingSet(i - 1), next: () => App.confusingSet(i + 1), list: App.confusingList,
    });
  },

  // ---------- 문법 ----------
  grammarList() {
    render(`<h1>📚 문법 공부</h1>${D.G.map((t, i) => btn('t', t.n + '. ' + esc(t.title), '', i)).join('')}${btn('home', '← 홈')}`,
      { t: v => App.grammarTopic(+v), home: App.home });
  },

  grammarTopic(i) {
    const n = D.G.length; i = ((i % n) + n) % n; const t = D.G[i];
    render(`<h1>${t.n}. ${esc(t.title)}</h1><div class="card note">${esc(t.expl)}</div><div class="lbl">예문 (누르면 발음 · ☆로 저장)</div>
      ${t.ex.map((it, k) => `<div class="card tap" data-a="say" data-v="${k}"><div class="jp s">${esc(it.disp)}</div>
        ${it.disp !== it.kana ? `<div class="kana">${esc(it.kana)}</div>` : ''}<div class="pron">[${esc(it.pron)}]</div><div class="ko">${esc(it.ko)}</div>
        <div class="row">${btn('fav', Store.isFav(it.key) ? '★ 저장됨' : '☆ 즐겨찾기', '', k)}</div></div>`).join('')}
      <div class="row">${btn('prev', '◀ 이전')}${btn('list', '목록')}${btn('next', '다음 ▶')}</div>`, {
      say: v => Voice.jp(t.ex[v].kana),
      fav: (v, el) => { const on = Store.toggleFav(t.ex[v].key); el.textContent = on ? '★ 저장됨' : '☆ 즐겨찾기'; toast(on ? '즐겨찾기에 저장' : '즐겨찾기 해제'); },
      prev: () => App.grammarTopic(i - 1), next: () => App.grammarTopic(i + 1), list: App.grammarList,
    });
  },
};
