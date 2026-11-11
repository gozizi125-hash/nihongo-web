// ===== ⏱️ 읽기 챌린지 (릴스 스타일) =====
const CAT_EMOJI = { '숫자': '🔢', '시간·날짜': '🕒', '요일·달·계절': '📅', '가족·사람': '👪', '몸': '🧍', '음식': '🍱', '음료': '🥤', '과일·채소': '🍎',
  '맛·요리': '🍳', '장소·건물': '🏢', '교통·여행': '🚃', '집·생활용품': '🏠', '옷·패션': '👕', '날씨·자연': '🌤️', '동물': '🐾', '색깔': '🎨',
  '학교·공부': '📚', '직장·일': '💼', '쇼핑·돈': '🛍️', '취미·운동': '⚽', '동사(기본)': '🏃', '동사(생활)': '🧺', 'い형용사': '✨', 'な형용사': '💫',
  '부사': '➡️', '의문사·지시어': '❓', '접속사·기타': '🔗', '위치·방향': '🧭', '인사·기본': '👋', '자기소개': '🙋', '식당·카페': '🍽️', '쇼핑': '🛒',
  '길 묻기': '🗺️', '교통·이동': '🚕', '호텔·숙소': '🏨', '공항·여행': '✈️', '병원·약국': '🏥', '일상 대화': '💬', '감정·반응': '😊', '날씨·시간': '⛅' };
const picsOf = it => ((D.pics || {})[it.kana + '|' + it.disp] || (D.catpics || {})[it.cat] || (D.catpics || {})._default || '').split(',').filter(Boolean);
// 3D 그림 (1~2장), 그림이 없으면 이모지 글자
const picHtml = (it, px) => { const f = picsOf(it); const s = f.length > 1 ? Math.round(px * .75) : px;
  return f.length ? f.map(n => `<img src="pics/${n}.webp" width="${s}" height="${s}" alt="" onerror="this.replaceWith(document.createTextNode('${emojiOf(it)}'))">`).join('') : emojiOf(it); };
const emojiOf = it => (D.emoji || {})[it.kana + '|' + it.disp] || CAT_EMOJI[it.cat] || '🇯🇵';

// 가나 → 로마자 (a-tsu-i)
const ROMA = {};
['basic', 'dakuten', 'yoon'].forEach(t => D.kana[t].forEach(k => { ROMA[k[1]] = k[0]; ROMA[k[2]] = k[0]; }));
Object.assign(ROMA, { 'を': 'o', 'ヲ': 'o', 'ぢ': 'ji', 'ヂ': 'ji', 'づ': 'zu', 'ヅ': 'zu', 'ヴ': 'vu' });
function romaji(kana) {
  const SV = 'ぁぃぅぇぉァィゥェォ', VW = 'aiueoaiueo', SY = 'ゃゅょャュョ', YV = 'auoauo';
  const syl = []; let out = '', soku = false;
  const flush = () => { if (syl.length) { out += (out && !out.endsWith(' ') ? ' ' : '') + syl.join('-'); syl.length = 0; } };
  for (let i = 0; i < kana.length; i++) {
    const c = kana[i], two = kana.substr(i, 2);
    if (c === 'っ' || c === 'ッ') { soku = true; continue; }
    if (c === 'ー') { if (syl.length) { const p = syl[syl.length - 1]; syl[syl.length - 1] = p + p[p.length - 1]; } continue; }
    let r = null;
    if (two.length === 2 && ROMA[two]) { r = ROMA[two]; i++; }
    else if (ROMA[c]) {
      r = ROMA[c]; const nx = kana[i + 1] || '';
      if (nx && SV.includes(nx)) {
        const head = r === 'u' ? 'w' : r === 'chi' ? 'ch' : r === 'shi' ? 'sh' : r === 'ji' ? 'j' : r === 'tsu' ? 'ts' : r.slice(0, -1);
        r = head + VW[SV.indexOf(nx)]; i++;
      } else if (nx && SY.includes(nx) && r.endsWith('i')) { r = r.slice(0, -1) + 'y' + YV[SY.indexOf(nx)]; i++; }
    }
    if (r == null) { flush(); if (c === '、') out += ', '; else if (c === '？' || c === '?') out += '?'; else if (!'。！!'.includes(c)) out += c; continue; }
    if (r === 'n' && syl.length) { syl[syl.length - 1] += 'n'; continue; }
    if (soku) { const d = r.startsWith('ch') ? 't' : r[0]; if (syl.length) syl[syl.length - 1] += d; else r = d + r; soku = false; }
    syl.push(r);
  }
  flush();
  out = out.trim();
  if (/(にちは|ばんは)$/.test(kana) && out.endsWith('-ha')) out = out.slice(0, -2) + 'wa';
  return out;
}

