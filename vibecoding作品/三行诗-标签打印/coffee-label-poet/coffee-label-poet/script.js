const form = document.querySelector("#poemForm");
const accessGate = document.querySelector("#accessGate");
const accessForm = document.querySelector("#accessForm");
const accessCodeInput = document.querySelector("#accessCode");
const accessMessage = document.querySelector("#accessMessage");
const nicknameInput = document.querySelector("#nickname");
const moodInput = document.querySelector("#mood");
const poemLines = document.querySelector("#poemLines");
const printLines = document.querySelector("#printLines");
const labelPreview = document.querySelector("#labelPreview");
const printCard = document.querySelector("#printCard");
const statusMessage = document.querySelector("#statusMessage");
const randomizeButton = document.querySelector("#randomize");
const copyTextButton = document.querySelector("#copyText");
const exportImageButton = document.querySelector("#exportImage");
const exportSelectedButton = document.querySelector("#exportSelected");
const selectAllHistoryButton = document.querySelector("#selectAllHistory");
const clearHistorySelectionButton = document.querySelector("#clearHistorySelection");
const selectedHistoryCount = document.querySelector("#selectedHistoryCount");
const clearHistoryButton = document.querySelector("#clearHistory");
const printButton = document.querySelector("#printLabel");
const historyList = document.querySelector("#historyList");
const aiEndpoint = window.COFFEE_POET_API_ENDPOINT || "";

const HISTORY_KEY = "coffeePoetHistory";
const MAX_HISTORY = 24;
const LINE_LIMITS = {
  zh: { chars: 11, minFont: 17, lineHeight: 1.18 },
  en: { chars: 36, words: 6, minFont: 13, lineHeight: 1.12 },
};

let accessToken = sessionStorage.getItem("coffeePoetAccessToken") || "";

const styleLabels = {
  modern: "现代",
  classic: "古风",
  healing: "治愈",
  playful: "俏皮",
};

const languageLabels = {
  zh: "中文诗",
  en: "English",
};

const modelLabels = {
  "deepseek-v4-pro": "高质量",
  "deepseek-v4-flash": "快速",
};

const state = {
  style: "modern",
  language: "zh",
  model: "deepseek-v4-pro",
  theme: "ink",
  activeId: "",
  selectedIds: new Set(),
  history: loadHistory(),
  lastPoem: null,
  generationId: 0,
};

const moodWords = {
  平静: ["杯口", "白瓷", "小风", "晨声"],
  开心: ["奶泡", "窗光", "街角", "甜香"],
  期待: ["门铃", "路口", "新香", "清晨"],
  满足: ["杯沿", "糖香", "木桌", "暖手"],
  轻松: ["小风", "杯影", "窗边", "慢步"],
  清醒: ["清晨", "白瓷", "热气", "桌面"],
  疲惫: ["热气", "杯沿", "慢呼吸", "掌心"],
  焦虑: ["杯底", "慢呼吸", "木桌", "暖手"],
  慢热: ["杯盖", "小口", "慢步", "窗光"],
  重启: ["暖意", "清晨", "杯口", "新香"],
};

const nameMeanings = ["光", "风", "雨", "晴", "星", "森", "海", "月", "云", "安", "甜", "暖"];

const zhTemplates = {
  modern: [
    ["杯沿留着晨声", "热气绕过指尖", "心慢慢坐稳"],
    ["纸杯贴近掌心", "窗边小风经过", "今天可以慢些"],
    ["街角刚醒过来", "咖啡香落在衣袖", "步子轻了一点"],
  ],
  classic: [
    ["半窗微雨未收", "杯中茶烟轻起", "人心慢得一寸"],
    ["檐影落在杯边", "小案香气初温", "清欢不必多言"],
    ["竹影落得很轻", "热盏贴近掌中", "眉间渐有晴意"],
  ],
  healing: [
    ["先把肩放低些", "热气停在杯口", "这一刻够安静"],
    ["不用急着说话", "杯子还在掌心", "呼吸慢慢回来"],
    ["雨声落到窗外", "咖啡替你守温", "路会一点点开"],
  ],
  playful: [
    ["奶泡偷偷抬头", "杯盖轻轻点名", "今天别太严肃"],
    ["咖啡冒个小泡", "烦恼先坐旁边", "甜香已经到场"],
    ["吸管敲了敲杯", "心情换个座位", "笑意慢慢上来"],
  ],
};

