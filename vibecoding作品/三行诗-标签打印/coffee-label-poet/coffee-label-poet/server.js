const fs = require("fs");
const http = require("http");
const path = require("path");

const rootDir = __dirname;
loadDotEnv();

const isRender = Boolean(process.env.RENDER);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (isRender ? "0.0.0.0" : "127.0.0.1");
const fallbackPorts = isRender
  ? [port]
  : [port, 8787, 8080, 5173].filter((item, index, ports) => ports.indexOf(item) === index);
const accessCode = process.env.ACCESS_CODE || "";
const accessToken = process.env.ACCESS_TOKEN || accessCode;
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const styleInstructions = {
  modern:
    "现代风格：像精品咖啡店杯签，语言干净、克制、有留白。使用杯沿、热气、窗光、街角、纸杯、掌心等日常物象。每一行都要像自然说出的短句，词语搭配准确，不把意象硬拼在一起。",
  classic:
    "古风风格：取清雅意象，如檐影、茶烟、微雨、半窗、竹影。每行优先 5 到 7 个汉字，节奏接近清浅小令。不要假古文，不堆砌生僻字，不使用兮、君、故人等容易显得做作的词。",
  healing:
    "治愈风格：温暖、安定、克制，像有人把杯子递近一点。用小动作表达陪伴，例如慢喝一口、肩膀放低、热气仍在。不要说教，不直接喊加油，不写空泛鼓励。",
  playful:
    "俏皮风格：轻快、有一点小巧思，可以用奶泡、杯盖、吸管、咖啡香。句子仍然要自然顺口，不要为了俏皮写成网络梗、口号或幼稚对白。",
};

const languageInstructions = {
  zh:
    "输出中文三行短诗。每行 5 到 10 个汉字，最多 11 个字符。每行必须是完整、自然、能独立朗读的短句；三行长短尽量均衡，停顿清楚，读起来顺口。优先使用常见词和具体物象，不要倒装硬凑，不要截断句子，不要堆叠形容词。允许少量标点，但不要标题。",
  en:
    "Output a three-line English micro-poem for a 40mm x 30mm label. Each line must be a complete, idiomatic phrase with 2 to 6 words and no more than 36 characters. Keep the rhythm balanced across the three lines. Use simple concrete images and natural word order. Avoid fragments caused by truncation, Chinglish, slogans, ornate diction, and literal translation.",
};

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(request)) {
      sendJson(request, response, 403, { error: "Forbidden origin" });
      return;
    }
    sendJson(request, response, 204, {});
    return;
  }

  if (!isAllowedOrigin(request)) {
    sendJson(request, response, 403, { error: "Forbidden origin" });
    return;
  }

  if (request.url === "/api/access" && request.method === "POST") {
    await handleAccessRequest(request, response);
    return;
  }

  if (request.url === "/api/poem" && request.method === "POST") {
    await handlePoemRequest(request, response);
    return;
  }

  serveStatic(request, response);
});

listenWithFallback(0);

function listenWithFallback(index) {
  const selectedPort = fallbackPorts[index];
  const onListening = () => {
    console.log(`Coffee label poet is running at http://${host}:${selectedPort}`);
  };
  const onError = (error) => {
    server.removeListener("listening", onListening);
    if ((error.code === "EACCES" || error.code === "EADDRINUSE") && index < fallbackPorts.length - 1) {
      console.warn(`Port ${selectedPort} is unavailable, trying ${fallbackPorts[index + 1]}`);
      listenWithFallback(index + 1);
      return;
    }

    throw error;
  };

  server.once("listening", onListening);
  server.once("error", onError);
  server.listen(selectedPort, host);
}

function loadDotEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

async function handleAccessRequest(request, response) {
  if (!accessCode) {
    sendJson(request, response, 200, { ok: true, token: "local-preview" });
    return;
  }

  try {
    const body = await readJson(request);
    if (safeEqual(String(body.code || ""), accessCode)) {
      sendJson(request, response, 200, { ok: true, token: accessToken });
      return;
    }
    sendJson(request, response, 401, { ok: false });
  } catch {
    sendJson(request, response, 400, { ok: false });
  }
}

