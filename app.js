/* 
  ops-dispatch-app (Enhanced)
  - OCR (Tesseract.js) مضبوط تلقائيًا للصور المظلمة + يدعم لصق الصور (Ctrl+V)
  - قص اختياري (زر "قص الصورة")
  - لوحة توزيع (سحب وإفلات): لوس / ساندي / بوليتو / خارج الخدمة / الأرشيف
  - حالة + موقع لكل بطاقة (مع ألوان)
  - النتيجة النهائية تظهر في مربع قابل للتعديل
*/

const $ = (id) => document.getElementById(id);

let IS_TOUCH = false;
function refreshTouchMode(){
  IS_TOUCH = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || window.innerWidth < 860;
  document.documentElement.classList.toggle("touch", !!IS_TOUCH);
}
window.addEventListener("resize", () => { try{ refreshTouchMode(); }catch{} });
refreshTouchMode();


// ---------- Elements ----------
const introEl = $("intro");
const introNamesEl = $("introNames");

const imageInput = $("imageInput");
const pasteZone = $("pasteZone");
const imgThumb = $("imgThumb");
const imgHint = $("imgHint");

const btnPickImage = $("btnPickImage");

const btnToggleCrop = $("btnToggleCrop");
const cropWrap = $("cropWrap");
const cropCanvas = $("cropCanvas");
const cropMeta = $("cropMeta");
const btnApplyCrop = $("btnApplyCrop");
const btnResetCrop = $("btnResetCrop");
const btnFitCrop = $("btnFitCrop");

const btnRunOcr = $("btnRunOcr");
const btnClearExtract = $("btnClearExtract");
const ocrStatus = $("ocrStatus");

const progCircle = $("progCircle");
const progInner = $("progInner");
const progText = $("progText");

const extractedListEl = $("extractedList");
const btnAddExtracted = $("btnAddExtracted");
const btnAddSelected = $("btnAddSelected");

const receiverEl = $("receiver");
const deputyEl = $("deputy");
const useHospitalsEl = $("useHospitals");

const openSwitch = $("openSwitch");
const openLabel = $("openLabel");
const closedFields = $("closedFields");
const closedByEl = $("closedBy");
const closedNoteEl = $("closedNote");

const btnCopy = $("btnCopy");
const btnReset = $("btnReset");

const countFieldEl = $("countField");
const countOffEl = $("countOff");
const finalTextEl = $("finalText");

const btnAddNewRow = $("btnAddNewRow");

const kanbanEl = $("kanban");

const editOverlay = $("editOverlay");
const btnCloseEdit = $("btnCloseEdit");
const editTitleEl = $("editTitle");
const editNameEl = $("editName");
const editCodeEl = $("editCode");
const editHospEl = $("editHosp");
const editStatusEl = $("editStatus");
const editRegionEl = $("editRegion");
const btnSaveEdit = $("btnSaveEdit");
const btnDeleteUnit = $("btnDeleteUnit");

const toast = $("toast");

const btnHelp = $("btnHelp");

const tourOverlay = $("tourOverlay");
const tourHighlight = $("tourHighlight");
const tourTooltip = $("tourTooltip");
const tourStepEl = $("tourStep");
const tourTitleEl = $("tourTitle");
const tourBodyEl = $("tourBody");
const tourNextBtn = $("tourNext");
const tourSkipStepBtn = $("tourSkipStep");
const tourSkipAllBtn = $("tourSkipAll");
const tourCloseBtn = $("tourClose");


// ---------- Constants ----------
const HOSPITALS = [
  { key: "los", label: "🏥 مستشفى لوس" },
  { key: "sandy", label: "🏥 مستشفى ساندي" },
  { key: "polito", label: "🏥 مستشفى بوليتو" },
  { key: "off", label: "⛔ خارج الخدمة" },
  { key: "archive", label: "🗄️ الأرشيف" },
];

const FIELD_HOSP_KEYS = ["los", "sandy", "polito"];

const STATUS = [
  "في الخدمة",
  "مشغول",
  "مشغول - اختبار",
  "مشغول - تدريب",
  "اجازة",
  "طلب غفوة",
];

const REGION = ["", "الشمال", "الجنوب", "الغرب", "الشرق"];

// أسماء تظهر عشوائيًا في انترو البداية
const INTRO_NAMES = [
  "بخيت مبخوت",
  "غيث كايتو",
  "غيد كايتو",
  "ثامر سامي",
  "قصي حمد",
  "سنمار بدر",
  "محمد تبر",
  "شيرو هاروتو",
  "مناحي نواف",
  "سياف الاعور",
  "وليد حرب",
  "وليد المعاوي",
  "دنيا هتان",
  "عمر يوسف",
  "فراس عسيري",
  "عبدالوهاب المسعود",
  "عبدالله زمان",
  "فهد الاحمد",
  "عمر المطيري",
  "سعيد اكرم",
  "حسين احمد",
  "عبدالله السالمي",
];

const STATUS_CLASS = (s) => {
  switch (s) {
    case "في الخدمة": return "green";
    case "مشغول": return "orange";
    case "مشغول - اختبار": return "yellow";
    case "مشغول - تدريب": return "purple";
    case "اجازة": return "blue";
    case "طلب غفوة": return "teal";
    default: return "gray";
  }
};

