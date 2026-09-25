import ToJyutping from "to-jyutping";

type Token = { char: string; pronunciation: string | null };
type LyricLine = { time: string; text: string; jyutping: string; tokens: Token[]; coverage: number };
type Format = "aligned" | "sentence" | "dual";

declare global {
  interface Window {
    webkit?: { messageHandlers?: Record<string, { postMessage: (data: unknown) => void }> };
  }
}

const demoLyrics = `[00:15.20]从前共你促膝把酒
[00:19.65]倾通宵都不够
[00:24.10]我有痛快过你有没有
[00:29.30]很多东西今生只可给你
[00:34.08]保守至到永久
[00:38.44]别人如何明白透`;

const input = document.querySelector<HTMLTextAreaElement>("#lyricsInput")!;
const editor = document.querySelector<HTMLElement>("#lyricsEditor")!;
const status = document.querySelector<HTMLElement>("#status")!;
const correctionBar = document.querySelector<HTMLElement>("#correctionBar")!;
const jyutpingEdit = document.querySelector<HTMLInputElement>("#jyutpingEdit")!;
const keepTimeline = document.querySelector<HTMLInputElement>("#keepTimeline")!;

let lines: LyricLine[] = [];
let active = -1;
let outputFormat: Format = "aligned";

function isHan(char: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(char);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function annotate(text: string): LyricLine[] {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((raw, index) => {
    const match = raw.match(/^\[([^\]]+)]\s*(.*)$/);
    const lineText = (match?.[2] ?? raw).trim();
    const tokens = ToJyutping.getJyutpingList(lineText).map(([char, pronunciation]) => ({ char, pronunciation }));
    const han = tokens.filter(({ char }) => isHan(char));
    const known = han.filter(({ pronunciation }) => pronunciation).length;
    return {
      time: match?.[1] ?? `00:${String(index * 5).padStart(2, "0")}.00`,
      text: lineText,
      tokens,
      jyutping: tokens.flatMap(({ pronunciation }) => pronunciation ? [pronunciation] : []).join(" "),
      coverage: han.length ? Math.round(known / han.length * 100) : 100,
    };
  });
}

function updateInputCount() {
  document.querySelector("#lineCount")!.textContent = `${input.value.split(/\n/).filter(Boolean).length} 行`;
  document.querySelector("#charCount")!.textContent = `${input.value.length} 字符`;
  localStorage.setItem("jyutping-lyrics", input.value);
}

function render() {
  const totalChars = lines.reduce((sum, line) => sum + line.text.length, 0);
  const average = lines.length ? Math.round(lines.reduce((sum, line) => sum + line.coverage, 0) / lines.length) : 0;
  document.querySelector("#resultLines")!.textContent = String(lines.length);
  document.querySelector("#resultChars")!.textContent = String(totalChars);
  document.querySelector("#coverage")!.textContent = `${average}%`;

  if (!lines.length) {
    editor.innerHTML = `<div class="empty"><b>等待歌词</b><span>粘贴歌词或导入 LRC 后开始标注</span></div>`;
    correctionBar.hidden = true;
    return;
  }

  editor.innerHTML = lines.map((line, index) => `
    <article class="lyric-row ${active === index ? "selected" : ""}" data-index="${index}">
      <time>${escapeHtml(line.time)}</time>
      <div class="aligned-lyrics">${line.tokens.map(({ char, pronunciation }) => `
        <span class="word"><b>${escapeHtml(char)}</b><small class="${!pronunciation && isHan(char) ? "unknown" : ""}">${pronunciation ? escapeHtml(pronunciation) : (isHan(char) ? "待校对" : "")}</small></span>`).join("")}</div>
      <span class="confidence ${line.coverage < 90 ? "review" : ""}">${line.coverage}%</span>
    </article>`).join("");

  editor.querySelectorAll<HTMLElement>(".lyric-row").forEach((row) => row.addEventListener("click", () => selectLine(Number(row.dataset.index))));
  if (active >= 0 && lines[active]) showCorrection();
}

function selectLine(index: number) {
  active = index;
  render();
}

function showCorrection() {
  const line = lines[active];
  correctionBar.hidden = false;
  document.querySelector("#editingLabel")!.textContent = `第 ${active + 1} 行 · ${line.text}`;
  jyutpingEdit.value = line.jyutping;
}

function runAnnotation() {
  if (!input.value.trim()) return;
  status.textContent = "正在分析多音字…";
  window.setTimeout(() => {
    lines = annotate(input.value);
    active = lines.length ? 0 : -1;
    render();
    status.textContent = `完成 · ${lines.length} 行`;
  }, 180);
}

function formattedOutput() {
  return lines.map((line) => {
    const stamp = keepTimeline.checked ? `[${line.time}]` : "";
    if (outputFormat === "sentence") return `${stamp}${line.jyutping}`;
    if (outputFormat === "dual") return `${stamp}${line.text}\n${stamp}${line.jyutping}`;
    return `${stamp}${line.text}\n${line.jyutping}`;
  }).join("\n");
}

function nativeMessage(name: string, data: unknown) {
  const handler = window.webkit?.messageHandlers?.[name];
  if (!handler) return false;
  handler.postMessage(data);
  return true;
}

async function copyAll() {
  const text = formattedOutput();
  const button = document.querySelector<HTMLButtonElement>("#copyAll")!;
  if (!nativeMessage("clipboard", text)) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    }
  }
  button.textContent = "✓ 已复制";
  window.setTimeout(() => button.textContent = "复制全部", 1200);
}

function exportLrc() {
  const content = formattedOutput();
  if (nativeMessage("fileExport", { filename: "粤拼歌词.lrc", content })) return;
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "粤拼歌词.lrc"; anchor.click(); URL.revokeObjectURL(url);
}

input.value = localStorage.getItem("jyutping-lyrics") || demoLyrics;
input.addEventListener("input", updateInputCount);
document.querySelector("#annotate")!.addEventListener("click", runAnnotation);
document.querySelector("#loadDemo")!.addEventListener("click", () => { input.value = demoLyrics; updateInputCount(); runAnnotation(); });
document.querySelector("#newProject")!.addEventListener("click", () => { input.value = ""; lines = []; active = -1; updateInputCount(); render(); status.textContent = "已清空"; input.focus(); });
document.querySelector("#copyAll")!.addEventListener("click", copyAll);
document.querySelector("#exportLrc")!.addEventListener("click", exportLrc);
document.querySelector("#pickFile")!.addEventListener("click", () => document.querySelector<HTMLInputElement>("#fileInput")!.click());
document.querySelector<HTMLInputElement>("#fileInput")!.addEventListener("change", async (event) => {
  const file = (event.currentTarget.files || [])[0]; if (!file) return;
  input.value = await file.text(); updateInputCount(); runAnnotation();
});
document.querySelectorAll<HTMLButtonElement>("#formatPicker button").forEach((button) => button.addEventListener("click", () => {
  outputFormat = button.dataset.format as Format;
  document.querySelectorAll("#formatPicker button").forEach((item) => item.classList.toggle("active", item === button));
}));
jyutpingEdit.addEventListener("input", () => {
  if (!lines[active]) return;
  const pronunciations = jyutpingEdit.value.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  lines[active].tokens = lines[active].tokens.map((token) => isHan(token.char) ? { ...token, pronunciation: pronunciations[i++] ?? null } : token);
  lines[active].jyutping = jyutpingEdit.value;
  lines[active].coverage = 100;
});
jyutpingEdit.addEventListener("change", render);
document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") runAnnotation(); });

updateInputCount();
lines = annotate(input.value);
active = 0;
render();
