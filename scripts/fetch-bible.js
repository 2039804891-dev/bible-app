// 圣经数据拉取脚本 — 从 bolls.life 拉取全66卷和合本正文
const fs = require("fs");
const path = require("path");

// 书籍元数据（与 bible-data.js 同步）
const BIBLE_BOOKS = [
  { id: "genesis", name: "创世记", chapters: 50, apiId: 1 },
  { id: "exodus", name: "出埃及记", chapters: 40, apiId: 2 },
  { id: "leviticus", name: "利未记", chapters: 27, apiId: 3 },
  { id: "numbers", name: "民数记", chapters: 36, apiId: 4 },
  { id: "deuteronomy", name: "申命记", chapters: 34, apiId: 5 },
  { id: "joshua", name: "约书亚记", chapters: 24, apiId: 6 },
  { id: "judges", name: "士师记", chapters: 21, apiId: 7 },
  { id: "ruth", name: "路得记", chapters: 4, apiId: 8 },
  { id: "1samuel", name: "撒母耳记上", chapters: 31, apiId: 9 },
  { id: "2samuel", name: "撒母耳记下", chapters: 24, apiId: 10 },
  { id: "1kings", name: "列王纪上", chapters: 22, apiId: 11 },
  { id: "2kings", name: "列王纪下", chapters: 25, apiId: 12 },
  { id: "1chronicles", name: "历代志上", chapters: 29, apiId: 13 },
  { id: "2chronicles", name: "历代志下", chapters: 36, apiId: 14 },
  { id: "ezra", name: "以斯拉记", chapters: 10, apiId: 15 },
  { id: "nehemiah", name: "尼希米记", chapters: 13, apiId: 16 },
  { id: "esther", name: "以斯帖记", chapters: 10, apiId: 17 },
  { id: "job", name: "约伯记", chapters: 42, apiId: 18 },
  { id: "psalms", name: "诗篇", chapters: 150, apiId: 19 },
  { id: "proverbs", name: "箴言", chapters: 31, apiId: 20 },
  { id: "ecclesiastes", name: "传道书", chapters: 12, apiId: 21 },
  { id: "songofsongs", name: "雅歌", chapters: 8, apiId: 22 },
  { id: "isaiah", name: "以赛亚书", chapters: 66, apiId: 23 },
  { id: "jeremiah", name: "耶利米书", chapters: 52, apiId: 24 },
  { id: "lamentations", name: "耶利米哀歌", chapters: 5, apiId: 25 },
  { id: "ezekiel", name: "以西结书", chapters: 48, apiId: 26 },
  { id: "daniel", name: "但以理书", chapters: 12, apiId: 27 },
  { id: "hosea", name: "何西阿书", chapters: 14, apiId: 28 },
  { id: "joel", name: "约珥书", chapters: 3, apiId: 29 },
  { id: "amos", name: "阿摩司书", chapters: 9, apiId: 30 },
  { id: "obadiah", name: "俄巴底亚书", chapters: 1, apiId: 31 },
  { id: "jonah", name: "约拿书", chapters: 4, apiId: 32 },
  { id: "micah", name: "弥迦书", chapters: 7, apiId: 33 },
  { id: "nahum", name: "那鸿书", chapters: 3, apiId: 34 },
  { id: "habakkuk", name: "哈巴谷书", chapters: 3, apiId: 35 },
  { id: "zephaniah", name: "西番雅书", chapters: 3, apiId: 36 },
  { id: "haggai", name: "哈该书", chapters: 2, apiId: 37 },
  { id: "zechariah", name: "撒迦利亚书", chapters: 14, apiId: 38 },
  { id: "malachi", name: "玛拉基书", chapters: 4, apiId: 39 },
  { id: "matthew", name: "马太福音", chapters: 28, apiId: 40 },
  { id: "mark", name: "马可福音", chapters: 16, apiId: 41 },
  { id: "luke", name: "路加福音", chapters: 24, apiId: 42 },
  { id: "john", name: "约翰福音", chapters: 21, apiId: 43 },
  { id: "acts", name: "使徒行传", chapters: 28, apiId: 44 },
  { id: "romans", name: "罗马书", chapters: 16, apiId: 45 },
  { id: "1corinthians", name: "哥林多前书", chapters: 16, apiId: 46 },
  { id: "2corinthians", name: "哥林多后书", chapters: 13, apiId: 47 },
  { id: "galatians", name: "加拉太书", chapters: 6, apiId: 48 },
  { id: "ephesians", name: "以弗所书", chapters: 6, apiId: 49 },
  { id: "philippians", name: "腓立比书", chapters: 4, apiId: 50 },
  { id: "colossians", name: "歌罗西书", chapters: 4, apiId: 51 },
  { id: "1thessalonians", name: "帖撒罗尼迦前书", chapters: 5, apiId: 52 },
  { id: "2thessalonians", name: "帖撒罗尼迦后书", chapters: 3, apiId: 53 },
  { id: "1timothy", name: "提摩太前书", chapters: 6, apiId: 54 },
  { id: "2timothy", name: "提摩太后书", chapters: 4, apiId: 55 },
  { id: "titus", name: "提多书", chapters: 3, apiId: 56 },
  { id: "philemon", name: "腓利门书", chapters: 1, apiId: 57 },
  { id: "hebrews", name: "希伯来书", chapters: 13, apiId: 58 },
  { id: "james", name: "雅各书", chapters: 5, apiId: 59 },
  { id: "1peter", name: "彼得前书", chapters: 5, apiId: 60 },
  { id: "2peter", name: "彼得后书", chapters: 3, apiId: 61 },
  { id: "1john", name: "约翰一书", chapters: 5, apiId: 62 },
  { id: "2john", name: "约翰二书", chapters: 1, apiId: 63 },
  { id: "3john", name: "约翰三书", chapters: 1, apiId: 64 },
  { id: "jude", name: "犹大书", chapters: 1, apiId: 65 },
  { id: "revelation", name: "启示录", chapters: 22, apiId: 66 },
];

