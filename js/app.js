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
  aiContextRef: ""
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
  bottomHome: $("#bottomHome"),
  mainContent: $(".main-content"),
  toast: $("#toast"),
};

// ===== 初始化 =====
function init() {
  loadSettings();
  applyFontSize();
  renderBooks();
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
  var aiBtnHtml = '<div style="text-align:center;padding:8px 0 0">' +
    '<button class="btn-ai-chapter" id="btnAiChapterPersistent" onclick="explainChapter()">' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
    " AI\u7267\u5e08\u8bb2\u89e3\u672c\u7ae0" +
    '</button></div>';
  dom.chapterNavTop.innerHTML = navHtml + aiBtnHtml;
  dom.chapterNavBottom.innerHTML = navHtml;
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
      max_tokens: 2000,
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

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
  });

  dom.btnAiExplainSelected.addEventListener("click", explainSelectedVerses);
  dom.btnAiExplainChapter.addEventListener("click", explainChapter);
  dom.btnAiCustomQuestion.addEventListener("click", openCustomQuestion);
  dom.btnClearSelection.addEventListener("click", clearSelection);

  dom.btnAiSend.addEventListener("click", sendAiMessage);
  dom.aiInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  });

  dom.btnSaveApiKey.addEventListener("click", saveApiKey);

  $$(".btn-font-size").forEach(function(btn) {
    btn.addEventListener("click", function() {
      setFontSize(parseFloat(btn.dataset.size));
    });
  });
}

// ===== 启动 =====
document.addEventListener("DOMContentLoaded", init);