// ---------- State ----------
let units = [];
let isOpen = true;  // مفتوح/مغلق
let editId = null;
let editMode = "edit"; // edit | add

// OCR image state
let ocrFileName = "";
let cropCtx = cropCanvas ? cropCanvas.getContext("2d", { willReadFrequently: true }) : null;
let cropImg = null;      // Image()
let cropScale = 1;
let cropDrawW = 0;
let cropDrawH = 0;
let cropDrawX = 0;
let cropDrawY = 0;
let cropRect = null;     // {x,y,w,h} in canvas coords
let ocrSourceDataUrl = null; // when crop applied

// ---------- Helpers ----------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2100);
}

function setProgress(p) {
  const clamped = Math.max(0, Math.min(100, Math.round(p)));
  progInner.textContent = clamped + "%";
  const deg = clamped * 3.6;
  progCircle.style.background = `conic-gradient(var(--accent) ${deg}deg, rgba(255,255,255,.10) 0deg)`;
}

function updateImgPreview(fileOrBlob, name) {
  const url = URL.createObjectURL(fileOrBlob);
  imgThumb.src = url;
  imgThumb.style.display = "block";
  imgHint.textContent = name ? `تم اختيار صورة: ${name}` : "تم اختيار صورة.";
  pasteZone.classList.add("ok");
  // revoke later
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function normalizeCode(codeRaw) {
  const raw = (codeRaw || "").toString().trim().toUpperCase();
  if (!raw) return "";
  // keep letters+digits+hyphen
  const cleaned = raw.replace(/[^A-Z0-9-]/g, "");
  const m = cleaned.match(/^([A-Z]{1,3})-?(\d{1,3})$/);
  if (m) return `${m[1]}-${m[2]}`;
  return cleaned;
}

function cleanOcrLine(line) {
  return (line || "")
    .replace(/[|]+/g, " ")
    .replace(/[!@#$%^&*()_+=\[\]{};:"\\|<>\/?~`،؛…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLineToNameCode(line) {
  const s = cleanOcrLine(line);

  if (!s) return null;

  // Find a code anywhere in the line (prefer last match)
  const codeMatches = s.match(/([A-Za-z]{1,3})\s*[-–]?\s*(\d{1,3})/g);
  let code = "";
  if (codeMatches && codeMatches.length) {
    const last = codeMatches[codeMatches.length - 1];
    const mm = last.match(/([A-Za-z]{1,3})\s*[-–]?\s*(\d{1,3})/);
    if (mm) code = normalizeCode(mm[1] + "-" + mm[2]);
  }

  // Remove code fragments and leftover digits/symbols; keep Arabic + Latin letters
  let namePart = s;
  namePart = namePart.replace(/([A-Za-z]{1,3})\s*[-–]?\s*(\d{1,3})/g, " ");
  namePart = namePart.replace(/\d+/g, " ");
  namePart = namePart.replace(/[^\u0600-\u06FF A-Za-z]/g, " ");
  namePart = namePart.replace(/\s+/g, " ").trim();

  // Filter super short garbage
  if (!namePart || namePart.length < 2) return null;

  return { name: namePart, code };
}

function formatUnitLine(u) {
  const name = (u.name || "").trim() || "—";
  const code = (u.code || "").trim() || "—";
  const region = (u.region || "").trim();
  const status = (u.status || "").trim();

  const regionPart = region ? ` ( ${region} )` : "";
  const statusPart =
    status && status !== "في الخدمة"
      ? (region ? ` - ( ${status} )` : ` ( ${status} )`)
      : "";

  return `${name} | ${code}${regionPart}${statusPart}`.trim();
}

function isSameNameCode(a, b) {
  return (a || "").trim() === (b || "").trim();
}

function parseNameCodeField(val) {
  const v = (val || "").trim();
  if (!v) return null;
  // allow "name | code" or "name code"
  if (v.includes("|")) {
    const [n, c] = v.split("|").map(x => (x || "").trim());
    return { name: n || "", code: normalizeCode(c || "") };
  }
  const maybe = parseLineToNameCode(v);
  if (maybe) return { name: maybe.name, code: maybe.code };
  return { name: v, code: "" };
}

// ---------- Cropper ----------
function updateCropMeta(text) {
  cropMeta.textContent = text;
}

function openCropper(open) {
  if (!cropWrap) return;
  cropWrap.classList.toggle("open", !!open);
}

function fitCropper() {
  if (!cropCanvas || !cropCtx) return;

  const maxW = cropWrap ? cropWrap.clientWidth : 800;
  const pad = 24;
  const w = Math.max(260, Math.min(980, maxW - pad));
  cropCanvas.width = Math.round(w);
  cropCanvas.height = Math.round(w * 0.62);

  if (!cropImg) {
    drawCropper();
    return;
  }

  const sx = cropCanvas.width / cropImg.width;
  const sy = cropCanvas.height / cropImg.height;
  cropScale = Math.min(sx, sy);
  cropDrawW = Math.round(cropImg.width * cropScale);
  cropDrawH = Math.round(cropImg.height * cropScale);
  cropDrawX = Math.round((cropCanvas.width - cropDrawW) / 2);
  cropDrawY = Math.round((cropCanvas.height - cropDrawH) / 2);

  cropRect = null;
  ocrSourceDataUrl = null;
  drawCropper();
  updateCropMeta("اسحب لتحديد مستطيل حول القائمة فقط، ثم اضغط (تطبيق القص).");
}

function drawCropper() {
  if (!cropCanvas || !cropCtx) return;

  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.fillStyle = "rgba(0,0,0,0.18)";
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  if (!cropImg) {
    cropCtx.fillStyle = "rgba(255,255,255,0.65)";
    cropCtx.font = "14px system-ui";
    cropCtx.textAlign = "center";
    cropCtx.fillText("اختر صورة لعرضها هنا", cropCanvas.width / 2, cropCanvas.height / 2);
    return;
  }

  cropCtx.drawImage(cropImg, cropDrawX, cropDrawY, cropDrawW, cropDrawH);

  // Dark overlay outside rect
  if (cropRect) {
    const { x, y, w, h } = cropRect;
    cropCtx.save();
    cropCtx.fillStyle = "rgba(0,0,0,0.45)";
    cropCtx.beginPath();
    cropCtx.rect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.rect(x, y, w, h);
    cropCtx.fill("evenodd");
    cropCtx.restore();

    // Border
    cropCtx.save();
    cropCtx.strokeStyle = "rgba(94,234,212,0.90)";
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    cropCtx.restore();
  } else {
    // hint border
    cropCtx.save();
    cropCtx.strokeStyle = "rgba(255,255,255,0.12)";
    cropCtx.setLineDash([6, 6]);
    cropCtx.strokeRect(cropDrawX + 6, cropDrawY + 6, cropDrawW - 12, cropDrawH - 12);
    cropCtx.restore();
  }
}

function applyCropForOcr() {
  if (!cropImg || !cropRect) {
    ocrSourceDataUrl = null;
    updateCropMeta("لم يتم تطبيق قص (لا يوجد تحديد).");
    showToast("حدد مستطيل ثم طبق القص");
    return;
  }

  // Map cropRect from canvas coords -> original image coords
  const rx = cropRect.x - cropDrawX;
  const ry = cropRect.y - cropDrawY;
  const rScaleX = cropImg.width / cropDrawW;
  const rScaleY = cropImg.height / cropDrawH;

  const ox = Math.max(0, Math.round(rx * rScaleX));
  const oy = Math.max(0, Math.round(ry * rScaleY));
  const ow = Math.max(1, Math.round(cropRect.w * rScaleX));
  const oh = Math.max(1, Math.round(cropRect.h * rScaleY));

  const off = document.createElement("canvas");
  off.width = ow;
  off.height = oh;
  const offCtx = off.getContext("2d", { willReadFrequently: true });
  offCtx.drawImage(cropImg, ox, oy, ow, oh, 0, 0, ow, oh);
  ocrSourceDataUrl = off.toDataURL("image/png");

  updateCropMeta("تم تطبيق القص ✅");
  showToast("تم تطبيق القص");
}

function resetCrop() {
  cropRect = null;
  ocrSourceDataUrl = null;
  drawCropper();
  updateCropMeta("تم تصفير القص.");
  showToast("تم تصفير القص");
}

// Mouse events for crop selection
let isDragging = false;
let dragStart = null;

function getMousePos(evt) {
  const r = cropCanvas.getBoundingClientRect();
  const x = evt.clientX - r.left;
  const y = evt.clientY - r.top;
  return { x, y };
}

function clampRectToImage(x, y, w, h) {
  // Clamp inside drawn image area
  const ix = cropDrawX;
  const iy = cropDrawY;
  const iw = cropDrawW;
  const ih = cropDrawH;

  const nx = Math.max(ix, Math.min(ix + iw, x));
  const ny = Math.max(iy, Math.min(iy + ih, y));
  const nx2 = Math.max(ix, Math.min(ix + iw, x + w));
  const ny2 = Math.max(iy, Math.min(iy + ih, y + h));

  const rx = Math.min(nx, nx2);
  const ry = Math.min(ny, ny2);
  const rw = Math.abs(nx2 - nx);
  const rh = Math.abs(ny2 - ny);

  return { x: rx, y: ry, w: Math.max(1, rw), h: Math.max(1, rh) };
}

// ---------- OCR Preprocess ----------
function preprocessCanvas(ctx, w, h) {
  // Strong preprocessing for dark UI screenshots:
  // - grayscale
  // - auto-invert if background is dark
  // - Otsu threshold
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // grayscale + compute mean
  const gray = new Uint8ClampedArray(w * h);
  let sum = 0;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const y = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    gray[j] = y;
    sum += y;
  }
  const mean = sum / gray.length;

  // invert if too dark
  const shouldInvert = mean < 110;
  if (shouldInvert) {
    for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i];
  }

  // histogram
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  // Otsu threshold
  const total = gray.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 160;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  // apply threshold -> black text on white background
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = gray[j] > threshold ? 255 : 0;
    // keep black text: if v=0 means black; background white
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- OCR Runner ----------
async function runOcr() {
  if (!cropImg) throw new Error("اختر صورة أولاً");

  extractedListEl.value = "";
  setProgress(0);
  progText.textContent = "—";
  ocrStatus.textContent = "جاري التحضير...";

  // Prepare source image on a canvas
  const img = cropImg;
  const maxW = 2200;
  const scale = Math.min(1, maxW / img.width);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (ocrSourceDataUrl) {
    // already cropped - load into img2
    const img2 = await dataUrlToImage(ocrSourceDataUrl);
    const s2 = Math.min(1, maxW / img2.width);
    canvas.width = Math.round(img2.width * s2);
    canvas.height = Math.round(img2.height * s2);
    ctx.drawImage(img2, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  preprocessCanvas(ctx, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/png");

  ocrStatus.textContent = "OCR: جاري البدء...";
  progText.textContent = "يتم التحليل...";

  // Tesseract
  const lang = "ara+eng"; // تلقائي دائمًا
  const worker = await Tesseract.createWorker(lang, 1, {
    logger: (m) => {
      if (m && m.status) {
        ocrStatus.textContent = `OCR: ${m.status}`;
        progText.textContent = m.status;
      }
      if (m && typeof m.progress === "number") {
        setProgress(m.progress * 100);
      }
    },
  });

  try {
    // Tune parameters
    try {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
        tessedit_pageseg_mode: "6",
      });
    } catch { /* ignore */ }

    const { data } = await worker.recognize(dataUrl);
    const text = (data && data.text) ? data.text : "";

    const parsed = extractNameCodeList(text);
    extractedListEl.value = parsed.map(x => `${x.name} | ${x.code || "—"}`).join("\n");

    if (parsed.length) {
      ocrStatus.textContent = `تم استخراج ${parsed.length} سطر ✅`;
      showToast(`تم استخراج ${parsed.length} سطر`);
    } else {
      ocrStatus.textContent = "تمت القراءة، لكن لم يتم استخراج أسطر واضحة. جرّب قص أدق حول القائمة.";
      showToast("جرّب قص أدق حول القائمة");
    }

    setProgress(100);
  } finally {
    await worker.terminate();
  }
}

function extractNameCodeList(text) {
  const lines = (text || "").split(/\r?\n/).map(cleanOcrLine).filter(Boolean);
  const out = [];
  const seen = new Set();

  for (const line of lines) {
    const item = parseLineToNameCode(line);
    if (!item) continue;

    const name = item.name.trim();
    const code = (item.code || "").trim();

    // basic filter to reduce UI noise: must have at least 2 letters (arabic or latin)
    const lettersCount = (name.match(/[\u0600-\u06FF]/g) || []).length + (name.match(/[A-Za-z]/g) || []).length;
    if (lettersCount < 2) continue;

    const key = (name + "|" + code).trim();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ name, code });
  }

  return out;
}

function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// ---------- Units ----------
function addUnit(u) {
  const name = (u.name || "").trim();
  if (!name) return;
  const unit = {
    id: uid(),
    name,
    code: normalizeCode(u.code || ""),
    hospitalKey: u.hospitalKey || "los",
    status: u.status || "في الخدمة",
    region: u.region || "",
  };
  units.push(unit);
}

function removeUnit(id) {
  units = units.filter(x => x.id !== id);
}

function getHospitalLabel(key) {
  const h = HOSPITALS.find(x => x.key === key);
  return h ? h.label : key;
}

// ---------- Render ----------
function renderKanban() {
  kanbanEl.innerHTML = "";

  for (const h of HOSPITALS) {
    const col = document.createElement("div");
    col.className = "col";
    col.dataset.hospital = h.key;

    const head = document.createElement("div");
    head.className = "colHead";
    const count = units.filter(u => u.hospitalKey === h.key).length;
    head.innerHTML = `<b>${h.label}</b><span class="mini">${count}</span>`;
    col.appendChild(head);

    const body = document.createElement("div");
    body.className = "colBody";
    if (!IS_TOUCH) {
      body.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("dropActive");
      });
      body.addEventListener("dragleave", () => col.classList.remove("dropActive"));
      body.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("dropActive");
        const id = e.dataTransfer.getData("text/plain");
        const u = units.find(x => x.id === id);
        if (!u) return;
        u.hospitalKey = h.key;
        renderAll();
      });
    }

    const list = units.filter(u => u.hospitalKey === h.key);
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "—";
      body.appendChild(empty);
    } else {
      for (const u of list) {
        const card = document.createElement("div");
        card.className = "unitCard";
        if (!IS_TOUCH) {
          card.draggable = true;
          card.addEventListener("dragstart", (ev) => {
            ev.dataTransfer.setData("text/plain", u.id);
            ev.dataTransfer.effectAllowed = "move";
          });
        } else {
          card.draggable = false;
        }

        const line = document.createElement("div");
        line.className = "unitTop";
        const txt = document.createElement("div");
        txt.className = "unitLine";
        txt.innerHTML = `${escapeHtml(u.name)} <span>|</span> ${escapeHtml(u.code || "—")}`;

        const btns = document.createElement("div");
        btns.className = "unitBtns";
        const btnEdit = document.createElement("button");
        btnEdit.className = "iconBtn";
        btnEdit.textContent = "✎";
        btnEdit.title = "تعديل";
        btnEdit.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openEdit(u.id);
        });
        btns.appendChild(btnEdit);

        line.appendChild(txt);
        line.appendChild(btns);

        const meta = document.createElement("div");
        meta.className = "unitMeta";

        // region badge
        if (u.region) {
          const b = document.createElement("span");
          b.className = "badge dot gray";
          b.textContent = u.region;
          meta.appendChild(b);
        } else {
          const b = document.createElement("span");
          b.className = "badge muted";
          b.textContent = "بدون موقع";
          meta.appendChild(b);
        }

        // status badge
        const s = document.createElement("span");
        s.className = `badge dot ${STATUS_CLASS(u.status)}`;
        s.textContent = u.status || "في الخدمة";
        meta.appendChild(s);

        card.appendChild(line);
        card.appendChild(meta);
        // Mobile quick-move buttons (touch devices)
        if (IS_TOUCH) {
          const move = document.createElement("div");
          move.className = "moveBar";
          const targets = [
            { key: "los", t: "لوس" },
            { key: "sandy", t: "ساندي" },
            { key: "polito", t: "بوليتو" },
            { key: "off", t: "خارج" },
            { key: "archive", t: "أرشيف" },
          ];
          for (const tg of targets) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "moveBtn";
            b.textContent = tg.t;
            b.addEventListener("click", (ev) => {
              ev.stopPropagation();
              u.hospitalKey = tg.key;
              renderAll();
            });
            move.appendChild(b);
          }
          card.appendChild(move);
        }
        body.appendChild(card);
      }
    }

    col.appendChild(body);
    kanbanEl.appendChild(col);
  }
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function computeCounts() {
  // Units: in-field = hospital in los/sandy/polito (exclude archive)
  const fieldUnits = units.filter(u => FIELD_HOSP_KEYS.includes(u.hospitalKey));
  const offUnits = units.filter(u => u.hospitalKey === "off");

  // Add receiver/deputy into field count (dedupe by exact "name|code")
  const seen = new Set(fieldUnits.map(u => `${u.name}|${u.code}`));

  const rec = parseNameCodeField(receiverEl.value);
  if (rec && (rec.name || rec.code)) {
    const k = `${rec.name}|${normalizeCode(rec.code)}`;
    if (!seen.has(k)) seen.add(k);
  }
  const dep = parseNameCodeField(deputyEl.value);
  if (dep && (dep.name || dep.code)) {
    const k = `${dep.name}|${normalizeCode(dep.code)}`;
    if (!seen.has(k)) seen.add(k);
  }

  return { fieldCount: seen.size, offCount: offUnits.length };
}