async function handlePoemRequest(request, response) {
  if (!hasValidAccessToken(request)) {
    sendJson(request, response, 401, { error: "Invalid access token" });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    sendJson(request, response, 500, { error: "Missing DEEPSEEK_API_KEY" });
    return;
  }

  try {
    const body = await readJson(request);
    const nickname = cleanInput(body.nickname, 18);
    const mood = cleanInput(body.mood, 60) || "平静";
    const style = normalizeStyle(body.style);
    const language = normalizeLanguage(body.language);
    const model = normalizeModel(body.model || process.env.DEEPSEEK_MODEL);
    const lines = await callDeepSeek({ apiKey, nickname, mood, style, language, model });
    sendJson(request, response, 200, { lines, model });
  } catch (error) {
    sendJson(request, response, 500, { error: error.message || "Failed to generate poem" });
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

async function callDeepSeek({ apiKey, nickname, mood, style, language, model }) {
  const compactName = nickname.replace(/\s+/g, "");
  const hasNickname = compactName.length > 0;
  let correctiveNote = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const lines = await requestDeepSeekPoem({ apiKey, nickname, mood, style, language, model, correctiveNote, hasNickname });
    const hasDirectName = hasNickname ? containsDirectNickname(lines, compactName) : false;
    const hasSpelledName = hasNickname ? containsSpelledNickname(lines, compactName) : false;
    const hasAllChars = hasNickname ? containsAllNicknameChars(lines, compactName, language) : true;
    const hasOrderedChars = hasNickname && language === "en" ? containsNicknameCharsInOrder(lines, compactName) : true;
    const hasLabelFriendlyLength = linesFitLabel(lines, language);
    const hasSafeOutput = !hasUnsafeOutput(lines);
    if (!hasDirectName && !hasSpelledName && hasAllChars && hasOrderedChars && hasLabelFriendlyLength && hasSafeOutput) {
      return lines;
    }
    correctiveNote = buildCorrectiveNote({ compactName, hasNickname, hasDirectName, hasSpelledName, hasAllChars, hasOrderedChars, hasLabelFriendlyLength, hasSafeOutput, language });
  }

  throw new Error("DeepSeek response did not satisfy coffee label poem rules");
}

async function requestDeepSeekPoem({ apiKey, nickname, mood, style, language, model, correctiveNote, hasNickname }) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: buildPoemSystemPrompt({ style, language, hasNickname }),
        },
        {
          role: "user",
          content: [
            hasNickname ? `昵称：${nickname}` : "昵称：未填写，不需要嵌入任何昵称字符",
            `今日心情：${mood}`,
            `诗歌风格：${style}`,
            `输出语言：${language}`,
            correctiveNote ? `额外修正：${correctiveNote}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0.82,
      max_tokens: 180,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `DeepSeek request failed: ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content || "";
  const parsed = parsePoemContent(content);
  if (parsed.length !== 3) {
    throw new Error("DeepSeek response did not contain exactly three lines");
  }

  return parsed.map((line) => cleanLine(line, language));
}

function buildPoemSystemPrompt({ style, language, hasNickname }) {
  const nicknameRules = hasNickname
    ? [
      "昵称规则非常重要：英文或数字昵称里的每一个字符都必须按原昵称顺序作为彩蛋出现，重复字母也要重复出现。不要把字母单独排成 v i v i a 这种拼写串；要尽量把字母藏进自然英文单词中。禁止连续输出完整昵称，不能把昵称原样连在一起放进诗里。中文昵称里的每一个不同字都必须出现，并避免刻意重复。例如昵称是“小雨”，诗里必须出现“小”和“雨”，但不能出现“小雨”。",
      "中文诗里的昵称字不要呆板地全部放在句首，要自然分散在三行不同位置。英文诗里的昵称字符尽量按昵称原顺序分散出现；普通英文单词可以自然书写，不要为了避开字母而破坏句子，也不要输出独立字母序列。",
    ]
    : [
      "用户没有填写昵称：不要强制嵌入任何昵称字符，不需要制造高亮彩蛋；只根据心情、语言和风格写三行诗。",
    ];

  return [
    "你是精品咖啡店的杯签诗人。只输出 JSON，不要解释。",
    "JSON 格式必须是 {\"lines\":[\"第一行\",\"第二行\",\"第三行\"]}。",
    "这首诗要被打印在 40mm x 30mm 的咖啡杯标签上，所以必须短、好读、有记忆点。",
    "内容结构必须清楚：第一行写一个可见的具体物象或场景；第二行把物象轻轻转到用户心情；第三行给出正向收束，可以是一个动作、一个呼吸、一个安定的感觉。",
    "质量要求：不要晦涩复杂；要有内涵但一眼能懂。用具体物象承载情绪，不直接解释情绪。每一行都必须语义完整，不能像被截断的半句话。三行之间要有自然推进，不要只是三个互不相关的意象。",
    "音律与朗读要求：写完后默读一遍。中文要注意字数均衡、停顿自然、声调有起伏，避免连续重复相同词尾或大量助词；英文要注意自然重音和短语节奏。宁可简单，也不要生硬。",
    "改写自检：如果某一句在日常语言里不会这样说，立刻换成更自然的表达；如果为了塞入昵称字符导致语法或语义别扭，重新选择词语，不要硬塞。",
    "避免项：不要写鸡汤、营销文案、宏大叙事、复杂典故、空泛形容词；少用“星河、远方、宇宙、命运、温柔、光”等高频词，除非昵称或心情确实需要。",
    "中文自检：避免“轻雨轻停住”“人心慢得一寸”这类搭配别扭的句子；优先写“雨声停在杯沿”“心慢慢坐稳”这类自然中文。",
    "英文自检：避免为了嵌入昵称字母而破坏语法；每一行都应该像自然英文短诗，而不是单词列表或字母游戏。",
    ...nicknameRules,
    "整体基调必须正面。如果用户情绪负面，要用鼓励、陪伴、安定的方式回应，不要加重负面情绪。",
    "负面情绪的处理方式：不要说“别难过”“加油”“你会好的”；改写成具体而小的安定动作，例如慢喝一口、肩膀放低、杯子仍暖、窗边有风。",
    "第三行必须落在稳定、舒展或轻快的感觉上。不要用“沉下去、坠落、熄灭、空掉、冷下来、困住”等向下或消极意象收尾。",
    styleInstructions[style],
    languageInstructions[language],
    "内容安全硬性规则：不得包含极端、沉重、政治、色情、歧视、暴力、自伤、自毁、恐吓、仇恨或刺激性词语；不得出现政党、选举、战争、死亡等方向的表达。",
  ].join("\n");
}

function parsePoemContent(content) {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data.lines)) {
      return data.lines.map((line) => String(line).trim()).filter(Boolean).slice(0, 3);
    }
  } catch {
    return content
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.、\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return [];
}