const enTemplates = {
  modern: [
    ["Steam on the rim", "hands find the cup", "the day softens"],
    ["A corner wakes", "coffee warms the sleeve", "steps feel lighter"],
    ["Rain taps the window", "the cup stays close", "breath comes back"],
  ],
  classic: [
    ["Steam lifts slowly", "the small cup waits", "morning grows quiet"],
    ["Rain touches the sill", "warmth stays in hand", "the hour clears"],
    ["A pale window", "coffee gathers breath", "peace comes near"],
  ],
  healing: [
    ["Take one slow sip", "warmth holds the cup", "you can pause"],
    ["No need to rush", "steam keeps its pace", "so can you"],
    ["Hands around the cup", "the noise moves back", "breath finds room"],
  ],
  playful: [
    ["Foam makes a grin", "the lid taps twice", "mood changes seats"],
    ["Coffee says wait", "sugar takes a bow", "trouble sits out"],
    ["A tiny bubble rises", "the warm cup laughs", "smiles show up"],
  ],
};

function todayText() {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
}

function loadHistory() {
  try {
    const records = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return records.map((record) => ({
      id: record.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      lines: Array.isArray(record.lines) ? record.lines : [],
      nickname: typeof record.nickname === "string" ? record.nickname : "",
      mood: record.mood || "",
      style: styleLabels[record.style] ? record.style : "modern",
      language: languageLabels[record.language] ? record.language : "zh",
      model: modelLabels[record.model] ? record.model : "deepseek-v4-pro",
      createdAt: record.createdAt || new Date().toISOString(),
    })).filter((record) => record.lines.length === 3);
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

function pickMoodImage(mood) {
  const entry = Object.entries(moodWords).find(([key]) => mood.includes(key));
  if (entry) {
    return entry[1][Math.floor(Math.random() * entry[1].length)];
  }
  return nameMeanings[Math.floor(Math.random() * nameMeanings.length)];
}

function splitNickname(name) {
  const compact = name.trim().replace(/\s+/g, "");
  return compact ? Array.from(compact) : [];
}

function nicknameMeaning(name, mood) {
  const direct = Array.from(name).find((char) => nameMeanings.includes(char));
  return direct || pickMoodImage(mood);
}

function hasNegativeMood(mood) {
  return /疲惫|焦虑|难过|低落|沮丧|烦|累|崩溃|失落|压力|emo|不开心|想哭|sad|tired|anxious|stress|down/i.test(mood);
}

function composePoem(name, mood, style, language) {
  const safeName = name.trim();
  const meaning = language === "en" ? pickEnglishImage(mood, safeName) : nicknameMeaning(safeName, mood);
  const templates = language === "en" ? enTemplates[style] : zhTemplates[style];
  const template = templates[Math.floor(Math.random() * templates.length)];

  const lines = template.map((line) => line.replace("{a}", "").replace("{b}", meaning));
  return placeNicknameChars(encourageLines(lines, mood, language), safeName, language);
}

function pickEnglishImage(mood, name = "") {
  const nameChars = new Set(Array.from(name.toLowerCase()));
  const candidates = hasNegativeMood(mood)
    ? ["warmth", "slow breath", "warm cup", "quiet table", "soft rain"]
    : ["foam", "sweet air", "clear cup", "small luck", "morning"];
  const filtered = candidates.filter((word) => !Array.from(word.toLowerCase()).some((char) => nameChars.has(char)));
  const pool = filtered.length > 0 ? filtered : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function encourageLines(lines, mood, language) {
  if (!hasNegativeMood(mood)) {
    return lines;
  }
  const next = [...lines];
  next[2] = language === "en" ? "the cup stays warm" : "杯子仍然温着";
  return next;
}

function placeNicknameChars(lines, name, language) {
  const compact = name.trim().replace(/\s+/g, "");
  if (!compact) {
    return lines;
  }

  const chars = nicknameChars(compact, language);
  if (language === "en") {
    const natural = avoidDirectNickname([...lines], compact);
    if (containsCharsInOrder(natural, compact)) {
      return natural;
    }

    const carrier = buildEnglishNicknameCarrier(compact);
    if (carrier && containsCharsInOrder(carrier, compact)) {
      return carrier;
    }

    const withFallback = [...natural];
    chars.forEach((char, index) => {
      const placement = [
        { line: 0, ratio: 0 },
        { line: 1, ratio: 0 },
        { line: 2, ratio: 0 },
      ][index % 3];
      withFallback[placement.line] = insertEnglishTokenAtRatio(withFallback[placement.line], char, placement.ratio);
    });
    return avoidDirectNickname(withFallback, compact);
  }

  const natural = avoidDirectNickname([...lines], compact);
  if (containsChineseNicknameCharsOnce(natural, compact) && !hasAwkwardChinesePhrase(natural)) {
    return natural;
  }

  return buildChineseNicknameCarrier(lines, compact);
}

function containsCharsInOrder(lines, compactName) {
  const text = lines.join("").toLowerCase();
  const chars = nicknameChars(compactName.toLowerCase(), "en");
  let cursor = -1;
  return chars.every((char) => {
    const index = text.indexOf(char, cursor + 1);
    if (index === -1) {
      return false;
    }
    cursor = index;
    return true;
  });
}

function containsChineseNicknameCharsOnce(lines, compactName) {
  const text = lines.join("");
  return uniqueCharsInOrder(compactName).every((char) => {
    const count = Array.from(text).filter((item) => item === char).length;
    return count === 1;
  });
}

function buildChineseNicknameCarrier(lines, compactName) {
  const chars = uniqueCharsInOrder(compactName);
  const cleaned = stripExtraNicknameChars(lines, compactName);
  const carriers = [
    (char) => `杯沿藏着${char}字`,
    (char) => `${char}意落在掌心`,
    (char) => `热气托住${char}声`,
  ];
  const next = [
    cleaned[0] || "杯沿留着晨声",
    cleaned[1] || "热气绕过指尖",
    cleaned[2] || "心慢慢坐稳",
  ];

  chars.slice(0, 3).forEach((char, index) => {
    next[index] = carriers[index](char);
  });

  return avoidDirectNickname(next, compactName);
}

function buildEnglishNicknameCarrier(compactName) {
  if (compactName.toLowerCase() !== "vivia") {
    return null;
  }
  return [
    "Vapor lifts slowly",
    "inside the quiet cup",
    "vivid rest arrives",
  ];
}

function containsSpelledNickname(lines, name) {
  const compact = name.trim().replace(/\s+/g, "");
  if (compact.length < 3) {
    return false;
  }
  const pattern = Array.from(compact)
    .map((char) => escapeRegExp(char.toLowerCase()))
    .join("[\\s,，.。;；:：'\"-]+");
  return new RegExp(pattern, "i").test(lines.join(" "));
}

function hasAwkwardChinesePhrase(lines) {
  return /轻雨轻停住|人心慢得一寸|咖啡替你守温|后的清雨新|杯小沿|憩的杯/.test(lines.join(""));
}

function hasMostlyNonEnglishLines(lines) {
  const text = lines.join(" ");
  const asciiLetters = (text.match(/[A-Za-z]/g) || []).length;
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return cjkChars > 0 || asciiLetters < 8;
}

function nicknameChars(value, language) {
  const chars = Array.from(value);
  if (language === "en") {
    return chars;
  }
  return uniqueCharsInOrder(value);
}

function stripExtraNicknameChars(lines, compactName) {
  const chars = new Set(Array.from(compactName).map((char) => char.toLowerCase()));
  return lines.map((line) => Array.from(line).filter((char) => !chars.has(char.toLowerCase())).join(""));
}

function uniqueCharsInOrder(value) {
  const seen = new Set();
  return Array.from(value).filter((char) => {
    const key = char.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function insertAtRatio(line, char, ratio) {
  const chars = Array.from(line);
  const index = Math.max(0, Math.min(chars.length, Math.round(chars.length * ratio)));
  chars.splice(index, 0, char);
  return chars.join("");
}

function insertEnglishTokenAtRatio(line, char, ratio) {
  const words = String(line).trim().split(/\s+/).filter(Boolean);
  const index = Math.max(0, Math.min(words.length, Math.round(words.length * ratio)));
  words.splice(index, 0, char);
  return words.join(" ");
}

function avoidDirectNickname(lines, compactName) {
  if (compactName.length < 2) {
    return lines;
  }

  return lines.map((line) => {
    let next = line;
    const chars = Array.from(compactName).join(" ");
    while (next.toLowerCase().includes(compactName.toLowerCase())) {
      next = next.replace(new RegExp(escapeRegExp(compactName), "gi"), chars);
    }
    return next;
  });
}

function highlightLine(line, name, usedHighlights = new Set(), options = {}) {
  const rawName = String(name || "").trim().replace(/\s+/g, "");
  if (!rawName) {
    return escapeHtml(line);
  }
  const tokens = nicknameChars(rawName, options.ordered ? "en" : "zh").map((token) => token.toLowerCase());
  return Array.from(String(line))
    .map((char) => {
      const safeChar = escapeHtml(char);
      const lowerChar = char.toLowerCase();
      if (options.ordered) {
        const nextToken = tokens[options.index || 0];
        if (lowerChar === nextToken) {
          options.index = (options.index || 0) + 1;
          return `<strong class="highlight">${safeChar}</strong>`;
        }
        return safeChar;
      }

      if (tokens.includes(lowerChar) && !usedHighlights.has(lowerChar)) {
        usedHighlights.add(lowerChar);
        return `<strong class="highlight">${safeChar}</strong>`;
      }
      return safeChar;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makePoemRecord(lines, options = {}) {
  const nickname = Object.prototype.hasOwnProperty.call(options, "nickname")
    ? String(options.nickname || "").trim()
    : nicknameInput.value.trim();
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    lines,
    nickname,
    mood: options.mood || moodInput.value.trim(),
    style: options.style || state.style,
    language: options.language || state.language,
    model: options.model || state.model,
    createdAt: new Date().toISOString(),
  };
}

function addPoemRecord(record) {
  state.history = [record, ...state.history].slice(0, MAX_HISTORY);
  state.activeId = record.id;
  state.selectedIds = new Set([record.id]);
  state.lastPoem = record;
  saveHistory();
  renderHistory();
  renderPoem(record);
}

function renderPoem(record) {
  const poem = Array.isArray(record) ? { lines: record, nickname: nicknameInput.value.trim() } : record;
  state.lastPoem = poem;
  [labelPreview, printCard].forEach((node) => {
    node.classList.toggle("is-english", poem.language === "en");
  });
  poemLines.innerHTML = "";
  printLines.innerHTML = "";

  const previewHighlights = new Set();
  const printHighlights = new Set();
  const previewOrder = { ordered: poem.language === "en", index: 0 };
  const printOrder = { ordered: poem.language === "en", index: 0 };
  poem.lines.forEach((line) => {
    const previewLine = document.createElement("div");
    previewLine.className = "poem-line";
    previewLine.innerHTML = highlightLine(line, poem.nickname, previewHighlights, previewOrder);
    poemLines.appendChild(previewLine);

    const printLine = document.createElement("div");
    printLine.innerHTML = highlightLine(line, poem.nickname, printHighlights, printOrder);
    printLines.appendChild(printLine);
  });

  fitPoemText(poemLines, poem.language);
  fitPoemText(printLines, poem.language);
  window.requestAnimationFrame(() => {
    fitPoemText(poemLines, poem.language);
    fitPoemText(printLines, poem.language);
  });
}

function fitPoemText(container, language) {
  if (!container) {
    return;
  }

  container.style.removeProperty("--poem-font-size");
  container.style.removeProperty("--poem-gap");
  container.style.removeProperty("--poem-line-height");

  const computed = window.getComputedStyle(container);
  const startFont = Number.parseFloat(computed.fontSize) || (language === "en" ? 22 : 28);
  const startGap = Number.parseFloat(computed.gap) || (language === "en" ? 6 : 7);
  const minFont = LINE_LIMITS[language]?.minFont || 16;
  const lineHeight = LINE_LIMITS[language]?.lineHeight || (language === "en" ? 1.12 : 1.18);

  for (let font = startFont; font >= minFont; font -= 1) {
    const gap = Math.max(2, startGap - (startFont - font) * 0.25);
    container.style.setProperty("--poem-font-size", `${font}px`);
    container.style.setProperty("--poem-gap", `${gap}px`);
    container.style.setProperty("--poem-line-height", String(lineHeight));

    const maxLineWidth = Array.from(container.children).reduce((max, line) => Math.max(max, line.scrollWidth), 0);
    const fitsWidth = maxLineWidth <= container.clientWidth + 1;
    const fitsHeight = container.scrollHeight <= container.clientHeight + 1;
    if (fitsWidth && fitsHeight) {
      return;
    }
  }

  container.style.setProperty("--poem-font-size", `${minFont}px`);
  container.style.setProperty("--poem-gap", "2px");
  container.style.setProperty("--poem-line-height", String(lineHeight));
}

function renderHistory() {
  if (!historyList) {
    return;
  }
  updateSelectedHistoryCount();
  if (state.history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">还没有生成记录。</div>';
    return;
  }

  historyList.innerHTML = state.history
    .map((record) => {
      const checked = state.selectedIds.has(record.id) ? "checked" : "";
      const active = record.id === state.activeId ? " is-active" : "";
      const usedHighlights = new Set();
      const order = { ordered: record.language === "en", index: 0 };
      const poem = record.lines.map((line) => `<div>${highlightLine(line, record.nickname, usedHighlights, order)}</div>`).join("");
      const nicknameLabel = record.nickname ? escapeHtml(record.nickname) : "无昵称";
      return `
        <article class="history-card${active}" data-id="${record.id}">
          <div class="history-card-head">
            <label><input type="checkbox" data-select-id="${record.id}" ${checked} /> 选中</label>
            <span>${languageLabels[record.language]} · ${styleLabels[record.style]} · ${modelLabels[record.model] || "高质量"}</span>
          </div>
          <div class="history-poem">${poem}</div>
          <div class="history-meta">${nicknameLabel} · ${new Date(record.createdAt).toLocaleTimeString()}</div>
        </article>
      `;
    })
    .join("");
}

function updateSelectedHistoryCount() {
  if (!selectedHistoryCount) {
    return;
  }
  const count = state.history.filter((record) => state.selectedIds.has(record.id)).length;
  selectedHistoryCount.textContent = `已选 ${count} 张`;
}

async function requestAiPoem(name, mood, style, language, model) {
  if (!aiEndpoint) {
    setStatus("当前为本地预览，已使用本地诗句模板");
    return null;
  }

  try {
    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": accessToken,
      },
      body: JSON.stringify({ nickname: name, mood, style, language, model }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `AI 请求失败：${response.status}`);
    }
    if (Array.isArray(data.lines) && data.lines.length === 3) {
      if (language === "en" && containsSpelledNickname(data.lines, name)) {
        setStatus("AI 结果未通过昵称规则，已使用本地模板");
        return null;
      }
      if (language === "en" && hasMostlyNonEnglishLines(data.lines)) {
        setStatus("AI 英文结果未通过质量检查，已使用本地模板");
        return null;
      }
      if (language === "zh" && hasAwkwardChinesePhrase(data.lines)) {
        setStatus("AI 中文结果未通过质量检查，已使用本地模板");
        return null;
      }
      setStatus(`DeepSeek ${modelLabels[model] || "高质量"}模型已生成`);
      return placeNicknameChars(data.lines, name, language);
    }
    setStatus("AI 返回格式异常，已使用本地模板");
  } catch (error) {
    console.warn("DeepSeek request failed", error);
    setStatus("DeepSeek 暂不可用，已使用本地模板");
  }

  return null;
}

async function generatePoem() {
  const generationId = ++state.generationId;
  const name = nicknameInput.value;
  const mood = moodInput.value;
  const style = state.style;
  const language = state.language;
  const model = state.model;
  const aiLines = await requestAiPoem(name, mood, style, language, model);
  if (generationId !== state.generationId) {
    return;
  }
  const lines = aiLines || composePoem(name, mood, style, language);
  addPoemRecord(makePoemRecord(lines, { nickname: name.trim(), mood, style, language, model }));
}

function setTheme(theme) {
  state.theme = theme;
  [labelPreview, printCard].forEach((node) => {
    node.classList.remove("theme-warm", "theme-kraft", "theme-ink");
    node.classList.add(`theme-${theme}`);
  });
}

function setStatus(message) {
  statusMessage.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    statusMessage.textContent = "";
  }, 2200);
}

async function verifyAccessCode(code) {
  if (!aiEndpoint) {
    return { ok: true, token: "local-preview" };
  }

  const response = await fetch("/api/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return response.json();
}

function unlockAccess(token) {
  accessToken = token;
  sessionStorage.setItem("coffeePoetAccessToken", token);
  accessGate.classList.add("is-hidden");
  if (state.history.length > 0) {
    state.activeId = state.history[0].id;
    renderPoem(state.history[0]);
    renderHistory();
    setStatus("当前显示历史记录，点击生成三行诗可请求 DeepSeek");
  } else {
    generatePoem();
  }
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accessMessage.textContent = "正在验证";
  try {
    const result = await verifyAccessCode(accessCodeInput.value);
    if (result.ok && result.token) {
      accessMessage.textContent = "";
      unlockAccess(result.token);
      return;
    }
    accessMessage.textContent = "访问码不正确";
  } catch {
    accessMessage.textContent = "验证失败，请稍后重试";
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((item) => item.classList.remove("is-active"));
    chip.classList.add("is-active");
    moodInput.value = chip.dataset.mood;
  });
});

document.querySelectorAll(".language-segment").forEach((segment) => {
  segment.addEventListener("click", () => {
    document.querySelectorAll(".language-segment").forEach((item) => item.classList.remove("is-active"));
    segment.classList.add("is-active");
    state.language = segment.dataset.language;
  });
});

document.querySelectorAll(".segment").forEach((segment) => {
  segment.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("is-active"));
    segment.classList.add("is-active");
    state.style = segment.dataset.style;
  });
});