function buildReportText() {
  // Closed mode
  if (!isOpen) {
    const by = (closedByEl.value || "").trim() || "[اسم الشخص]";
    const note = (closedNoteEl.value || "").trim() || "[مثل: تسجيل خروج مؤقت]";
    const text =
`سجل العمليات

تم تسجيل خروج آخر وحدة إسعافية من الميدان، ولا توجد حالياً أي وحدات في الخدمة.

تم التسجيل بواسطة: ${by}

ملاحظات: ${note}`.trim();
    return text;
  }

  const receiver = (receiverEl.value || "").trim() || "-";
  const deputy = (deputyEl.value || "").trim() || "-";

  const fieldUnits = units.filter(u => FIELD_HOSP_KEYS.includes(u.hospitalKey));
  const offUnits = units.filter(u => u.hospitalKey === "off");

  // Dedupe count includes receiver/deputy
  const counts = computeCounts();

  const notes = "تحديث";

  const useHosp = useHospitalsEl.value === "yes";

  if (!useHosp) {
    const fieldList = fieldUnits.length ? fieldUnits.map(formatUnitLine).join("\n") : "—";
    const offList = offUnits.length ? offUnits.map(formatUnitLine).join("\n") : "—";

    return (
`📌 استلام العمليات 📌

المستلم : ${receiver}

النائب : ${deputy}

عدد و اسماء الوحدات الاسعافيه في الميدان :{${counts.fieldCount}}
${fieldList}

خارج الخدمة : (${counts.offCount})
${offList}

🎙️ تم استلام العمليات و جاهزون للتعامل مع البلاغات

الملاحظات : ${notes}`
    ).trim();
  }

  // With hospitals
  const lines = [];
  lines.push("📌 استلام العمليات 📌");
  lines.push("");
  lines.push(`المستلم : ${receiver}`);
  lines.push("");
  lines.push(`النائب : ${deputy}`);
  lines.push("");
  lines.push(`عدد و اسماء الوحدات الاسعافيه في الميدان :{${counts.fieldCount}}`);
  lines.push("");

  for (const hk of FIELD_HOSP_KEYS) {
    const hLabel = getHospitalLabel(hk);
    lines.push(hLabel);
    const list = fieldUnits.filter(u => u.hospitalKey === hk);
    if (list.length) {
      lines.push(list.map(formatUnitLine).join("\n"));
    } else {
      lines.push("—");
    }
    lines.push("");
  }

  lines.push(`خارج الخدمة : (${counts.offCount})`);
  if (offUnits.length) lines.push(offUnits.map(formatUnitLine).join("\n"));
  else lines.push("—");
  lines.push("");
  lines.push("🎙️ تم استلام العمليات و جاهزون للتعامل مع البلاغات");
  lines.push("");
  lines.push(`الملاحظات : ${notes}`);

  return lines.join("\n").trim();
}

