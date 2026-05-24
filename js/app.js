/* =========================================
   圣经APP - 主应用逻辑
   ========================================= */

// ===== 全局状态 =====
var state = {
  currentView: "books",
  selectedBook: null,
  selectedChapter: null,
  selectedVerses: [],
  verseElements: new Map(),
  history: [],
  apiKey: "",
  fontSize: 1,
  aiContextRef: "",
  touchStartX: 0,
  touchStartY: 0,
};

// ===== DOM 工具 =====
var $ = function(sel) { return document.querySelector(sel); };
var $$ = function(sel) { return document.querySelectorAll(sel); };

var dom = {
  topBar: $("#topBar"),
  topTitle: $("#topTitle"),
  topSubtitle: $("#topSubtitle"),
  btnBack: $("#btnBack"),
  btnSettings: $("#btnSettings"),
  btnSearch: $("#btnSearch"),
  viewBooks: $("#viewBooks"),
  viewChapters: $("#viewChapters"),
  viewReading: $("#viewReading"),
  viewAiChat: $("#viewAiChat"),
  viewSettings: $("#viewSettings"),
  booksContainer: $("#booksContainer"),
  chaptersContainer: $("#chaptersContainer"),
  readingHeader: $("#readingHeader"),
  chapterNavTop: $("#chapterNavTop"),
  chapterNavBottom: $("#chapterNavBottom"),
  versesContainer: $("#versesContainer"),
  continueReading: $("#continueReading"),
  selectionToolbar: $("#selectionToolbar"),
  selectionRef: $("#selectionRef"),
  btnAiExplainSelected: $("#btnAiExplainSelected"),
  btnAiExplainChapter: $("#btnAiExplainChapter"),
  btnAiCustomQuestion: $("#btnAiCustomQuestion"),
  btnClearSelection: $("#btnClearSelection"),
  aiChatArea: $("#aiChatArea"),
  aiInput: $("#aiInput"),
  btnAiSend: $("#btnAiSend"),
  inputApiKey: $("#inputApiKey"),
  btnSaveApiKey: $("#btnSaveApiKey"),
  apiKeyStatus: $("#apiKeyStatus"),
  bottomBar: $("#bottomBar"),
  bottomBooks: $("#bottomBooks"),
  bottomBookmarks: $("#bottomBookmarks"),
  bottomHome: $("#bottomHome"),
  mainContent: $(".main-content"),
  toast: $("#toast"),
  dailyVerse: $("#dailyVerse"),
  streakBanner: $("#streakBanner"),
  readingProgress: $("#readingProgress"),
  readingActionsRow: $("#readingActionsRow"),
  viewNotes: $("#viewNotes"),
  viewHistory: $("#viewHistory"),
  notesContainer: $("#notesContainer"),
  historyContainer: $("#historyContainer"),
  themeToggle: $("#themeToggle"),
  viewSearch: $("#viewSearch"),
  searchInput: $("#searchInput"),
  searchClear: $("#searchClear"),
  searchResults: $("#searchResults"),
  viewBookmarks: $("#viewBookmarks"),
  shareOverlay: $("#shareOverlay"),
  shareVerseText: $("#shareVerseText"),
  shareVerseRef: $("#shareVerseRef"),
  btnShareCopy: $("#btnShareCopy"),
  btnShareClose: $("#btnShareClose"),
  bottomHistory: $("#bottomHistory"),
};

// ===== 初始化 =====
function init() {
  loadSettings();
  applyFontSize();
  renderBooks();
  renderDailyVerse();
  renderStreakBanner();
  setupEventListeners();
}

function loadSettings() {
  state.apiKey = localStorage.getItem("bible_app_api_key") || "";
  state.fontSize = parseFloat(localStorage.getItem("bible_app_font_size")) || 1;
  if (state.apiKey && dom.inputApiKey) {
    dom.inputApiKey.value = state.apiKey;
    updateApiKeyStatus(true);
  }
}

function applyFontSize() {
  document.documentElement.style.setProperty("--font-scale", state.fontSize);
  $$(".btn-font-size").forEach(function(btn) {
    btn.classList.toggle("active", parseFloat(btn.dataset.size) === state.fontSize);
  });
}

// ===== 视图切换 =====
function showView(viewName, pushHistory) {
  if (pushHistory === undefined) { pushHistory = true; }
  if (viewName === state.currentView) { return; }

  if (pushHistory) {
    state.history.push({
      view: state.currentView,
      book: state.selectedBook,
      chapter: state.selectedChapter,
    });
  }

  state.currentView = viewName;

  dom.viewBooks.classList.toggle("active", viewName === "books");
  dom.viewChapters.classList.toggle("active", viewName === "chapters");
  dom.viewReading.classList.toggle("active", viewName === "reading");
  dom.viewAiChat.classList.toggle("active", viewName === "aiChat");
  dom.viewSettings.classList.toggle("active", viewName === "settings");
  dom.viewNotes.classList.toggle("active", viewName === "notes");
  dom.viewHistory.classList.toggle("active", viewName === "history");
  dom.viewBookmarks.classList.toggle("active", viewName === "bookmarks");
  dom.viewSearch.classList.toggle("active", viewName === "search");

  // Hide bottom bar on AI chat view
  dom.bottomBar.classList.toggle("hidden", viewName === "aiChat");
  dom.mainContent.classList.toggle("no-bottom", viewName === "aiChat");

  updateTopBar();

  var isContent = viewName === "books" || viewName === "chapters" || viewName === "reading";
  dom.bottomBooks.classList.toggle("active", isContent);
  dom.bottomHome.classList.toggle("active", viewName === "books");
}

function goBack() {
  if (state.history.length === 0) { return; }

  var prev = state.history.pop();
  state.currentView = prev.view;
  state.selectedBook = prev.book;
  state.selectedChapter = prev.chapter;

  dom.viewBooks.classList.toggle("active", prev.view === "books");
  dom.viewChapters.classList.toggle("active", prev.view === "chapters");
  dom.viewReading.classList.toggle("active", prev.view === "reading");
  dom.viewAiChat.classList.toggle("active", prev.view === "aiChat");
  dom.viewSettings.classList.toggle("active", prev.view === "settings");
  dom.viewNotes.classList.toggle("active", prev.view === "notes");
  dom.viewHistory.classList.toggle("active", prev.view === "history");
  dom.viewBookmarks.classList.toggle("active", prev.view === "bookmarks");
  dom.viewSearch.classList.toggle("active", prev.view === "search");

  dom.bottomBar.classList.toggle("hidden", prev.view === "aiChat");
  dom.mainContent.classList.toggle("no-bottom", prev.view === "aiChat");

  updateTopBar();

  var isContent = prev.view === "books" || prev.view === "chapters" || prev.view === "reading";
  dom.bottomBooks.classList.toggle("active", isContent);
  dom.bottomHome.classList.toggle("active", prev.view === "books");

  clearSelection();
}