function containsDirectNickname(lines, compactName) {
  if (!compactName || compactName.length < 2) {
    return false;
  }
  return lines.join("").toLowerCase().includes(compactName.toLowerCase());
}

function containsSpelledNickname(lines, compactName) {
  if (!compactName || compactName.length < 3) {
    return false;
  }
  const pattern = Array.from(compactName)
    .map((char) => escapeRegExp(char.toLowerCase()))
    .join("[\\s,，.。;；:：'\"-]+");
  return new RegExp(pattern, "i").test(lines.join(" "));
}

function containsAllNicknameChars(lines, compactName, language) {
  const poem = lines.join("").toLowerCase();
  const chars = language === "en"
    ? Array.from(compactName.toLowerCase())
    : [...new Set(Array.from(compactName.toLowerCase()))];
  return chars.every((char) => poem.includes(char));
}

function containsNicknameCharsInOrder(lines, compactName) {
  const poem = lines.join("").toLowerCase();
  const chars = Array.from(compactName.toLowerCase());
  let cursor = -1;
  return chars.every((char) => {
    const index = poem.indexOf(char, cursor + 1);
    if (index === -1) {
      return false;
    }
    cursor = index;
    return true;
  });
}

function hasUnsafeOutput(lines) {
  const text = lines.join(" ").toLowerCase();
  const unsafePattern = /政治|政党|选举|政府|领导人|战争|暴力|血腥|色情|性暗示|歧视|仇恨|恐吓|极端|自杀|自伤|自毁|死亡|绝望|崩溃|抑郁|沮丧|难过|焦虑|疲惫|沉重|坠落|熄灭|困住|空掉|冷下来|kill|death|dead|suicide|self-harm|violence|war|sex|porn|hate|terror|despair|depressed|anxious/i;
  return unsafePattern.test(text) || hasNegativeEnding(lines);
}