function updateFinalPreview() {
  finalTextEl.value = buildReportText();
}

function renderCounts() {
  const c = computeCounts();
  countFieldEl.textContent = String(c.fieldCount);
  countOffEl.textContent = String(c.offCount);
}

function renderAll() {
  renderKanban();
  renderCounts();
  updateFinalPreview();
}

// ---------- Edit modal ----------
function fillSelect(el, values, selected) {
  el.innerHTML = "";
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v || "بدون";
    if (v === selected) opt.selected = true;
    el.appendChild(opt);
  }
}
function fillHospitalSelect(el, selectedKey) {
  el.innerHTML = "";
  for (const h of HOSPITALS) {
    const opt = document.createElement("option");
    opt.value = h.key;
    opt.textContent = h.label;
    if (h.key === selectedKey) opt.selected = true;
    el.appendChild(opt);
  }
}

function openEdit(id) {
  const u = units.find(x => x.id === id);
  if (!u) return;
  editMode = "edit";
  editId = id;

  if (editTitleEl) editTitleEl.textContent = "تعديل البطاقة";
  btnDeleteUnit.style.display = "inline-flex";

  editNameEl.value = u.name || "";
  editCodeEl.value = u.code || "";

  fillHospitalSelect(editHospEl, u.hospitalKey);
  fillSelect(editStatusEl, STATUS, u.status);
  fillSelect(editRegionEl, REGION, u.region);

  editOverlay.style.display = "flex";
}