function updateTopBar() {
  var v = state.currentView;
  if (v === "books") {
    dom.topTitle.textContent = "\u5723\u7ecf";
    dom.topSubtitle.textContent = "";
    dom.btnBack.style.visibility = "hidden";
  } else if (v === "chapters") {
    var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedBook; });
    dom.topTitle.textContent = book ? book.name : "";
    dom.topSubtitle.textContent = "\u9009\u62e9\u7ae0\u8282";
    dom.btnBack.style.visibility = "visible";
  } else if (v === "reading") {
    var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedBook; });
    dom.topTitle.textContent = book ? book.name : "";
    dom.topSubtitle.textContent = "\u7b2c " + state.selectedChapter + " \u7ae0";
    dom.btnBack.style.visibility = "visible";
  } else if (v === "aiChat") {
    dom.topTitle.textContent = "AI\u7267\u5e08\u8bb2\u89e3";
    dom.topSubtitle.textContent = state.aiContextRef || "";
    dom.btnBack.style.visibility = "visible";
  } else if (v === "notes") {
    dom.topTitle.textContent = "\u7b14\u8bb0";
    dom.topSubtitle.textContent = "";
    dom.btnBack.style.visibility = "visible";
  } else if (v === "history") {
    dom.topTitle.textContent = "\u8bfb\u7ecf\u5386\u53f2";
    dom.topSubtitle.textContent = "";
    dom.btnBack.style.visibility = "visible";
  } else if (v === "settings") {
    dom.topTitle.textContent = "\u8bbe\u7f6e";
    dom.topSubtitle.textContent = "";
    dom.btnBack.style.visibility = "visible";
  }
}

// ===== 书卷列表 =====
function renderBooks() {
  var ot = BIBLE_BOOKS.filter(function(b) { return b.testament === "\u65e7\u7ea6"; });
  var nt = BIBLE_BOOKS.filter(function(b) { return b.testament === "\u65b0\u7ea6"; });
  var html = "";

  // Continue reading card
  renderContinueReading();

  // Old Testament
  html += '<div class="testament-section">';
  html += '<div class="testament-title">\u65e7\u7ea6\u5168\u4e66\uff0839\u5377\uff09</div>';
  html += '<div class="book-list">';
  ot.forEach(function(book) {
    html += '<button class="book-btn" data-book="' + book.id + '">';
    html += '<span class="book-name">' + book.name + '</span>';
    html += '<span class="book-chapters">' + book.chapters + '\u7ae0</span>';
    html += '</button>';
  });
  html += '</div></div>';

  // New Testament
  html += '<div class="testament-section">';
  html += '<div class="testament-title">\u65b0\u7ea6\u5168\u4e66\uff0827\u5377\uff09</div>';
  html += '<div class="book-list">';
  nt.forEach(function(book) {
    html += '<button class="book-btn" data-book="' + book.id + '">';
    html += '<span class="book-name">' + book.name + '</span>';
    html += '<span class="book-chapters">' + book.chapters + '\u7ae0</span>';
    html += '</button>';
  });
  html += '</div></div>';

  dom.booksContainer.innerHTML = html;

  dom.booksContainer.querySelectorAll(".book-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      state.selectedBook = btn.dataset.book;
      renderChapters(state.selectedBook);
      showView("chapters");
    });
  });
}

function renderContinueReading() {
  var posData = localStorage.getItem("bible_reading_pos");
  if (!posData) {
    dom.continueReading.style.display = "none";
    dom.continueReading.innerHTML = "";
    return;
  }

  try {
    var pos = JSON.parse(posData);
    var book = BIBLE_BOOKS.find(function(b) { return b.id === pos.bookId; });
    if (!book) {
      dom.continueReading.style.display = "none";
      dom.continueReading.innerHTML = "";
      return;
    }

    dom.continueReading.style.display = "block";
    dom.continueReading.innerHTML =
      '<div class="continue-reading-card" id="continueCard">' +
      '<span class="continue-icon">\ud83d\udcd6</span>' +
      '<div class="continue-info">' +
      '<div class="continue-label">\u7ee7\u7eed\u9605\u8bfb</div>' +
      '<div class="continue-position">\u300a' + book.name + '\u300b\u7b2c ' + pos.chapter + ' \u7ae0</div>' +
      '</div>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--primary);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</div>';

    $("#continueCard").addEventListener("click", function() {
      state.selectedBook = pos.bookId;
      state.selectedChapter = pos.chapter;
      loadChapter(pos.bookId, pos.chapter);
      showView("reading");
    });
  } catch(e) {
    dom.continueReading.style.display = "none";
    dom.continueReading.innerHTML = "";
  }
}

// ===== 章节列表 =====
function renderChapters(bookId) {
  var book = BIBLE_BOOKS.find(function(b) { return b.id === bookId; });
  if (!book) { return; }
  var html = '<div class="chapter-grid">';
  for (var i = 1; i <= book.chapters; i++) {
    html += '<button class="chapter-btn" data-chapter="' + i + '">' + i + '</button>';
  }
  html += '</div>';
  dom.chaptersContainer.innerHTML = html;
  dom.chaptersContainer.querySelectorAll(".chapter-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      state.selectedChapter = parseInt(btn.dataset.chapter);
      loadChapter(state.selectedBook, state.selectedChapter);
      showView("reading");
    });
  });
}

// ===== 阅读位置记忆 =====
function saveReadingPosition(bookId, chapter) {
  localStorage.setItem("bible_reading_pos", JSON.stringify({
    bookId: bookId,
    chapter: chapter,
    time: Date.now()
  }));
}

