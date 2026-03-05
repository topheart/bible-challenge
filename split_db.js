const fs = require('fs');

const nt_books = new Set(["馬太福音","馬可福音","路加福音","約翰福音","使徒行傳","羅馬書","哥林多前書","哥林多後書","加拉太書","以弗所書","腓立比書","歌羅西書","帖撒羅尼迦前書","帖撒羅尼迦後書","提摩太前書","提摩太後書","提多書","腓利門書","希伯來書","雅各書","彼得前書","彼得後書","約翰一書","約翰二書","約翰三書","猶大書","啟示錄"]);

const data = JSON.parse(fs.readFileSync('external-verses.json', 'utf-8'));
const old_t = [];
const new_t = [];

data.forEach(v => {
    const book = v.book ? v.book.trim() : '';
    if (nt_books.has(book)) {
        new_t.push(v);
    } else {
        old_t.push(v);
    }
});

console.log('Old:', old_t.length, 'New:', new_t.length);

fs.writeFileSync('data/external-verses-old.json', JSON.stringify(old_t));
fs.writeFileSync('data/external-verses-new.json', JSON.stringify(new_t));

console.log('Done!');