const DATA_DIR = path.join(__dirname, "..", "data");
const CONCURRENCY = 5;
const DELAY_MS = 200;

function stripTags(text) {
  return text.replace(/<[^>]+>/g, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchChapter(apiId, chapter) {
  const url = `https://bolls.life/get-text/CUNPS/${apiId}/${chapter}/`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} for ${url}`);
  }
  const verses = await resp.json();
  return verses.map((v) => ({
    verse: v.verse,
    text: stripTags(v.text),
  }));
}

async function fetchBook(book) {
  const chapters = {};
  let totalVerses = 0;

  const tasks = [];
  for (let ch = 1; ch <= book.chapters; ch++) {
    tasks.push({ chapter: ch, apiId: book.apiId });
  }

  const results = [];
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (t) => {
        try {
          const verses = await fetchChapter(t.apiId, t.chapter);
          return { chapter: t.chapter, verses, ok: true };
        } catch (err) {
          console.error(`  ✗ 第${t.chapter}章失败: ${err.message}`);
          return { chapter: t.chapter, verses: [], ok: false };
        }
      })
    );
    results.push(...batchResults);
    if (i + CONCURRENCY < tasks.length) {
      await sleep(DELAY_MS);
    }
  }

  for (const r of results) {
    if (r.ok) {
      chapters[String(r.chapter)] = r.verses;
      totalVerses += r.verses.length;
    }
  }

  const outPath = path.join(DATA_DIR, `${book.id}.json`);
  const data = {
    bookId: book.id,
    bookName: book.name,
    chapters,
  };
  fs.writeFileSync(outPath, JSON.stringify(data), "utf-8");
  return { book: book.name, chapters: Object.keys(chapters).length, verses: totalVerses };
}

async function main() {
  console.log("开始拉取全66卷圣经数据...\n");

  const start = Date.now();
  let totalChapters = 0;
  let totalVerses = 0;

  for (let i = 0; i < BIBLE_BOOKS.length; i++) {
    const book = BIBLE_BOOKS[i];
    process.stdout.write(`[${i + 1}/66] ${book.name} (${book.chapters}章)... `);
    try {
      const result = await fetchBook(book);
      console.log(`✓ ${result.chapters}章 ${result.verses}节`);
      totalChapters += result.chapters;
      totalVerses += result.verses;
    } catch (err) {
      console.log(`✗ 失败: ${err.message}`);
    }
    if (i < BIBLE_BOOKS.length - 1) {
      await sleep(300);
    }
  }

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  console.log(`\n完成！共 ${totalChapters} 章 ${totalVerses} 节，用时 ${elapsed} 分钟`);

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const totalSize = files.reduce((s, f) => s + fs.statSync(path.join(DATA_DIR, f)).size, 0);
  console.log(`数据文件: ${files.length} 个，总大小 ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error("脚本错误:", err);
  process.exit(1);
});