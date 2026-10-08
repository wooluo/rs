"""Parse HowToLiveBetter book/*.md into site/data.js (Windows / Linux 通用)."""
import io, os, re, json

BOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    'src', 'HowToLiveBetter-main', 'book')

chapters = []
entries = []

for fn in sorted(os.listdir(BOOK)):
    if not fn.endswith('.md'):
        continue
    text = io.open(os.path.join(BOOK, fn), encoding='utf-8').read()

    hm = re.search(r'^# (\d+)\. (.+)$', text, re.M)
    ch_no, ch_title = int(hm.group(1)), hm.group(2).strip()

    # chapter intro: everything between the H1 and the first entry heading
    first_entry = re.search(r'^### ', text, re.M)
    intro = text[hm.end():first_entry.start()].strip() if first_entry else ''
    chapters.append({'id': ch_no, 'title': ch_title, 'file': fn[:-3], 'intro': intro})

    # split into entries; an entry = heading ... next heading (or EOF)
    parts = re.split(r'^### ', text, flags=re.M)[1:]
    for part in parts:
        lines = part.splitlines()
        tm = re.match(r'(\d+)\. (.+)', lines[0].strip())
        if not tm:
            continue
        no, title = int(tm.group(1)), tm.group(2).strip()
        body = '\n'.join(lines[1:])

        tagm = re.search(r'<!--\s*成本标签:(.*?)-->', body)
        tags = dict(re.findall(r'(\S+?)=(\S+)', tagm.group(1))) if tagm else {}

        fields = {}
        for fm in re.finditer(r'^- (\S+?)：(.+?)(?=^- |\Z)', body, re.M | re.S):
            fields[fm.group(1)] = fm.group(2).strip()

        ev = fields.get('证据等级', '')
        ev_base = re.match(r'[ABC]', ev).group(0) if re.match(r'[ABC]', ev) else ev

        entries.append({
            'id': f'{ch_no}-{no}',
            'ch': ch_no,
            'no': no,
            'title': title,
            'money': tags.get('钱', ''),
            'time': tags.get('时间', ''),
            'will': tags.get('毅力', ''),
            'gain': tags.get('收益', ''),
            'cal': tags.get('口径', ''),
            'ev': ev_base,
            'evNote': ev if ev != ev_base else '',
            'cost': fields.get('成本', ''),
            'plain': fields.get('说人话', ''),
            'benefit': fields.get('收益', ''),
            'source': fields.get('来源', ''),
            'note': fields.get('备注', ''),
        })

# sanity check：条号唯一、字段齐全（条目总数随上游增删可变）
ids = [e['id'] for e in entries]
assert len(set(ids)) == len(ids), '条目 id 重复'
for e in entries:
    for f in ('cost', 'plain', 'benefit', 'source', 'note', 'title'):
        assert e[f], (e['id'], f)

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site')
os.makedirs(SITE, exist_ok=True)
with io.open(os.path.join(SITE, 'data.js'), 'w', encoding='utf-8') as f:
    f.write('// 数据来源：eternity4719/HowToLiveBetter（CC BY 4.0），由 build_data.py 生成\n')
    f.write('const GUIDE = ')
    json.dump({'chapters': chapters, 'entries': entries}, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

print(f'chapters={len(chapters)} entries={len(entries)}')
ch0 = chapters[0]
en0 = entries[0]
print('chapter1:', ch0['title'], '| intro chars:', len(ch0['intro']))
print('entry1-1:', en0['title'], en0['money'], en0['time'], en0['will'], en0['gain'], en0['cal'], en0['ev'])