const CH = { pool: [], missed: [], at: 0, ok: 0, ng: 0, mode: 0, sec: 3, auto: false, gen: 0 };
const VIEW_MODES = ['히라가나로 보기', '한자로 보기 (있으면)', '뜻 보고 → 일본어 떠올리기'];
const CH_SECS = [2, 3, 5, 7], CH_COUNTS = [10, 20, 50, 0];

Object.assign(App, {
  challengeSetup() {
    const s = Store.get('challenge', { src: 0, mode: 0, sec: 1, cnt: 1, auto: false });
    const srcs = [['단어 전체 (' + D.W.length + ')', () => D.W]];
    cats(D.W).forEach(c => srcs.push(['단어 · ' + c + ' (' + inCat(D.W, c).length + ')', () => inCat(D.W, c)]));
    srcs.push(['회화 전체 (' + D.P.length + ')', () => D.P], ['⭐ 즐겨찾기', () => Store.favorites()], ['🔥 오답', () => Store.missedItems()]);
    render(`<h1>⏱️ 읽기 챌린지</h1><div class="sub">글자가 나오면 카운트다운 동안 읽어보세요. 시간이 끝나면 읽는 법·뜻·그림이 나와요.</div>
      <div class="lbl">범위</div><select id="src">${opts(srcs.map(x => x[0]), Math.min(s.src, srcs.length - 1))}</select>
      <div class="lbl">보기 방식</div><select id="mode">${opts(VIEW_MODES, s.mode)}</select>
      <div class="lbl">생각할 시간</div><select id="sec">${opts(CH_SECS.map(n => n + '초'), s.sec)}</select>
      <div class="lbl">문제 수</div><select id="cnt">${opts(['10문제', '20문제', '50문제', '전부'], s.cnt)}</select>
      <label class="chk"><input type="checkbox" id="auto" ${s.auto ? 'checked' : ''}> 릴스처럼 자동으로 넘기기</label>
      ${btn('go', '▶ 챌린지 시작', 'primary')}${btn('home', '← 홈')}`, {
      go: () => {
        const v = id => document.getElementById(id);
        const cfg = { src: +v('src').value, mode: +v('mode').value, sec: +v('sec').value, cnt: +v('cnt').value, auto: v('auto').checked };
        Store.set('challenge', cfg);
        App.challengeStart(srcs[cfg.src][1](), cfg.mode, CH_SECS[cfg.sec], CH_COUNTS[cfg.cnt], cfg.auto);
      },
      home: App.home,
    });
  },

  challengeStart(list, mode, sec, count, auto) {
    if (!list.length) return toast('문제가 없어요');
    let l = shuffle(list); if (count && l.length > count) l = l.slice(0, count);
    Object.assign(CH, { pool: l, missed: [], at: 0, ok: 0, ng: 0, mode, sec, auto });
    App.challengeQ();
  },

  challengeQ() {
    if (CH.at >= CH.pool.length) return App.challengeResult();
    const it = CH.pool[CH.at], gen = ++CH.gen;
    const q = CH.mode === 2 ? it.ko : CH.mode === 1 ? it.disp : it.kana;
    render(`<h1>⏱️ 읽기 챌린지</h1><div class="stage">${chHead()}
        ${CH.mode === 2 ? `<div class="ch-emoji">${picHtml(it, 120)}</div>` : ''}
        <div class="ch-word" style="font-size:${chSize(q, CH.mode === 2)}px">${esc(q)}</div>
        <div class="ch-circle" id="cd">${CH.sec}</div></div>
      ${btn('show', '👀 바로 정답 보기')}${btn('stop', '■ 그만하기')}`, {
      show: () => App.challengeReveal(it), stop: () => App.challengeResult(),
    });
    let left = CH.sec;
    const tick = () => {
      if (gen !== CH.gen) return;
      if (left <= 0) return App.challengeReveal(it);
      const el = document.getElementById('cd'); if (el) el.textContent = left;
      left--; setTimeout(tick, 1000);
    };
    tick();
  },

  challengeReveal(it) {
    const gen = ++CH.gen;
    const main = CH.mode === 2 ? it.disp : CH.mode === 1 ? it.disp : it.kana;
    const sub = it.disp === it.kana ? '' : (CH.mode === 0 ? it.disp : it.kana);
    render(`<h1>⏱️ 읽기 챌린지</h1><div class="stage tap" data-a="say">${chHead()}
        <div class="ch-word" style="font-size:${chSize(main)}px">${esc(main)}</div>
        ${sub ? `<div class="kana center">${esc(sub)}</div>` : ''}
        ${it.type !== 'p' ? `<div class="ch-roma">(${esc(romaji(it.kana))})</div>` : ''}
        <div class="pron center">[${esc(it.pron)}]</div>
        <div class="ch-ko">${esc(it.ko)}</div>
        <div class="ch-pic">${picHtml(it, 130)}</div></div>
      <div class="row big2">${btn('no', '❌ 몰랐어')}${btn('yes', '⭕ 알았어')}</div>
      <div class="row">${btn('say', '🔊 다시 듣기')}${btn('fav', Store.isFav(it.key) ? '★ 저장됨' : '☆ 즐겨찾기')}</div>
      ${btn('stop', '■ 그만하기')}
      ${CH.auto ? '<div class="sub">자동으로 넘어가요 · 몰랐으면 ❌를 눌러 오답노트에 저장</div>' : ''}`, {
      say: () => Voice.jp(it.kana),
      no: () => App.challengeNext(it, false), yes: () => App.challengeNext(it, true),
      fav: (v, el) => { const on = Store.toggleFav(it.key); el.textContent = on ? '★ 저장됨' : '☆ 즐겨찾기'; toast(on ? '즐겨찾기에 저장' : '즐겨찾기 해제'); },
      stop: () => App.challengeResult(),
    });
    Voice.jp(it.kana);
    if (CH.auto) setTimeout(() => { if (gen === CH.gen) { CH.at++; App.challengeQ(); } }, 2500 + it.kana.length * 250);
  },

  challengeNext(it, knew) {
    Store.answer(knew);
    if (knew) { CH.ok++; Store.reduceMiss(it.key); } else { CH.ng++; CH.missed.push(it); Store.addMiss(it.key); }
    CH.at++; App.challengeQ();
  },

  challengeResult() {
    CH.gen++;
    const done = CH.ok + CH.ng, missed = CH.missed.slice();
    render(`<h1>🏁 챌린지 결과</h1><div class="stage"><div class="ch-word" style="font-size:34px">⭕ ${CH.ok} &nbsp; ❌ ${CH.ng}</div>
        ${done ? `<div class="sub center">알았던 비율 ${Math.round(CH.ok * 100 / done)}%</div>` : ''}</div>
      ${missed.length ? btn('again', '❌ 몰랐던 ' + missed.length + '개만 다시', 'primary') + '<div class="lbl">몰랐던 단어 (오답노트에도 저장됐어요)</div>' +
        missed.map((it, i) => `<div class="card tap" data-a="say" data-v="${i}"><div class="jp s">${emojiOf(it)} ${esc(label(it))}</div><div class="ko">${esc(it.ko)} [${esc(it.pron)}]</div></div>`).join('') : ''}
      ${btn('new', '🔁 새로 시작')}${btn('home', '← 홈')}`, {
      again: () => App.challengeStart(missed, CH.mode, CH.sec, 0, CH.auto),
      say: v => Voice.jp(missed[v].kana), new: () => App.challengeSetup(), home: App.home,
    });
  },
});

function chHead() {
  return `<div class="ch-title">JLPT N5 Reading Challenge</div><div class="sub center">${CH.at + 1} / ${CH.pool.length} · ⭕ ${CH.ok} ❌ ${CH.ng}</div>`;
}
function chSize(s, korean) { const n = s.length, px = n <= 3 ? 72 : n <= 5 ? 58 : n <= 8 ? 44 : n <= 14 ? 32 : 24; return korean ? Math.min(36, px) : px; }