function openAddNew() {
  editMode = "add";
  editId = null;

  if (editTitleEl) editTitleEl.textContent = "إضافة سطر جديد";
  btnDeleteUnit.style.display = "none";

  editNameEl.value = "";
  editCodeEl.value = "";
  fillHospitalSelect(editHospEl, "los");
  fillSelect(editStatusEl, STATUS, "في الخدمة");
  fillSelect(editRegionEl, REGION, "");

  editOverlay.style.display = "flex";
}

function closeEdit() {
  editId = null;
  editMode = "edit";
  editOverlay.style.display = "none";
}

// ---------- Events ----------
imageInput.addEventListener("change", async () => {
  const f = imageInput.files && imageInput.files[0];
  if (!f) return;
  ocrFileName = f.name || "";
  updateImgPreview(f, ocrFileName);

  cropImg = await fileToImage(f);
  fitCropper();
  ocrSourceDataUrl = null;
});

btnPickImage.addEventListener("click", () => {
  imageInput.click();
});

btnAddNewRow.addEventListener("click", () => {
  openAddNew();
});

document.addEventListener("paste", async (e) => {
  const items = e.clipboardData && e.clipboardData.items ? Array.from(e.clipboardData.items) : [];
  const imgItem = items.find(it => it.type && it.type.startsWith("image/"));
  if (!imgItem) return;

  const blob = imgItem.getAsFile();
  if (!blob) return;

  ocrFileName = "pasted-image.png";
  updateImgPreview(blob, "صورة ملصوقة (Ctrl+V)");

  cropImg = await fileToImage(blob);
  fitCropper();
  ocrSourceDataUrl = null;

  showToast("تم لصق الصورة ✅");
});