document.querySelectorAll(".model-segment").forEach((segment) => {
  segment.addEventListener("click", () => {
    document.querySelectorAll(".model-segment").forEach((item) => item.classList.remove("is-active"));
    segment.classList.add("is-active");
    state.model = segment.dataset.model;
  });
});

document.querySelectorAll(".swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("is-active"));
    swatch.classList.add("is-active");
    setTheme(swatch.dataset.theme);
  });
});

historyList.addEventListener("click", (event) => {
  const checkbox = event.target.closest("[data-select-id]");
  if (checkbox) {
    const id = checkbox.dataset.selectId;
    if (checkbox.checked) {
      state.selectedIds.add(id);
    } else {
      state.selectedIds.delete(id);
    }
    renderHistory();
    return;
  }

  const card = event.target.closest(".history-card");
  if (!card) {
    return;
  }
  const record = state.history.find((item) => item.id === card.dataset.id);
  if (record) {
    state.activeId = record.id;
    renderPoem(record);
    renderHistory();
  }
});

selectAllHistoryButton.addEventListener("click", () => {
  state.selectedIds = new Set(state.history.map((record) => record.id));
  renderHistory();
  setStatus(`已选中 ${state.selectedIds.size} 张历史签`);
});

clearHistorySelectionButton.addEventListener("click", () => {
  state.selectedIds.clear();
  renderHistory();
  setStatus("已取消全部历史签选择");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generatePoem();
});

