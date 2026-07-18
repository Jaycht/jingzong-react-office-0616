import json, shutil, os

ROOT = 'public/laws'

# 1) 复制两份逐字抽取文本到公安专项分类
shutil.copy('.import_tmp/公安机关办理刑事案件程序规定.txt', f'{ROOT}/公安专项/')
shutil.copy('.import_tmp/公安机关办理行政案件程序规定.txt', f'{ROOT}/公安专项/')

# 2) 追加 manifest 条目
mp = f'{ROOT}/manifest.json'
d = json.load(open(mp, encoding='utf-8'))

new_laws = [
    {
        "id": "公安专项/公安机关办理刑事案件程序规定",
        "title": "公安机关办理刑事案件程序规定",
        "category": "公安专项",
        "categoryName": "公安专项法律",
        "file": "公安专项/公安机关办理刑事案件程序规定.txt",
        "source": "公安部（制定机关：公安部）",
        "sourceUrl": "",
        "version": "公安部令第127号发布，第159号（2020年）修正",
        "effectiveDate": "2020-09-01",
        "articles": 388,
        "timeline": [
            {"date": "2012-12-13", "label": "公安部令第127号发布"},
            {"date": "2020-07-20", "label": "公安部令第159号修正"}
        ]
    },
    {
        "id": "公安专项/公安机关办理行政案件程序规定",
        "title": "公安机关办理行政案件程序规定",
        "category": "公安专项",
        "categoryName": "公安专项法律",
        "file": "公安专项/公安机关办理行政案件程序规定.txt",
        "source": "公安部（制定机关：公安部）",
        "sourceUrl": "",
        "version": "公安部令第125号发布，第132/149/160号修正（最新：第160号，2020年）",
        "effectiveDate": "2020-08-06",
        "articles": 266,
        "timeline": [
            {"date": "2012-12-19", "label": "公安部令第125号发布"},
            {"date": "2020-08-06", "label": "公安部令第160号第三次修正"}
        ]
    }
]

d['laws'].extend(new_laws)
d['totalLaws'] = len(d['laws'])
# 重算所有分类计数
for c in d['categories']:
    c['count'] = sum(1 for l in d['laws'] if l['category'] == c['id'])

json.dump(d, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# 3) 校验
assert d['totalLaws'] == len(d['laws']), 'totalLaws 不一致'
assert sum(c['count'] for c in d['categories']) == len(d['laws']), '分类计数之和不一致'
print('OK  totalLaws =', d['totalLaws'], '  分类计数和 =', sum(c['count'] for c in d['categories']))
print('公安专项 count =', [c['count'] for c in d['categories'] if c['id'] == '公安专项'][0])
