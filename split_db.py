# -*- coding: utf-8 -*-
import json

nt_books = {"\u99ac\u592a\u798f\u97f3","\u99ac\u53ef\u798f\u97f3","\u8def\u52a0\u798f\u97f3","\u7d04\u7ff0\u798f\u97f3","\u4f7f\u5f92\u884c\u50b3","\u7f85\u99ac\u66f8","\u54e5\u6797\u591a\u524d\u66f8","\u54e5\u6797\u591a\u5f8c\u66f8","\u52a0\u62c9\u592a\u66f8","\u4ee5\u5f17\u6240\u66f8","\u8153\u7acb\u6bd4\u66f8","\u6b4c\u7f85\u897f\u66f8","\u5e16\u6492\u7f85\u5c3c\u8fe6\u524d\u66f8","\u5e16\u6492\u7f85\u5c3c\u8fe6\u5f8c\u66f8","\u63d0\u6469\u592a\u524d\u66f8","\u63d0\u6469\u592a\u5f8c\u66f8","\u63d0\u591a\u66f8","\u8153\u5229\u9580\u66f8","\u5e0c\u4f2f\u4f86\u66f8","\u96c5\u5404\u66f8","\u5f7c\u5f97\u524d\u66f8","\u5f7c\u5f97\u5f8c\u66f8","\u7d04\u7ff0\u4e00\u66f8","\u7d04\u7ff0\u4e8c\u66f8","\u7d04\u7ff0\u4e09\u66f8","\u7336\u5927\u66f8","\u555f\u793a\u9304"}

with open('external-verses.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

old_t = []
new_t = []
for v in data:
    book = v.get('book', '').strip()
    if book in nt_books:
        new_t.append(v)
    else:
        old_t.append(v)

with open('data/external-verses-old.json', 'w', encoding='utf-8') as f:
    json.dump(old_t, f, ensure_ascii=False, separators=(',', ':'))

with open('data/external-verses-new.json', 'w', encoding='utf-8') as f:
    json.dump(new_t, f, ensure_ascii=False, separators=(',', ':'))

print('Old:', len(old_t), 'New:', len(new_t))