// ===== Load chapter (local-first) =====
function loadChapter(bookId, chapter) {
  dom.readingHeader.innerHTML = "";
  dom.chapterNavTop.innerHTML = "";
  dom.chapterNavBottom.innerHTML = "";
  dom.versesContainer.innerHTML = '<div class="loading">正在加载经文</div>';
  clearSelection();

  var book = BIBLE_BOOKS.find(function(b) { return b.id === bookId; });
  if (!book) { return; }

  saveReadingPosition(bookId, chapter);
  saveReadingHistory(bookId, chapter);
  updateReadingStreak();
  renderStreakBanner();

  // Load from local data/ directory first, fall back to bolls.life API
  fetch('/data/' + bookId + '.json').then(function(resp) {
    if (!resp.ok) { throw new Error('LOCAL_NOT_FOUND'); }
    return resp.json();
  }).then(function(localData) {
    var chapterKey = String(chapter);
    var chapterVerses = localData.chapters[chapterKey];
    if (!chapterVerses || chapterVerses.length === 0) {
      throw new Error('LOCAL_CHAPTER_MISSING');
    }
    var data = {
      verses: chapterVerses.map(function(v) {
        return {
          book_id: book.apiId,
          book_name: book.name,
          chapter: chapter,
          verse: v.verse,
          text: v.text
        };
      }),
      text: chapterVerses.map(function(v) { return v.text; }).join(' ')
    };
    renderVerses(data, book);
    renderChapterNav(book, chapter);
  }).catch(function(localErr) {
    // Fallback: load from bolls.life API
    var url = 'https://bolls.life/get-text/CUNPS/' + book.apiId + '/' + chapter + '/';
    fetch(url).then(function(resp) {
      if (!resp.ok) { throw new Error('API request failed: ' + resp.status); }
      return resp.json();
    }).then(function(versesArray) {
      var data = {
        verses: versesArray.map(function(v) {
          return {
            book_id: book.apiId,
            book_name: book.name,
            chapter: chapter,
            verse: v.verse,
            text: stripTags(v.text)
          };
        }),
        text: versesArray.map(function(v) { return v.text; }).join(' ')
      };
      renderVerses(data, book);
      renderChapterNav(book, chapter);
    }).catch(function(apiErr) {
      dom.versesContainer.innerHTML = '<div class="error-msg">加载经文失败<br><small>' + apiErr.message + '</small><br><br><button class="btn-nav" onclick="loadChapter(\'' + bookId + '\',' + chapter + ')">重试</button></div>';
    });
  });
}

function renderVerses(data, book) {
  dom.readingHeader.innerHTML = '<h2>' + book.name + '</h2><div class="chapter-label">\u7b2c ' + state.selectedChapter + ' \u7ae0</div>';
  state.verseElements.clear();
  var html = "";
  data.verses.forEach(function(v) {
    html += '<div class="verse-block">';
    html += '<span class="verse-num">' + v.verse + '</span>';
    html += '<span class="verse-text" data-verse="' + v.verse + '" data-book="' + book.id + '" data-chapter="' + v.chapter + '">' + escapeHtml(v.text) + '</span>';
    html += '</div>';
  });
  dom.versesContainer.innerHTML = html;
  dom.versesContainer.querySelectorAll(".verse-text").forEach(function(el) {
    var key = "verse-" + el.dataset.verse;
    state.verseElements.set(key, el);
    el.addEventListener("click", function() {
      toggleVerseSelection(el);
    });
  });
}

function renderChapterNav(book, chapter) {
  var hasPrev = chapter > 1;
  var hasNext = chapter < book.chapters;
  var navHtml = '<div style="display:flex;align-items:center;gap:12px;justify-content:center">' +
    '<button class="btn-nav" onclick="navigateChapter(-1)"' + (hasPrev ? "" : " disabled") + '>\u25c0 \u4e0a\u4e00\u7ae0</button>' +
    '<span class="chapter-indicator">' + chapter + " / " + book.chapters + '</span>' +
    '<button class="btn-nav" onclick="navigateChapter(1)"' + (hasNext ? "" : " disabled") + '>\u4e0b\u4e00\u7ae0 \u25b6</button>' +
    '</div>';
  var aiBtnHtml = '<div style="text-align:center;padding:4px 0 0">' +
    '<button class="btn-ai-chapter" id="btnAiChapterPersistent" onclick="explainChapter()">' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
    " AI\u7267\u5e08\u8bb2\u89e3\u672c\u7ae0" +
    '</button></div>';
  dom.chapterNavTop.innerHTML = navHtml + aiBtnHtml;
  dom.chapterNavBottom.innerHTML = navHtml;
  // Update reading actions row
  dom.readingActionsRow.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:12px">' +
    '<button class="btn-action" onclick="shareSelectedVerses()" title="分享">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
    '</button>' +
    '<button class="btn-action" onclick="addNoteForVerse()" title="笔记">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
    '</button>' +
    '<button class="btn-action" id="btnBookmarkSelectedReading" onclick="bookmarkSelectedVerses()" title="收藏">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
    '</button></div>';
}

function navigateChapter(delta) {
  var newChapter = state.selectedChapter + delta;
  var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedBook; });
  if (!book || newChapter < 1 || newChapter > book.chapters) { return; }
  state.selectedChapter = newChapter;
  loadChapter(state.selectedBook, state.selectedChapter);
  updateTopBar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== 经文选择 =====
function toggleVerseSelection(el) {
  var verse = parseInt(el.dataset.verse);
  var book = el.dataset.book;
  var chapter = parseInt(el.dataset.chapter);
  var text = el.textContent.trim();
  var existingIdx = state.selectedVerses.findIndex(function(v) {
    return v.verse === verse && v.book === book && v.chapter === chapter;
  });
  if (existingIdx >= 0) {
    state.selectedVerses.splice(existingIdx, 1);
    el.classList.remove("selected");
  } else {
    state.selectedVerses.push({ book: book, chapter: chapter, verse: verse, text: text });
    state.selectedVerses.sort(function(a, b) { return a.verse - b.verse; });
    el.classList.add("selected");
  }
  state.verseElements.forEach(function(elem, key) {
    var v = parseInt(elem.dataset.verse);
    var isSelected = state.selectedVerses.some(function(sv) {
      return sv.verse === v && sv.book === book && sv.chapter === parseInt(elem.dataset.chapter);
    });
    elem.classList.toggle("selected", isSelected);
  });
  updateSelectionToolbar();
}

function clearSelection() {
  state.selectedVerses = [];
  state.verseElements.forEach(function(el) { el.classList.remove("selected"); });
  updateSelectionToolbar();
}

function updateSelectionToolbar() {
  if (state.selectedVerses.length === 0) {
    dom.selectionToolbar.classList.remove("visible");
    return;
  }
  dom.selectionToolbar.classList.add("visible");
  var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedVerses[0].book; });
  var bookName = book ? book.shortName : "";
  if (state.selectedVerses.length === 1) {
    dom.selectionRef.textContent = bookName + " " + state.selectedVerses[0].chapter + ":" + state.selectedVerses[0].verse;
  } else {
    var first = state.selectedVerses[0];
    var last = state.selectedVerses[state.selectedVerses.length - 1];
    dom.selectionRef.textContent = bookName + " " + first.chapter + ":" + first.verse + "-" + last.verse;
  }
}