btnToggleCrop.addEventListener("click", () => {
  const open = !cropWrap.classList.contains("open");
  openCropper(open);
  if (open) fitCropper();
});

btnFitCrop.addEventListener("click", fitCropper);
btnResetCrop.addEventListener("click", resetCrop);
btnApplyCrop.addEventListener("click", applyCropForOcr);

if (cropCanvas) {
  cropCanvas.addEventListener("mousedown", (e) => {
    if (!cropImg) return;
    isDragging = true;
    dragStart = getMousePos(e);
    cropRect = { x: dragStart.x, y: dragStart.y, w: 1, h: 1 };
    drawCropper();
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging || !cropImg) return;
    const pos = getMousePos(e);
    const w = pos.x - dragStart.x;
    const h = pos.y - dragStart.y;
    const rect = clampRectToImage(dragStart.x, dragStart.y, w, h);
    cropRect = rect;
    drawCropper();
  });
  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
  });
}

btnRunOcr.addEventListener("click", async () => {
  try {
    await runOcr();
  } catch (e) {
    console.error(e);
    ocrStatus.textContent = "خطأ: " + (e && e.message ? e.message : "غير معروف");
    showToast("فشل OCR");
  }
});

btnClearExtract.addEventListener("click", () => {
  extractedListEl.value = "";
  showToast("تم مسح قائمة OCR");
});

btnAddExtracted.addEventListener("click", () => {
  const lines = (extractedListEl.value || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) {
    showToast("لا يوجد أسطر لإضافتها");
    return;
  }
  for (const line of lines) {
    const parts = line.split("|").map(x => (x || "").trim());
    const name = parts[0] || "";
    const code = normalizeCode(parts[1] || "");
    if (!name) continue;
    addUnit({ name, code, hospitalKey: "los", status: "في الخدمة", region: "" });
  }
  renderAll();
  showToast("تمت الإضافة للوحة ✅");
});

btnAddSelected.addEventListener("click", () => {
  const ta = extractedListEl;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const all = ta.value;
  const selected = all.slice(start, end).trim();

  // If no selection, take current line
  let line = selected;
  if (!line) {
    const before = all.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const after = all.slice(start);
    const lineEnd = start + (after.indexOf("\n") === -1 ? after.length : after.indexOf("\n"));
    line = all.slice(lineStart, lineEnd).trim();
  }

  if (!line) {
    showToast("حدد سطرًا أولاً");
    return;
  }
  const parts = line.split("|").map(x => (x || "").trim());
  const name = parts[0] || "";
  const code = normalizeCode(parts[1] || "");
  if (!name) {
    showToast("السطر غير صالح");
    return;
  }
  addUnit({ name, code, hospitalKey: "los", status: "في الخدمة", region: "" });
  renderAll();
  showToast("تمت إضافة السطر ✅");
});