randomizeButton.addEventListener("click", generatePoem);

copyTextButton.addEventListener("click", async () => {
  const poem = state.lastPoem;
  if (!poem) {
    return;
  }
  try {
    await navigator.clipboard.writeText(poem.lines.join("\n"));
    setStatus("诗句已复制");
  } catch {
    setStatus("当前浏览器不支持自动复制");
  }
});

exportImageButton.addEventListener("click", () => {
  if (state.lastPoem) {
    exportPoemImage(state.lastPoem, "current");
  }
});

exportSelectedButton.addEventListener("click", () => {
  const selected = state.history.filter((record) => state.selectedIds.has(record.id));
  if (selected.length === 0 && state.lastPoem) {
    exportPoemImage(state.lastPoem, "current");
    return;
  }
  selected.forEach((record, index) => {
    window.setTimeout(() => exportPoemImage(record, `${index + 1}`), index * 250);
  });
});

clearHistoryButton.addEventListener("click", () => {
  state.history = [];
  state.selectedIds.clear();
  state.activeId = "";
  state.lastPoem = null;
  saveHistory();
  renderHistory();
  poemLines.innerHTML = "";
  printLines.innerHTML = "";
  setStatus("生成记录已清空");
});

printButton.addEventListener("click", () => {
  window.print();
});