// ===== AI 讲解 =====
var PASTOR_SYSTEM_PROMPT = "\u4f60\u662f\u4e00\u4f4d\u6148\u7965\u7684\u534e\u4eba\u6559\u4f1a\u8001\u7267\u5e08\uff0c\u5df2\u7ecf\u7267\u4f1a\u56db\u5341\u591a\u5e74\u4e86\u3002\u4f60\u7684\u8bb2\u9053\u98ce\u683c\u6e29\u548c\u4eb2\u5207\u3001\u6df1\u5165\u6d45\u51fa\uff0c\u50cf\u62c9\u5bb6\u5e38\u4e00\u6837\u5a13\u5a13\u9053\u6765\u3002\u4f60\u9762\u5bf9\u7684\u542c\u4f17\u4e3b\u8981\u662f\u4e2d\u8001\u5e74\u5f1f\u5144\u59ca\u59b9\uff0c\u6240\u4ee5\u4f60\u8bf4\u8bdd\u8981\u6ce8\u610f\uff1a1.\u7528\u5927\u767d\u8bdd\uff0c\u4e0d\u5806\u780c\u795e\u5b66\u672f\u8bed\u3002\u5982\u679c\u5fc5\u987b\u63d0\u5230\u4e13\u4e1a\u8bcd\uff0c\u5c31\u7528\u4e00\u4e24\u53e5\u8bdd\u7b80\u5355\u89e3\u91ca\u30022.\u8bed\u6c14\u50cf\u5bf9\u7740\u5bb6\u91cc\u4eba\u8bf4\u8bdd\uff0c\u6e29\u6696\u3001\u8010\u5fc3\u3001\u5e26\u7740\u7231\u5fc3\u30023.\u8bb2\u89e3\u7ed3\u6784\uff1a\u5148\u7b80\u5355\u8bf4\u8bf4\u8fd9\u6bb5\u7ecf\u6587\u7684\u80cc\u666f\uff08\u4ec0\u4e48\u60c5\u51b5\u4e0b\u5199\u7684\u3001\u5f53\u65f6\u53d1\u751f\u4e86\u4ec0\u4e48\uff09\uff0c\u518d\u9010\u53e5\u89e3\u91ca\u7ecf\u6587\u7684\u610f\u601d\uff0c\u6700\u540e\u8bf4\u8bf4\u8fd9\u5bf9\u6211\u4eec\u5e73\u5e38\u8fc7\u65e5\u5b50\u6709\u4ec0\u4e48\u542f\u53d1\u548c\u5b89\u6170\u30024.\u9002\u5f53\u5f15\u7528\u7ecf\u6587\u539f\u6587\uff0c\u8ba9\u542c\u4f17\u80fd\u5bf9\u7167\u7740\u770b\u30025.\u56de\u590d\u63a7\u5236\u5728500-700\u5b57\uff0c\u4e0d\u8981\u592a\u957f\uff0c\u8001\u4eba\u5bb6\u8bfb\u7740\u4e0d\u7d2f\u30026.\u7ed3\u675f\u65f6\u7528\u4e00\u53e5\u795d\u798f\u6216\u52c9\u52b1\u7684\u8bdd\u6536\u5c3e\uff0c\u8ba9\u4eba\u5fc3\u91cc\u5f97\u5b89\u6170\u3002";

function callDeepSeek(systemPrompt, userMessage) {
  return fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + state.apiKey,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  }).then(function(resp) {
    if (!resp.ok) {
      return resp.json().catch(function() { return {}; }).then(function(errData) {
        throw new Error(errData.error ? errData.error.message : "HTTP " + resp.status);
      });
    }
    return resp.json();
  }).then(function(data) {
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "\uff08\u672a\u6536\u5230\u56de\u590d\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\uff09";
  });
}

function openAiView(refText) {
  state.aiContextRef = refText;
  dom.aiChatArea.innerHTML = "";
  dom.aiInput.value = "";
  showView("aiChat");
}

function explainSelectedVerses() {
  if (!state.apiKey) {
    showToast("\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u914d\u7f6e DeepSeek API Key");
    showView("settings");
    return;
  }
  if (state.selectedVerses.length === 0) {
    showToast("\u8bf7\u5148\u5728\u7ecf\u6587\u4e2d\u70b9\u9009\u4f60\u8981\u8bb2\u89e3\u7684\u6bb5\u843d");
    return;
  }

  var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedVerses[0].book; });
  var bookName = book ? book.name : "";
  var refText, fullText;
  if (state.selectedVerses.length === 1) {
    refText = bookName + " " + state.selectedVerses[0].chapter + ":" + state.selectedVerses[0].verse;
    fullText = state.selectedVerses[0].text;
  } else {
    var first = state.selectedVerses[0];
    var last = state.selectedVerses[state.selectedVerses.length - 1];
    refText = bookName + " " + first.chapter + ":" + first.verse + "-" + last.verse;
    fullText = state.selectedVerses.map(function(v) { return v.verse + ". " + v.text; }).join("\n");
  }

  openAiView(refText);
  addAiMessage("user", "\u3010" + refText + "\u3011\n" + fullText);

  var loadingDiv = createLoadingMsg("\u7267\u5e08\u6b63\u5728\u9884\u5907\u8bb2\u89e3\uff0c\u8bf7\u7a0d\u7b49...");
  dom.aiChatArea.appendChild(loadingDiv);
  dom.aiChatArea.scrollTop = dom.aiChatArea.scrollHeight;

  var userPrompt = "\u8bf7\u4e3a\u4e0b\u9762\u7684\u7ecf\u6587\u505a\u4e2a\u8bb2\u89e3\uff0c\u50cf\u5728\u6559\u4f1a\u8bb2\u9053\u90a3\u6837\uff1a\n\n\u3010" + refText + "\u3011\n" + fullText;
  callDeepSeek(PASTOR_SYSTEM_PROMPT, userPrompt).then(function(reply) {
    loadingDiv.remove();
    addAiMessage("ai", reply);
  }).catch(function(err) {
    loadingDiv.remove();
    addAiMessage("ai", "\u{1f614} \u8bf7\u6c42\u5931\u8d25\uff1a" + err.message + "\n\n\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216API Key\u540e\u91cd\u8bd5\u3002");
  });
}