// Open/Close toggle
function setOpenMode(open) {
  isOpen = !!open;
  openSwitch.classList.toggle("on", isOpen);
  openLabel.textContent = isOpen ? "مفتوح" : "مغلق";
  closedFields.style.display = isOpen ? "none" : "block";
  updateFinalPreview();
}
openSwitch.addEventListener("click", () => setOpenMode(!isOpen));

// settings inputs re-render preview
receiverEl.addEventListener("input", renderAll);
deputyEl.addEventListener("input", renderAll);
useHospitalsEl.addEventListener("change", renderAll);
closedByEl.addEventListener("input", updateFinalPreview);
closedNoteEl.addEventListener("input", updateFinalPreview);

// Copy & Reset
btnCopy.addEventListener("click", async () => {
  const text = (finalTextEl.value || "").trim();
  if (!text) {
    showToast("لا يوجد نص للنسخ");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("تم النسخ ✅");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast("تم النسخ ✅");
  }
});

btnReset.addEventListener("click", () => {
  units = [];
  extractedListEl.value = "";
  receiverEl.value = "";
  deputyEl.value = "";
  useHospitalsEl.value = "yes";
  closedByEl.value = "";
  closedNoteEl.value = "";
  setOpenMode(true);

  ocrStatus.textContent = "جاهز.";
  progText.textContent = "—";
  setProgress(0);

  // reset crop
  cropRect = null;
  ocrSourceDataUrl = null;

  renderAll();
  showToast("تم التصفير");
});

// Edit modal events
btnCloseEdit.addEventListener("click", closeEdit);
editOverlay.addEventListener("click", (e) => {
  if (e.target === editOverlay) closeEdit();
});

btnSaveEdit.addEventListener("click", () => {
  const name = (editNameEl.value || "").trim();
  if (!name) {
    showToast("الاسم مطلوب");
    return;
  }

  const payload = {
    name,
    code: normalizeCode(editCodeEl.value || ""),
    hospitalKey: editHospEl.value || "los",
    status: editStatusEl.value || "في الخدمة",
    region: editRegionEl.value || "",
  };

  if (editMode === "add") {
    addUnit(payload);
    closeEdit();
    renderAll();
    showToast("تمت الإضافة ✅");
    return;
  }

  if (!editId) return;
  const u = units.find(x => x.id === editId);
  if (!u) return;

  u.name = payload.name;
  u.code = payload.code;
  u.hospitalKey = payload.hospitalKey;
  u.status = payload.status;
  u.region = payload.region;

  closeEdit();
  renderAll();
  showToast("تم الحفظ ✅");
});

btnDeleteUnit.addEventListener("click", () => {
  if (!editId) return;
  removeUnit(editId);
  closeEdit();
  renderAll();
  showToast("تم الحذف");
});

// ---------- Tour (شرح تفاعلي) ----------
const TOUR_KEY = "ops_dispatch_tour_done_v1";
let tourIndex = 0;
let tourActive = false;

const TOUR_STEPS = [
  {
    target: "#tourRecipients",
    title: "المستلم والنائب",
    body:
`يجب أولاً كتابة المستلم مع كود، ثم النائب مع كود.

مثال:
محمد تبر | D-1
شيرو هاروتو | D-2`,
  },
  {
    target: "#btnRunOcr",
    title: "استخراج النص من الصورة",
    body:
`قم بتصوير/قص القائمة (Screenshot) ثم الصقها داخل الصفحة (Ctrl+V) أو اخترها من الجهاز، وبعدها اضغط (استخراج النص).

ملاحظة مهمة:
إذا كانت جودة الصورة أو التباين ضعيف، قد يتعذّر على البوت القراءة بالشكل الصحيح — لذلك راجع وعدّل يدويًا.

قد لا تُدرج الأكواد أحيانًا:
تأكّد من تعديل/إضافة الأكواد داخل (النص المستخرج للمراجعة) قبل إرسالها في روم مركز العمليات.`,
  },
  {
    target: "#tourReview",
    title: "مراجعة النص ثم إضافة الكل للوحة",
    body:
`هنا يمكنك تعديل الاسم أو الكود بسرعة قبل الإضافة.

• لتعديل أي بطاقة بعد الإضافة: اضغط علامة القلم ✎ داخل البطاقة.
• لتسريع التحديث: ضع أسماء من عمليات سابقة داخل هذا المربع ثم اضغط (إضافة الكل للوحة — مستشفى لوس).`,
  },
  {
    target: "#openSwitch",
    title: "حالة العمليات (مفتوح/مغلق)",
    body:
`في حال لا توجد وحدات في الميدان أو توجد حالة طارئة (مثل: إعصار/فعالية/تسجيل خروج مؤقت):
حوّل الحالة إلى (مغلق)، ثم اكتب اسمك والملاحظة ليظهر (سجل العمليات) بشكل صحيح.`,
  },
];

