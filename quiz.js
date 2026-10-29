// ===== 화면: 단어·문장 퀴즈 · 오답노트 · 즐겨찾기 · 학습 기록 =====
Object.assign(App, {
  quizSetup() {
    const srcs = [['단어 전체 (' + D.W.length + ')', () => D.W]];
    cats(D.W).forEach(c => srcs.push(['단어 · ' + c + ' (' + inCat(D.W, c).length + ')', () => inCat(D.W, c)]));
    srcs.push(['회화 전체 (' + D.P.length + ')', () => D.P]);
    cats(D.P).forEach(c => srcs.push(['회화 · ' + c, () => inCat(D.P, c)]));
    srcs.push(['⭐ 즐겨찾기', () => Store.favorites()]);
    render(`<h1>📝 단어·문장 퀴즈</h1>
      <div class="lbl">문제 범위</div><select id="src">${opts(srcs.map(s => s[0]), 0)}</select>
      <div class="lbl">문제 방향</div><select id="dir">${opts(['일본어 보고 → 뜻 고르기', '뜻 보고 → 일본어 고르기'], 0)}</select>
      <div style="height:8px"></div>${btn('go', '▶ 시작', 'primary')}${btn('miss', '🔥 오답 단어·문장만 다시 풀기')}${btn('home', '← 홈')}`, {
      go: () => { const s = srcs[+document.getElementById('src').value]; App.startQuiz(s[1](), s[0], document.getElementById('dir').value === '1', false); },
      miss: () => App.startQuiz(Store.missedItems(), '오답 다시 풀기', false, true),
      home: App.home,
    });
  },

  startQuiz(pool, title, rev, missMode) {
    if (!pool.length) return toast('문제가 없어요');
    App.q = { pool, title, rev, missMode }; App.score = [0, 0]; App.question();
  },

  question() {
    const Q = App.q;
    if (Q.missMode) Q.pool = Store.missedItems();
    if (!Q.pool.length) return render(`<h1>🎉 오답 끝!</h1><div class="card">틀린 문제를 모두 맞혔어요.</div>${btn('home', '← 홈')}`, { home: App.home });
    const q = pick(Q.pool);
    const src = q.type === 'p' ? D.P : q.type === 'w' ? D.W : D.ALL;
    const same = inCat(src, q.cat), from = same.length >= 6 ? same : src;
    const o = [q];
    for (let g = 0; o.length < 4 && g < 300; g++) { const x = pick(from); if (!o.some(y => y.ko === x.ko || y.kana === x.kana)) o.push(x); }
    const os = shuffle(o);
    render(`<h1>${esc(Q.title)}</h1><div class="sub">정답 ${App.score[0]} / ${App.score[1]}${Q.missMode ? ' · 남은 오답 ' + Q.pool.length : ''}</div>
      <div class="card tap" data-a="say">${Q.rev ? `<div class="jp s">${esc(q.ko)}</div>` :
        `<div class="jp ${q.type === 'p' ? 's' : ''}">${esc(q.disp)}</div>${q.disp !== q.kana ? `<div class="kana">${esc(q.kana)}</div>` : ''}`}</div>
      ${os.map((x, i) => btn('o', esc(Q.rev ? label(x) : x.ko), '', i)).join('')}${btn('back', '← 퀴즈 설정')}`, {
      say: () => !Q.rev && Voice.jp(q.kana),
      o: v => {
        const ok = os[v] === q; App.score[1]++; Store.answer(ok); Voice.jp(q.kana);
        if (ok) { App.score[0]++; Store.reduceMiss(q.key); toast('정답! ⭕'); App.question(); return; }
        Store.addMiss(q.key);
        modal(`<b>❌ 틀렸어요</b><div class="jp s" style="margin-top:8px">${esc(label(q))}</div><div class="pron">${esc(q.pron)}</div><div class="ko">= ${esc(q.ko)}</div>`, App.question);
      },
      back: App.quizSetup,
    });
    if (!Q.rev) Voice.jp(q.kana);
  },

  review() {
    const m = Store.misses(), items = Store.missedItems();
    const kana = Object.keys(m).filter(k => k.startsWith('k|')).sort((a, b) => m[b] - m[a]);
    if (!items.length && !kana.length) return render(`<h1>🔥 오답노트</h1><div class="card">아직 틀린 문제가 없어요. 퀴즈부터 풀어보세요!</div>${btn('home', '← 홈')}`, { home: App.home });
    render(`<h1>🔥 오답노트</h1>
      ${items.length ? btn('re', '📝 틀린 단어·문장 다시 풀기 (' + items.length + ')', 'primary') + btn('ls', '🎧 틀린 것만 반복 듣기') + btn('cd', '카드로 복습') : ''}
      ${kana.length ? `<div class="lbl">자주 틀린 문자</div><div class="card" style="font-size:20px">${kana.map(k => esc(k.slice(2)) + ' ' + m[k] + '회').join(' &nbsp; ')}</div>` : ''}
      ${items.length ? '<div class="lbl">자주 틀린 단어·문장</div>' + items.map((it, i) => `<div class="card tap" data-a="say" data-v="${i}"><div class="jp s">${esc(label(it))}</div><div class="ko">${esc(it.ko)} · 오답 ${m[it.key]}회</div></div>`).join('') : ''}
      ${btn('clear', '오답노트 비우기')}${btn('home', '← 홈')}`, {
      re: () => App.startQuiz(items, '오답 다시 풀기', false, true),
      ls: () => App.listenStart({ src: 'miss', cat: null, order: 0, repeat: 1, shuffle: false }),
      cd: () => App.cards(items, '🔥 오답 카드', 0),
      say: v => Voice.jp(items[v].kana),
      clear: () => { if (confirm('오답 기록을 모두 지울까요?')) { Store.set('miss', {}); App.review(); } },
      home: App.home,
    });
  },

  favorites() {
    const f = Store.favorites();
    if (!f.length) return render(`<h1>⭐ 즐겨찾기</h1><div class="card">아직 저장한 게 없어요.<br>카드 화면에서 ☆ 즐겨찾기를 눌러 저장하세요.</div>${btn('home', '← 홈')}`, { home: App.home });
    render(`<h1>⭐ 즐겨찾기</h1>${btn('cd', '카드로 공부하기 (' + f.length + ')', 'primary')}${btn('qz', '📝 즐겨찾기 퀴즈')}
      ${f.map((it, i) => `<div class="card tap" data-a="say" data-v="${i}"><div class="jp s">${esc(label(it))}</div><div class="ko">${esc(it.ko)}</div>
        <div class="row">${btn('del', '삭제', '', i)}</div></div>`).join('')}${btn('home', '← 홈')}`, {
      cd: () => App.cards(f, '⭐ 즐겨찾기', 0),
      qz: () => App.startQuiz(f, '⭐ 즐겨찾기 퀴즈', false, false),
      say: v => Voice.jp(f[v].kana),
      del: v => { Store.toggleFav(f[v].key); toast('삭제했어요'); App.favorites(); },
      home: App.home,
    });
  },

  stats() {
    const t = Store.total(), mins = s => s >= 3600 ? Math.floor(s / 3600) + '시간 ' + Math.floor(s % 3600 / 60) + '분' : Math.floor(s / 60) + '분';
    const names = ['오늘', '어제', '2일 전', '3일 전', '4일 전', '5일 전', '6일 전'];
    render(`<h1>📊 학습 기록</h1><div class="card">
        <div class="stat">🔥 연속 공부 <b>${Store.streak()}일</b></div>
        <div class="stat">푼 문제 ${t.q}개 · 정답률 ${t.q ? Math.round(t.c * 100 / t.q) : 0}%</div>
        <div class="stat">앱 공부 ${mins(t.study)} · 듣기 ${mins(t.listen)}</div>
        <div class="sub">즐겨찾기 ${Store.get('fav', []).length}개 · 오답노트 ${Store.missedItems().length}개</div></div>
      <div class="lbl">최근 7일</div>
      ${names.map((nm, i) => { const d = Store.dayStats(i); return `<div class="card" style="padding:10px 14px;font-size:15px;${d.q + d.study + d.listen ? '' : 'color:var(--sub)'}">${nm} · ${d.q}문제${d.q ? ' (정답 ' + Math.round(d.c * 100 / d.q) + '%)' : ''} · 공부 ${Math.floor(d.study / 60)}분 · 듣기 ${Math.floor(d.listen / 60)}분</div>`; }).join('')}
      ${btn('home', '← 홈')}`, { home: App.home });
  },
});