function explainChapter() {
  if (!state.apiKey) {
    showToast("\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u914d\u7f6e DeepSeek API Key");
    showView("settings");
    return;
  }
  if (!state.selectedBook || !state.selectedChapter) {
    showToast("\u8bf7\u5148\u6253\u5f00\u4f60\u8981\u8bb2\u89e3\u7684\u7ae0\u8282");
    return;
  }

  var verseEls = dom.versesContainer.querySelectorAll(".verse-text");
  if (verseEls.length === 0) {
    showToast("\u7ae0\u8282\u5c1a\u672a\u52a0\u8f7d\uff0c\u8bf7\u5148\u6253\u5f00\u4e00\u7ae0\u7ecf\u6587");
    return;
  }

  var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedBook; });
  var bookName = book ? book.name : "";
  var chapterNum = state.selectedChapter;
  var fullText = "";
  verseEls.forEach(function(el) {
    fullText += el.dataset.verse + ". " + el.textContent.trim() + "\n";
  });

  var refText = bookName + " \u7b2c" + chapterNum + "\u7ae0";

  openAiView(refText);
  addAiMessage("user", "\u3010" + refText + " \u5168\u7ae0\u8bb2\u89e3\u3011\n\uff08\u5171" + verseEls.length + "\u8282\u7ecf\u6587\uff09");

  var loadingDiv = createLoadingMsg("\u7267\u5e08\u6b63\u5728\u9884\u5907\u5168\u7ae0\u8bb2\u89e3\uff0c\u5185\u5bb9\u8f83\u591a\u8bf7\u7a0d\u7b49...");
  dom.aiChatArea.appendChild(loadingDiv);
  dom.aiChatArea.scrollTop = dom.aiChatArea.scrollHeight;

  var userPrompt = "\u8bf7\u4e3a\u4e0b\u9762\u8fd9\u4e00\u6574\u7ae0\u7ecf\u6587\u505a\u4e2a\u5b8c\u6574\u7684\u8bb2\u9053\u5f0f\u8bb2\u89e3\uff1a\n\n\u3010" + refText + "\u3011\n" + fullText + "\n\n\u8bf7\u5148\u6982\u62ec\u8fd9\u4e00\u7ae0\u7684\u4e3b\u9898\u548c\u80cc\u666f\uff0c\u7136\u540e\u5206\u6bb5\u8bb2\u89e3\u4e3b\u8981\u5185\u5bb9\uff0c\u6700\u540e\u603b\u7ed3\u5c5e\u7075\u6559\u8bad\u548c\u751f\u6d3b\u5e94\u7528\u3002";
  callDeepSeek(PASTOR_SYSTEM_PROMPT, userPrompt).then(function(reply) {
    loadingDiv.remove();
    addAiMessage("ai", reply);
  }).catch(function(err) {
    loadingDiv.remove();
    addAiMessage("ai", "\u{1f614} \u8bf7\u6c42\u5931\u8d25\uff1a" + err.message + "\n\n\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216API Key\u540e\u91cd\u8bd5\u3002");
  });
}

function openCustomQuestion() {
  if (!state.apiKey) {
    showToast("\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u914d\u7f6e DeepSeek API Key");
    showView("settings");
    return;
  }

  openAiView("\u81ea\u5b9a\u4e49\u63d0\u95ee");
  dom.aiInput.focus();

  if (state.selectedVerses.length > 0) {
    var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedVerses[0].book; });
    var bookName = book ? book.name : "";
    var refText;
    if (state.selectedVerses.length === 1) {
      refText = bookName + " " + state.selectedVerses[0].chapter + ":" + state.selectedVerses[0].verse;
    } else {
      var first = state.selectedVerses[0];
      var last = state.selectedVerses[state.selectedVerses.length - 1];
      refText = bookName + " " + first.chapter + ":" + first.verse + "-" + last.verse;
    }
    addAiMessage("ai", "\u4f60\u5df2\u9009\u4e2d\u3010" + refText + "\u3011\uff0c\u4f60\u53ef\u4ee5\u9488\u5bf9\u8fd9\u6bb5\u7ecf\u6587\u63d0\u95ee\uff0c\u4e5f\u53ef\u4ee5\u95ee\u4efb\u4f55\u5173\u4e8e\u4fe1\u4ef0\u7684\u95ee\u9898\u3002");
  }
}

function sendAiMessage() {
  var text = dom.aiInput.value.trim();
  if (!text) { return; }
  if (!state.apiKey) {
    showToast("\u8bf7\u5148\u914d\u7f6e API Key");
    return;
  }

  dom.aiInput.value = "";
  addAiMessage("user", text);

  var loadingDiv = createLoadingMsg("\u7267\u5e08\u6b63\u5728\u56de\u590d...");
  dom.aiChatArea.appendChild(loadingDiv);
  dom.aiChatArea.scrollTop = dom.aiChatArea.scrollHeight;

  callDeepSeek(PASTOR_SYSTEM_PROMPT, text).then(function(reply) {
    loadingDiv.remove();
    addAiMessage("ai", reply);
  }).catch(function(err) {
    loadingDiv.remove();
    addAiMessage("ai", "\u{1f614} \u8bf7\u6c42\u5931\u8d25\uff1a" + err.message);
  });
}

function createLoadingMsg(text) {
  var div = document.createElement("div");
  div.className = "ai-message ai";
  div.innerHTML = '<span class="loading" style="padding:0;font-size:0.9rem">' + text + '</span>';
  return div;
}

function addAiMessage(role, content) {
  var div = document.createElement("div");
  div.className = "ai-message " + role;
  div.innerHTML = content.replace(/\n/g, "<br>");
  dom.aiChatArea.appendChild(div);
  dom.aiChatArea.scrollTop = dom.aiChatArea.scrollHeight;
}

// ===== 设置 =====
function updateApiKeyStatus(saved) {
  if (saved) {
    dom.apiKeyStatus.textContent = "\u2705 API Key \u5df2\u914d\u7f6e";
    dom.apiKeyStatus.style.color = "#2E7D32";
  } else {
    dom.apiKeyStatus.textContent = "\u26a0 \u5c1a\u672a\u914d\u7f6e API Key\uff0cAI\u8bb2\u89e3\u529f\u80fd\u5c06\u4e0d\u53ef\u7528";
    dom.apiKeyStatus.style.color = "#E65100";
  }
}