function hasNegativeEnding(lines) {
  const ending = String(lines[lines.length - 1] || "").trim().toLowerCase();
  return /沉下去|坠落|熄灭|空掉|冷下来|困住|撑不住|停不下|despair|falls?|sinks?|dark|cold|trapped|lost$/.test(ending);
}

function buildCorrectiveNote({ compactName, hasNickname, hasDirectName, hasSpelledName, hasAllChars, hasOrderedChars, hasLabelFriendlyLength, hasSafeOutput, language }) {
  const parts = [];
  if (hasNickname) {
    if (hasDirectName) {
      parts.push(`不能连续出现完整昵称“${compactName}”`);
    }
    if (hasSpelledName) {
      parts.push(`不能把昵称写成空格分隔的字母串，例如 ${Array.from(compactName).join(" ")}`);
    }
    if (!hasAllChars) {
      parts.push(`必须让昵称“${compactName}”里的每一个不同字或字符都出现`);
    }
    if (language === "en" && !hasOrderedChars) {
      parts.push("英文诗里的昵称字符要尽量按昵称原顺序出现");
    }
  } else {
    parts.push("用户没有填写昵称，不需要嵌入昵称字符，也不要制造任何昵称彩蛋");
  }
  if (!hasLabelFriendlyLength) {
    parts.push(language === "en"
      ? "每行必须控制在 2 到 6 个单词且不超过 36 个字符，保持完整短语，不要截断"
      : "每行必须控制在 5 到 10 个汉字，最多 11 个字符，保持完整短句，不要截断");
  }
  if (!hasSafeOutput) {
    parts.push("不得包含极端、沉重、政治、色情、歧视、暴力、自伤、自毁、恐吓或明显负向收尾；整体必须正向、安定、鼓励");
  }
  const nicknameInstruction = hasNickname
    ? "；拆开昵称字符自然分散放入诗中，中文诗不要全部放句首"
    : "；不要补写昵称或昵称彩蛋";
  return `上一次结果不符合杯签规则：${parts.join("；")}。请重新生成，确保三行短、完整、顺口${nicknameInstruction}。`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeStyle(value) {
  return Object.keys(styleInstructions).includes(value) ? value : "modern";
}

function normalizeLanguage(value) {
  return value === "en" ? "en" : "zh";
}

function normalizeModel(value) {
  return value === "deepseek-v4-pro" ? "deepseek-v4-pro" : "deepseek-v4-flash";
}

function linesFitLabel(lines, language) {
  return lines.every((line) => {
    const text = String(line || "").trim();
    if (language === "en") {
      const words = text.split(/\s+/).filter(Boolean);
      return text.length <= 36 && words.length >= 2 && words.length <= 6;
    }
    const length = Array.from(text).length;
    return length >= 5 && length <= 11;
  });
}

function cleanInput(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanLine(value, language) {
  const maxLength = language === "en" ? 120 : 48;
  return cleanInput(value, maxLength);
}

function parseAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin || allowedOrigins.length === 0) {
    return true;
  }
  return allowedOrigins.includes(origin);
}

function hasValidAccessToken(request) {
  if (!accessCode) {
    return true;
  }
  const token = request.headers["x-access-token"];
  return safeEqual(String(token || ""), accessToken);
}

function safeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function sendJson(request, response, status, payload) {
  const origin = request.headers.origin;
  const allowOrigin = origin && isAllowedOrigin(request) ? origin : "*";
  response.writeHead(status, {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Access-Token",
    "Content-Type": "application/json; charset=utf-8",
  });

  if (status === 204) {
    response.end();
    return;
  }

  response.end(JSON.stringify(payload));
}
