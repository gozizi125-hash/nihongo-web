// ===== 공통: 데이터 · 저장 · 음성 · 화면 도구 =====
const D = window.DATA;
const mk = (type, c) => ({ type, cat: c[0], kana: c[1], disp: c[2], ko: c[3], pron: c[4], note: c[5] || '', key: type + '|' + c[1] + '|' + c[2] });
D.W = D.words.map(c => mk('w', c));
D.P = D.phrases.map(c => mk('p', c));
D.C = D.confusing.map(c => mk('c', c));
D.G = D.grammar.map(t => ({ n: t.n, title: t.t, expl: t.x, ex: t.e.map(e => mk('g', [t.t].concat(e))) }));
D.GE = [].concat(...D.G.map(t => t.ex));
D.ALL = [].concat(D.W, D.P, D.C, D.GE);
const label = it => it.disp === it.kana ? it.kana : it.disp + ' (' + it.kana + ')';
const cats = list => [...new Set(list.map(i => i.cat))];
const inCat = (list, c) => c ? list.filter(i => i.cat === c) : list.slice();
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ----- 저장 (localStorage, 실패해도 앱은 동작) -----
const Store = {
  get(k, d) { try { const v = localStorage.getItem('nd_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('nd_' + k, JSON.stringify(v)); } catch (e) {} },
  isFav(key) { return this.get('fav', []).includes(key); },
  toggleFav(key) { const f = this.get('fav', []); const i = f.indexOf(key); if (i >= 0) f.splice(i, 1); else f.push(key); this.set('fav', f); return i < 0; },
  favorites() { const f = new Set(this.get('fav', [])); return D.ALL.filter(i => f.has(i.key)); },
  addMiss(key) { const m = this.get('miss', {}); m[key] = (m[key] || 0) + 1; this.set('miss', m); },
  reduceMiss(key) { const m = this.get('miss', {}); if (!m[key]) return; if (m[key] <= 1) delete m[key]; else m[key]--; this.set('miss', m); },
  misses() { return this.get('miss', {}); },
  missedItems() { const m = this.misses(); return D.ALL.filter(i => m[i.key]).sort((a, b) => m[b.key] - m[a.key]); },
  day(off) { const d = new Date(Date.now() - off * 864e5); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); },
  bump(field, n) { const s = this.get('stats', {}); const d = this.day(0); s[d] = s[d] || { q: 0, c: 0, study: 0, listen: 0 }; s[d][field] += n; this.set('stats', s); },
  answer(ok) { this.bump('q', 1); if (ok) this.bump('c', 1); },
  dayStats(off) { return this.get('stats', {})[this.day(off)] || { q: 0, c: 0, study: 0, listen: 0 }; },
  total() { const t = { q: 0, c: 0, study: 0, listen: 0 }; Object.values(this.get('stats', {})).forEach(d => { for (const k in t) t[k] += d[k] || 0; }); return t; },
  streak() { let n = 0; for (let i = 0; i < 3650; i++) { const d = this.dayStats(i); if (d.q > 0 || d.study >= 60 || d.listen >= 60) n++; else if (i > 0) break; } return n; },
};

// 공부 시간: 화면이 보이는 동안 30초마다 기록
setInterval(() => { if (document.visibilityState === 'visible') Store.bump('study', 30); }, 30000);

// ----- 음성 -----
const SPEEDS = [0.5, 0.65, 0.8, 1.0, 1.2];
const SPEED_NAMES = ['아주 천천히', '천천히', '조금 천천히', '보통', '빠르게'];
const Voice = {
  ja: null, ko: null,
  pick() {
    const vs = speechSynthesis.getVoices();
    const best = lang => vs.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang))
      .sort((a, b) => (b.localService - a.localService) || (/enhanced|premium|neural/i.test(b.name) - /enhanced|premium|neural/i.test(a.name)))[0] || null;
    this.ja = best('ja'); this.ko = best('ko');
  },
  speedIndex() { return Math.max(0, Math.min(SPEEDS.length - 1, Store.get('voice', 1))); },
  // 한 문장 읽기. 끝나면 done() 호출
  say(text, lang, rate, done) {
    if (!('speechSynthesis' in window)) { toast('이 브라우저는 음성을 지원하지 않아요'); if (done) done(); return; }
    if (!this.ja) this.pick();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ko' ? 'ko-KR' : 'ja-JP';
    const v = lang === 'ko' ? this.ko : this.ja; if (v) u.voice = v;
    u.rate = rate; u.pitch = 1;
    let fired = false; const fin = () => { if (!fired) { fired = true; if (done) done(); } };
    u.onend = fin; u.onerror = fin;
    // 일부 브라우저에서 onend가 안 오는 경우 대비
    setTimeout(fin, Math.max(4000, text.length * 450 / rate));
    speechSynthesis.speak(u);
  },
  jp(text) { speechSynthesis.cancel(); this.say(text, 'ja', SPEEDS[this.speedIndex()]); },
};
if ('speechSynthesis' in window) { Voice.pick(); speechSynthesis.onvoiceschanged = () => Voice.pick(); }

// ----- 화면 도구 -----
const $app = document.getElementById('app');
let toastTimer;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1600); }
function modal(html, onOk) {
  const m = document.getElementById('modal'); document.getElementById('modal-body').innerHTML = html; m.hidden = false;
  document.getElementById('modal-ok').onclick = () => { m.hidden = true; if (onOk) onOk(); };
}
// 화면을 그리고, data-a="이름" 버튼에 동작 연결
function render(html, actions) {
  $app.innerHTML = html; window.scrollTo(0, 0);
  $app.querySelectorAll('[data-a]').forEach(el => {
    const f = actions[el.dataset.a]; if (f) el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); f(el.dataset.v, el); });
  });
}
const btn = (a, text, cls, v) => `<button class="btn ${cls || ''}" data-a="${a}"${v != null ? ` data-v="${esc(v)}"` : ''}>${text}</button>`;
const opts = (list, sel) => list.map((t, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(t)}</option>`).join('');