function saveApiKey() {
  var key = dom.inputApiKey.value.trim();
  if (!key) {
    showToast("\u8bf7\u8f93\u5165 API Key");
    return;
  }
  if (key.indexOf("sk-") !== 0) {
    showToast("API Key \u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u5e94\u4ee5 sk- \u5f00\u5934");
    return;
  }
  state.apiKey = key;
  localStorage.setItem("bible_app_api_key", key);
  updateApiKeyStatus(true);
  showToast("API Key \u5df2\u4fdd\u5b58");
}

function setFontSize(scale) {
  state.fontSize = scale;
  localStorage.setItem("bible_app_font_size", scale);
  applyFontSize();
}

// ===== Toast =====
var toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  dom.toast.textContent = msg;
  dom.toast.classList.add("show");
  toastTimer = setTimeout(function() {
    dom.toast.classList.remove("show");
  }, 2000);
}

// ===== 工具函数 =====
function stripTags(text) {
  return text.replace(/<[^>]+>/g, "");
}

// ===== 主题切换 =====
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'light';
  var next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('bible_theme', next);
}

function loadTheme() {
  var saved = localStorage.getItem('bible_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== 全文搜索 =====
function performSearch(query) {
  if (!query || query.length < 2) {
    dom.searchResults.innerHTML = '<div class="search-empty">输入关键词搜索全本圣经</div>';
    return;
  }
  var q = query.toLowerCase();
  var results = [];
  var pending = 0;
  BIBLE_BOOKS.forEach(function(book) {
    pending++;
    fetch('/data/' + book.id + '.json').then(function(resp) {
      if (!resp.ok) return;
      return resp.json();
    }).then(function(data) {
      if (!data || !data.chapters) return;
      Object.keys(data.chapters).forEach(function(chKey) {
        var verses = data.chapters[chKey];
        verses.forEach(function(v) {
          if (v.text && v.text.toLowerCase().indexOf(q) !== -1) {
            results.push({
              bookId: book.id,
              bookName: book.name,
              chapter: parseInt(chKey),
              verse: v.verse,
              text: v.text
            });
          }
        });
      });
    }).catch(function() {}).finally(function() {
      pending--;
      if (pending === 0) renderSearchResults(results, query);
    });
  });
}

function renderSearchResults(results, query) {
  if (results.length === 0) {
    dom.searchResults.innerHTML = '<div class="search-empty">未找到包含 "' + escapeHtml(query) + '" 的经文</div>';
    return;
  }
  var grouped = {};
  results.forEach(function(r) {
    var key = r.bookName;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });
  var html = '<div class="search-result-count">找到 ' + results.length + ' 条结果</div>';
  Object.keys(grouped).forEach(function(bookName) {
    html += '<div class="search-book-group"><div class="search-book-name">' + bookName + '</div>';
    grouped[bookName].forEach(function(r) {
      var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ===== 事件绑定 =====');
      var highlighted = r.text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
      html += '<div class="search-result-item" onclick="navigateToVerse(\'' + r.bookId + '\',' + r.chapter + ',' + r.verse + ')">' +
        '<span class="search-result-ref">' + r.bookName + ' ' + r.chapter + ':' + r.verse + '</span>' +
        '<span class="search-result-text">' + highlighted + '</span></div>';
    });
    html += '</div>';
  });
  dom.searchResults.innerHTML = html;
}

function navigateToVerse(bookId, chapter, verse) {
  state.selectedBook = BIBLE_BOOKS.find(function(b) { return b.id === bookId; });
  if (!state.selectedBook) return;
  loadChapter(bookId, chapter);
}

// ===== 事件绑定 =====
function setupEventListeners() {
  dom.btnBack.addEventListener("click", function() {
    // Close AI view has special handling
    if (state.currentView === "aiChat") {
      goBack();
    } else {
      goBack();
    }
  });

  dom.btnSettings.addEventListener("click", function() { showView("settings"); });
  dom.themeToggle.addEventListener("click", toggleTheme);

  // Search button
  dom.btnSearch.addEventListener("click", function() { showView("search"); dom.searchInput.focus(); });

  dom.bottomBookmarks.addEventListener("click", function() {
    clearSelection();
    state.history = [];
    renderBookmarks();
    showView("bookmarks");
  });

  dom.bottomBooks.addEventListener("click", function() {
    clearSelection();
    showView("books");
  });

  dom.bottomHome.addEventListener("click", function() {
    clearSelection();
    state.selectedBook = null;
    state.selectedChapter = null;
    state.history = [];
    showView("books");
    renderDailyVerse();
    renderStreakBanner();
    renderContinueReading();
  });

  dom.bottomHistory.addEventListener("click", function() {
    state.selectedBook = null;
    state.selectedChapter = null;
    state.history = [];
    renderHistory();
    showView("history");
  });

  dom.btnAiExplainSelected.addEventListener("click", explainSelectedVerses);
  if (dom.btnAiExplainChapter) dom.btnAiExplainChapter.addEventListener("click", explainChapter);
  if (dom.btnAiCustomQuestion) dom.btnAiCustomQuestion.addEventListener("click", openCustomQuestion);
  dom.btnClearSelection.addEventListener("click", clearSelection);


  dom.btnShareCopy.addEventListener("click", copySharedVerses);
  dom.btnShareClose.addEventListener("click", function() {
    dom.shareOverlay.classList.remove("visible");
  });
  dom.shareOverlay.addEventListener("click", function(e) {
    if (e.target === dom.shareOverlay) dom.shareOverlay.classList.remove("visible");
  });

  dom.btnAiSend.addEventListener("click", sendAiMessage);
  dom.aiInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  });

  dom.btnSaveApiKey.addEventListener("click", saveApiKey);

  // Search
  dom.searchInput.addEventListener("input", function() { performSearch(this.value.trim()); });
  dom.searchClear.addEventListener("click", function() { dom.searchInput.value = ""; performSearch(""); dom.searchInput.focus(); });

  // Reading progress tracking
  document.querySelector(".main-content").addEventListener("scroll", updateReadingProgress, { passive: true });

  // Swipe navigation
  setupSwipeNavigation();

  $$(".btn-font-size").forEach(function(btn) {
    btn.addEventListener("click", function() {
      setFontSize(parseFloat(btn.dataset.size));
    });
  });
}