function setTourVisible(v) {
  if (!tourOverlay) return;
  tourOverlay.style.display = v ? "block" : "none";
  tourOverlay.setAttribute("aria-hidden", v ? "false" : "true");
}

function markTourDone() {
  try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
}

function getTourDone() {
  try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return false; }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function positionTour(step) {
  const el = document.querySelector(step.target);
  if (!el) return false;

  const r = el.getBoundingClientRect();
  const pad = 8;
  const left = clamp(r.left - pad, 10, window.innerWidth - 10);
  const top = clamp(r.top - pad, 10, window.innerHeight - 10);
  const width = clamp(r.width + pad * 2, 40, window.innerWidth - 20);
  const height = clamp(r.height + pad * 2, 40, window.innerHeight - 20);

  tourHighlight.style.left = left + "px";
  tourHighlight.style.top = top + "px";
  tourHighlight.style.width = width + "px";
  tourHighlight.style.height = height + "px";

  // Tooltip content
  tourStepEl.textContent = `${tourIndex + 1}/${TOUR_STEPS.length}`;
  tourTitleEl.textContent = step.title;
  tourBodyEl.textContent = step.body;

  // measure tooltip
  tourTooltip.style.left = "10px";
  tourTooltip.style.top = "10px";
  const tw = tourTooltip.offsetWidth;
  const th = tourTooltip.offsetHeight;

  // Prefer below; align to the right side of highlight (RTL friendly)
  const margin = 12;
  let tTop = r.bottom + margin;
  let tLeft = r.right - tw; // align right edge
  tLeft = clamp(tLeft, 10, window.innerWidth - tw - 10);

  if (tTop + th > window.innerHeight - 10) {
    // place above
    tTop = r.top - th - margin;
    if (tTop < 10) tTop = 10;
  }

  tourTooltip.style.left = tLeft + "px";
  tourTooltip.style.top = tTop + "px";

  return true;
}

function renderTour() {
  if (!tourActive) return;
  const step = TOUR_STEPS[tourIndex];
  if (!step) {
    endTour(true);
    return;
  }
  const ok = positionTour(step);
  if (!ok) {
    // if target missing, skip step
    if (tourIndex < TOUR_STEPS.length - 1) {
      tourIndex++;
      renderTour();
    } else {
      endTour(true);
    }
  }
}

function startTour() {
  tourActive = true;
  tourIndex = 0;
  setTourVisible(true);
  renderTour();
}

function endTour(markDoneFlag) {
  tourActive = false;
  setTourVisible(false);
  if (markDoneFlag) markTourDone();
}

function nextTour() {
  if (tourIndex >= TOUR_STEPS.length - 1) {
    endTour(true);
    return;
  }
  tourIndex++;
  renderTour();
}

function skipStep() {
  // "تخطي" = تجاوز هذه الخطوة فقط
  nextTour();
}

function bindTourEvents() {
  if (!tourOverlay) return;

  window.addEventListener("resize", () => { if (tourActive) renderTour(); });
  window.addEventListener("scroll", () => { if (tourActive) renderTour(); }, true);

  tourNextBtn.addEventListener("click", nextTour);
  tourSkipStepBtn.addEventListener("click", skipStep);
  tourSkipAllBtn.addEventListener("click", () => endTour(true));
  tourCloseBtn.addEventListener("click", () => endTour(true));

  // Prevent clicks from passing through
  tourOverlay.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  if (btnHelp) {
    btnHelp.addEventListener("click", () => startTour());
  }
}

// ---------- Intro ----------
let introTimer = null;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function renderIntroNames() {
  if (!introNamesEl) return;
  introNamesEl.innerHTML = "";

  // Generate 24 floating names (random positions / repeated)
  const count = 24;
  for (let i = 0; i < count; i++) {
    const name = INTRO_NAMES[Math.floor(Math.random() * INTRO_NAMES.length)];
    const el = document.createElement("div");
    el.className = "introName";
    el.textContent = name;
    el.style.left = `${Math.round(rand(4, 92))}%`;
    el.style.top = `${Math.round(rand(6, 92))}%`;
    el.style.fontSize = `${Math.round(rand(12, 18))}px`;
    el.style.animationDuration = `${rand(4.5, 8.5).toFixed(2)}s`;
    el.style.animationDelay = `${rand(0, 1.8).toFixed(2)}s`;
    el.style.opacity = rand(0.35, 0.9).toFixed(2);
    introNamesEl.appendChild(el);
  }
}

function maybeStartTour(){ /* tutorial no longer auto-starts */ }

function hideIntro() {
  if (!introEl) return;
  clearTimeout(introTimer);
  introTimer = null;
  introEl.classList.add("hide");
  setTimeout(() => {
    introEl.style.display = "none";
    introEl.classList.remove("hide");
    // بعد الانترو، شغل الشرح لأول مرة
    }, 680);
}

function showIntro() {
  if (!introEl) return;
  renderIntroNames();
  introEl.style.display = "flex";
  introTimer = setTimeout(hideIntro, 4000);
}

if (introEl) {
  introEl.addEventListener("click", hideIntro);
}

// Init
bindTourEvents();
setProgress(0);
progText.textContent = "—";
ocrStatus.textContent = "جاهز.";
setOpenMode(true);
renderAll();

// Show intro on first load
showIntro();
