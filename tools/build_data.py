"""Android 프로젝트의 TSV/Kana.java를 웹앱용 data.js로 변환"""
import json, re, sys, os
A = sys.argv[1]  # NihongoDrive 경로
OUT = sys.argv[2]
assets = os.path.join(A, 'app/src/main/assets')
def rows(n):
    with open(os.path.join(assets, n), encoding='utf-8') as f:
        return [l.rstrip('\n').split('\t') for l in f if l.strip()]
words = [c[:5] for n in ['words_a.tsv', 'words_b.tsv', 'words_c.tsv'] for c in rows(n)]
phrases = [c[:5] for c in rows('phrases.tsv')]
confusing = [c[:6] for c in rows('confusing.tsv')]
grammar = []
for c in rows('grammar.tsv'):
    if c[0] == 'T': grammar.append({'n': int(c[1]), 't': c[2], 'x': c[3], 'e': []})
    elif c[0] == 'E': grammar[-1]['e'].append(c[2:6])
src = open(os.path.join(A, 'app/src/main/java/com/example/nihongodrive/Kana.java'), encoding='utf-8').read()
kana = {}
for name in ['BASIC', 'DAKUTEN', 'YOON']:
    body = re.search(name + r' = \{(.*?)\n  \};', src, re.S).group(1)
    kana[name.lower()] = re.findall(r'\{"([^"]*)","([^"]*)","([^"]*)"\}', body)
data = {'words': words, 'phrases': phrases, 'confusing': confusing, 'grammar': grammar, 'kana': kana}
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('window.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(words), len(phrases), len(confusing), len(grammar), {k: len(v) for k, v in kana.items()})