// ===== 收藏选中经文 =====
function bookmarkSelectedVerses() {
  if (state.selectedVerses.length === 0) {
    showToast("请先选择经文");
    return;
  }
  var bookmarks = getBookmarks();
  state.selectedVerses.forEach(function(v) {
    var exists = bookmarks.some(function(b) {
      return b.book === v.book && b.chapter === v.chapter && b.verse === v.verse;
    });
    if (!exists) {
      bookmarks.push({ book: v.book, chapter: v.chapter, verse: v.verse, text: v.text, time: Date.now() });
    }
  });
  bookmarks.sort(function(a, b) { return b.time - a.time; });
  localStorage.setItem("bible_bookmarks", JSON.stringify(bookmarks));
  showToast("已收藏 " + state.selectedVerses.length + " 节经文");
}

function getBookmarks() {
  try { return JSON.parse(localStorage.getItem("bible_bookmarks") || "[]"); }
  catch(e) { return []; }
}

// ===== 启动 =====
document.addEventListener("DOMContentLoaded", init);
// ===== 每日金句 =====
var DAILY_VERSES = [
  { text: "神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。", ref: "约翰福音 3:16" },
  { text: "你要专心仰赖耶和华，不可倚靠自己的聪明，在你一切所行的事上都要认定他，他必指引你的路。", ref: "箴言 3:5-6" },
  { text: "我靠着那加给我力量的，凡事都能作。", ref: "腓立比书 4:13" },
  { text: "耶和华是我的牧者，我必不至缺乏。", ref: "诗篇 23:1" },
  { text: "凡劳苦担重担的人，可以到我这里来，我就使你们得安息。", ref: "马太福音 11:28" },
  { text: "你们要先求他的国和他的义，这些东西都要加给你们了。", ref: "马太福音 6:33" },
  { text: "耶和华说：我知道我向你们所怀的意念是赐平安的意念，不是降灾祸的意念，要叫你们末后有指望。", ref: "耶利米书 29:11" },
  { text: "我们晓得万事都互相效力，叫爱神的人得益处。", ref: "罗马书 8:28" },
  { text: "你不要害怕，因为我与你同在；不要惊惶，因为我是你的神。", ref: "以赛亚书 41:10" },
  { text: "如今常存的有信，有望，有爱；这三样，其中最大的是爱。", ref: "哥林多前书 13:13" },
  { text: "你的话是我脚前的灯，是我路上的光。", ref: "诗篇 119:105" },
  { text: "但那等候耶和华的，必从新得力。他们必如鹰展翅上腾，他们奔跑却不困倦，行走却不疲乏。", ref: "以赛亚书 40:31" },
  { text: "你们是世上的光。城造在山上，是不能隐藏的。", ref: "马太福音 5:14" },
  { text: "你要保守你心，胜过保守一切，因为一生的果效，是由心发出。", ref: "箴言 4:23" },
];

function renderDailyVerse() {
  var today = new Date();
  var dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  var verse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  dom.dailyVerse.style.display = "block";
  dom.dailyVerse.innerHTML =
    '<div class="daily-verse-label">\u4eca\u65e5\u91d1\u53e5 ' + today.getMonth() + '/' + today.getDate() + '</div>' +
    '<div class="daily-verse-body">' + escapeHtml(verse.text) + '</div>' +
    '<div class="daily-verse-ref">\u2014\u2014 ' + verse.ref + '</div>';
}

// ===== 读经打卡 =====
function renderStreakBanner() {
  var data = getStreakData();
  dom.streakBanner.style.display = "block";
  dom.streakBanner.innerHTML =
    '<div class="streak-info">' +
    '<div class="streak-icon">\ud83d\udd25</div>' +
    '<div>' +
    '<div class="streak-text">\u4eca\u65e5\u5df2\u6253\u5361</div>' +
    '<div class="streak-label">\u5df2\u8fde\u7eed\u8bfb\u7ecf <span class="streak-count">' + data.streak + '</span> \u5929</div>' +
    '</div></div>' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--text-tertiary);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>';
}

function getStreakData() {
  try {
    var d = JSON.parse(localStorage.getItem("bible_streak") || '{"streak":0,"lastDate":""}');
    return d;
  } catch(e) { return { streak: 0, lastDate: "" }; }
}

function updateReadingStreak() {
  var today = new Date().toISOString().slice(0, 10);
  var data = getStreakData();
  if (data.lastDate === today) return;
  var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (data.lastDate === yesterday) {
    data.streak = (data.streak || 0) + 1;
  } else if (data.lastDate !== today) {
    data.streak = 1;
  }
  data.lastDate = today;
  localStorage.setItem("bible_streak", JSON.stringify(data));
}

// ===== 读经历史 =====
function saveReadingHistory(bookId, chapter) {
  var book = BIBLE_BOOKS.find(function(b) { return b.id === bookId; });
  if (!book) return;
  var today = new Date().toISOString().slice(0, 10);
  try {
    var hist = JSON.parse(localStorage.getItem("bible_history") || "[]");
    hist = hist.filter(function(h) { return !(h.bookId === bookId && h.chapter === chapter); });
    hist.unshift({ bookId: bookId, bookName: book.name, chapter: chapter, date: today, time: Date.now() });
    if (hist.length > 50) hist = hist.slice(0, 50);
    localStorage.setItem("bible_history", JSON.stringify(hist));
  } catch(e) {}
}

function renderHistory() {
  try {
    var hist = JSON.parse(localStorage.getItem("bible_history") || "[]");
  } catch(e) { hist = []; }
  if (hist.length === 0) {
    dom.historyContainer.innerHTML = '<div class="history-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>\u8fd8\u6ca1\u6709\u8bfb\u7ecf\u8bb0\u5f55</p></div>';
    return;
  }
  var html = "", lastDate = "";
  hist.forEach(function(h) {
    if (h.date !== lastDate) {
      if (lastDate !== "") html += '</div>';
      html += '<div style="margin-bottom:16px"><div style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);padding:6px 0;letter-spacing:0.04em">' + h.date + '</div>';
      lastDate = h.date;
    }
    html += '<div class="history-item" data-book="' + h.bookId + '" data-chapter="' + h.chapter + '">' +
      '<div class="history-position">\u300a' + h.bookName + '\u300b\u7b2c ' + h.chapter + ' \u7ae0</div>' +
      '<svg class="history-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</div>';
  });
  html += '</div>';
  dom.historyContainer.innerHTML = html;
  dom.historyContainer.querySelectorAll(".history-item").forEach(function(el) {
    el.addEventListener("click", function() {
      state.selectedBook = el.dataset.book;
      state.selectedChapter = parseInt(el.dataset.chapter);
      loadChapter(state.selectedBook, state.selectedChapter);
      showView("reading");
    });
  });
}