function exportPoemImage(poem, suffix) {
  const canvas = document.createElement("canvas");
  const scale = 3;
  const width = 1000;
  const height = 750;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  drawLabel(context, width, height, poem);

  const link = document.createElement("a");
  const stamp = todayText().replace(/\./g, "");
  link.download = `coffee-label-${stamp}-${suffix}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  setStatus("标签图片已导出");
}

function drawLabel(context, width, height, poem) {
  const themeMap = {
    warm: { bg: "#fff8eb", ink: "#241f1b", muted: "#756a5f", accentBg: "#f0d8cb", accent: "#843d2d" },
    kraft: { bg: "#c9aa7e", ink: "#251a12", muted: "#4f3b28", accentBg: "#efe1ca", accent: "#4d2419" },
    ink: { bg: "#fbfbf7", ink: "#171717", muted: "#4d4d4d", accentBg: "#171717", accent: "#ffffff" },
  };
  const colors = themeMap[state.theme] || themeMap.warm;
  const compactName = String(poem.nickname || "").trim().replace(/\s+/g, "");
  const nameTokens = compactName ? nicknameChars(compactName, poem.language) : [];

  context.fillStyle = colors.bg;
  roundRect(context, 0, 0, width, height, 34);
  context.fill();
  context.strokeStyle = "rgba(36,31,27,0.28)";
  context.lineWidth = 6;
  context.stroke();

  const padX = 56;
  const headerY = 124;
  const poemTop = 202;
  const poemBottom = height - 72;
  const poemWidth = width - padX * 2;
  const poemHeight = poemBottom - poemTop;

  context.fillStyle = "#b4644d";
  context.font = "700 72px \"Songti SC\", SimSun, \"Noto Serif CJK SC\", serif";
  context.fillText("天使学堂", padX, headerY);

  const usedHighlights = new Set();
  const highlightOrder = { ordered: poem.language === "en", index: 0 };
  const fit = fitCanvasPoem(context, poem.lines, poem.language, poemWidth, poemHeight);
  const totalPoemHeight = fit.size + (poem.lines.length - 1) * fit.step;
  const firstBaseline = poemTop + Math.max(0, (poemHeight - totalPoemHeight) / 2) + fit.size;
  poem.lines.forEach((line, index) => {
    const y = firstBaseline + index * fit.step;
    drawHighlightedText(context, line, nameTokens, usedHighlights, highlightOrder, padX, y, colors, poem.language, fit.size);
  });

}

function fitCanvasPoem(context, lines, language, maxWidth, maxHeight) {
  const baseSize = language === "en" ? 72 : 94;
  const minSize = language === "en" ? 42 : 48;
  const lineHeight = language === "en" ? 1.2 : 1.24;

  for (let size = baseSize; size >= minSize; size -= 2) {
    const maxLineWidth = Math.max(...lines.map((line) => measureCanvasLine(context, line, language, size)));
    const step = size * lineHeight;
    const totalHeight = size + (lines.length - 1) * step;
    if (maxLineWidth <= maxWidth && totalHeight <= maxHeight) {
      return { size, step };
    }
  }

  const minWidth = Math.max(...lines.map((line) => measureCanvasLine(context, line, language, minSize)));
  const widthScale = minWidth > 0 ? maxWidth / minWidth : 1;
  const heightScale = maxHeight / (minSize + (lines.length - 1) * minSize * lineHeight);
  const fallbackSize = Math.max(language === "en" ? 28 : 34, Math.floor(minSize * Math.min(widthScale, heightScale)));
  return { size: fallbackSize, step: fallbackSize * lineHeight };
}

function measureCanvasLine(context, line, language, size) {
  const font = language === "en" ? "Georgia, Times New Roman, serif" : "SimSun, Songti SC, serif";
  const spacing = language === "en" ? 1.5 : 3;
  context.font = `600 ${size}px ${font}`;
  return Array.from(String(line)).reduce((width, part) => width + context.measureText(part).width + spacing, 12);
}

function drawHighlightedText(context, line, tokens, usedHighlights, highlightOrder, x, y, colors, language, fittedSize) {
  let cursor = x;
  const font = language === "en" ? "Georgia, Times New Roman, serif" : "SimSun, Songti SC, serif";
  const size = fittedSize || (language === "en" ? 72 : 94);
  const parts = Array.from(line);

  parts.forEach((part) => {
    const isSpace = /^\s+$/.test(part);
    const lowerPart = part.toLowerCase();
    let isHighlight = false;
    if (!isSpace && highlightOrder.ordered) {
      const nextToken = tokens[highlightOrder.index || 0];
      isHighlight = lowerPart === String(nextToken || "").toLowerCase();
      if (isHighlight) {
        highlightOrder.index = (highlightOrder.index || 0) + 1;
      }
    } else {
      isHighlight = !isSpace && tokens.some((token) => token.toLowerCase() === lowerPart) && !usedHighlights.has(lowerPart);
    }
    if (isHighlight) {
      usedHighlights.add(lowerPart);
    }
    context.font = `${isHighlight ? "700" : "500"} ${size}px ${font}`;
    const partWidth = context.measureText(part).width + (language === "en" ? 1.5 : 3);
    if (isHighlight) {
      context.fillStyle = colors.accentBg;
      roundRect(context, cursor - 5, y - size + 6, partWidth + 10, size + 12, 12);
      context.fill();
      context.fillStyle = colors.accent;
    } else {
      context.fillStyle = colors.ink;
    }
    context.fillText(part, cursor, y);
    cursor += partWidth;
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

window.addEventListener("resize", () => {
  if (state.lastPoem) {
    fitPoemText(poemLines, state.lastPoem.language);
    fitPoemText(printLines, state.lastPoem.language);
  }
});

setTheme("ink");
renderHistory();

if (accessToken || !aiEndpoint) {
  accessGate.classList.add("is-hidden");
  if (state.history.length > 0) {
    state.activeId = state.history[0].id;
    renderPoem(state.history[0]);
    renderHistory();
  } else {
    generatePoem();
  }
}