// ===== 阅读进度条 =====
function updateReadingProgress() {
  var mc = document.querySelector(".main-content");
  if (!mc || state.currentView !== "reading") { dom.readingProgress.style.width = "0%"; return; }
  var scrollTop = mc.scrollTop;
  var scrollHeight = mc.scrollHeight - mc.clientHeight;
  if (scrollHeight <= 0) { dom.readingProgress.style.width = "0%"; return; }
  var pct = Math.min((scrollTop / scrollHeight) * 100, 100);
  dom.readingProgress.style.width = pct + "%";
}

// ===== 分享经文 =====
function shareSelectedVerses() {
  if (state.selectedVerses.length === 0) {
    showToast("\u8bf7\u5148\u9009\u62e9\u7ecf\u6587");
    return;
  }
  var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedVerses[0].book; });
  var bookName = book ? book.name : "";
  var refText, fullText;
  if (state.selectedVerses.length === 1) {
    refText = bookName + " " + state.selectedVerses[0].chapter + ":" + state.selectedVerses[0].verse;
    fullText = state.selectedVerses[0].text;
  } else {
    var first = state.selectedVerses[0];
    var last = state.selectedVerses[state.selectedVerses.length - 1];
    refText = bookName + " " + first.chapter + ":" + first.verse + "-" + last.verse;
    fullText = state.selectedVerses.map(function(v) { return v.text; }).join(" ");
  }
  dom.shareVerseText.textContent = fullText;
  dom.shareVerseRef.textContent = "\u2014\u2014 " + refText;
  dom.shareOverlay.classList.add("visible");
}

function copySharedVerses() {
  var text = dom.shareVerseText.textContent + "\n\n" + dom.shareVerseRef.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast("\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f");
      dom.shareOverlay.classList.remove("visible");
    }).catch(function() { fallbackCopy(text); });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  showToast("\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f");
  dom.shareOverlay.classList.remove("visible");
}

// ===== 滑动切换章节 =====
function setupSwipeNavigation() {
  document.addEventListener("touchstart", function(e) {
    state.touchStartX = e.changedTouches[0].screenX;
    state.touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  document.addEventListener("touchend", function(e) {
    if (state.currentView !== "reading") return;
    var dx = e.changedTouches[0].screenX - state.touchStartX;
    var dy = e.changedTouches[0].screenY - state.touchStartY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    navigateChapter(dx > 0 ? -1 : 1);
  }, { passive: true });
}

// ===== 经文笔记 =====
function getNotes() {
  try { return JSON.parse(localStorage.getItem("bible_notes") || "[]"); }
  catch(e) { return []; }
}

function addNoteForVerse() {
  if (state.selectedVerses.length === 0) {
    showToast("\u8bf7\u5148\u9009\u62e9\u7ecf\u6587");
    return;
  }
  var book = BIBLE_BOOKS.find(function(b) { return b.id === state.selectedVerses[0].book; });
  var bookName = book ? book.shortName : "";
  var ref = bookName + " " + state.selectedVerses[0].chapter + ":" + state.selectedVerses[0].verse;
  if (state.selectedVerses.length > 1) {
    ref += "-" + state.selectedVerses[state.selectedVerses.length - 1].verse;
  }
  var note = prompt("\u4e3a " + ref + " \u6dfb\u52a0\u7b14\u8bb0\uff1a", "");
  if (!note || !note.trim()) return;
  var notes = getNotes();
  notes.unshift({ ref: ref, content: note.trim(), time: Date.now() });
  localStorage.setItem("bible_notes", JSON.stringify(notes));
  showToast("\u7b14\u8bb0\u5df2\u4fdd\u5b58");
  clearSelection();
}

function renderNotes() {
  var notes = getNotes();
  if (notes.length === 0) {
    dom.notesContainer.innerHTML = '<div class="note-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><p>\u8fd8\u6ca1\u6709\u7b14\u8bb0</p></div>';
    return;
  }
  var html = "";
  notes.forEach(function(n, i) {
    var d = new Date(n.time);
    html += '<div class="note-item">' +
      '<div class="note-ref">' + escapeHtml(n.ref) + '</div>' +
      '<div class="note-content">' + escapeHtml(n.content) + '</div>' +
      '<div class="note-time">' + d.toLocaleDateString("zh-CN") + '</div>' +
      '<div class="note-actions">' +
      '<button onclick="deleteNote(' + i + ')">\u5220\u9664</button>' +
      '</div></div>';
  });
  dom.notesContainer.innerHTML = html;
}

function deleteNote(index) {
  var notes = getNotes();
  notes.splice(index, 1);
  localStorage.setItem("bible_notes", JSON.stringify(notes));
  renderNotes();
  showToast("\u7b14\u8bb0\u5df2\u5220\u9664");
}
// ===== 书签列表渲染 =====
function renderBookmarks() {
  var bookmarks = getBookmarks();
  if (bookmarks.length === 0) {
    dom.bookmarksContainer.innerHTML = '<div class="bookmark-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><p>还没有收藏的经文</p><p style="font-size:0.8rem">在阅读时长按或点击经文即可收藏</p></div>';
    return;
  }
  var html = "";
  bookmarks.forEach(function(b, i) {
    var book = BIBLE_BOOKS.find(function(bk) { return bk.id === b.book; });
    var bookName = book ? book.shortName : "";
    html += '<div class="bookmark-item" data-book="' + b.book + '" data-chapter="' + b.chapter + '" data-verse="' + b.verse + '">' +
      '<span class="bookmark-ref">' + bookName + ' ' + b.chapter + ':' + b.verse + '</span>' +
      '<span class="bookmark-text">' + escapeHtml(b.text) + '</span>' +
      '<button class="bookmark-delete" data-index="' + i + '" title="删除">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button></div>';
  });
  dom.bookmarksContainer.innerHTML = html;
  dom.bookmarksContainer.querySelectorAll(".bookmark-item").forEach(function(el) {
    el.addEventListener("click", function(e) {
      if (e.target.closest(".bookmark-delete")) return;
      state.selectedBook = el.dataset.book;
      state.selectedChapter = parseInt(el.dataset.chapter);
      loadChapter(state.selectedBook, state.selectedChapter);
      showView("reading");
    });
  });
  dom.bookmarksContainer.querySelectorAll(".bookmark-delete").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var idx = parseInt(btn.dataset.index);
      var bookmarks = getBookmarks();
      bookmarks.splice(idx, 1);
      localStorage.setItem("bible_bookmarks", JSON.stringify(bookmarks));
      renderBookmarks();
      showToast("已删除");
    });
  });
}
