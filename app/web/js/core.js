const $ = (id) => document.getElementById(id);
// 有用户发起的慢操作(开浏览器抓评论/发评论/解析链接等)在进行时,暂停 8 秒轮询刷新,
// 否则定时重渲染会把按钮的「…中」加载态冲掉。
let INFLIGHT = 0;
// 全局忙碌徽章:>350ms 才显示(快速轮询不闪),圆环转圈 + 已等待秒数 + 并发数。
// 拿不到真实进度百分比(浏览器自动化/接口都是不透明操作),用计时给"在进行"的清晰感知。
// 判忙 = 有未完成请求(_apiActive)或有用户慢操作(INFLIGHT);并发数用 INFLIGHT(用户点的操作数)。
let _apiActive = 0, _barTimer = null, _busyStart = 0, _busyTick = null;
function _isBusy() { return _apiActive > 0 || INFLIGHT > 0; }
function _busyShow() {
  const sp = $("busy-spinner");
  if (sp && _isBusy()) { sp.classList.add("on"); sp.setAttribute("aria-hidden", "false"); }
}
function _busyLabel() {
  const l = $("bs-label"); if (!l) return;
  const sec = Math.floor((Date.now() - _busyStart) / 1000);
  l.textContent = "处理中 " + (INFLIGHT > 1 ? "×" + INFLIGHT + " · " : "") + sec + " 秒";
}
function _barSync() {
  if (_isBusy()) {
    if (!_barTimer) {                 // 空闲 -> 忙:启动计时,350ms 后才真正显示
      _busyStart = Date.now();
      _barTimer = setTimeout(_busyShow, 350);
      _busyTick = setInterval(_busyLabel, 250);
    }
  } else {                            // 全部结束:清理并隐藏
    clearTimeout(_barTimer); _barTimer = null;
    clearInterval(_busyTick); _busyTick = null;
    const sp = $("busy-spinner"); if (sp) { sp.classList.remove("on"); sp.setAttribute("aria-hidden", "true"); }
    const l = $("bs-label"); if (l) l.textContent = "处理中";
  }
}
const api = async (path, opts) => {
  _apiActive++; _barSync();
  try {
    opts = { ...(opts || {}) };
    const headers = new Headers(opts.headers || {});
    try {
      const adminToken = sessionStorage.getItem("creatorhub-risk-admin-token") || "";
      if (adminToken) headers.set("X-CreatorHub-Admin-Token", adminToken);
    } catch (e) {}
    headers.set("X-CreatorHub-Actor", "creatorhub-web");
    opts.headers = headers;
    const r = await fetch(path, opts);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.status); }
    return await r.json();
  } finally { _apiActive--; _barSync(); }
};

// ─── UI helpers ───
const ic = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
// 按钮加载态:换成 spinner+label,返回 restore()。配合 INFLIGHT 暂停轮询,加载态不会被重渲染冲掉。
function btnLoading(btn, label) {
  if (!btn) return () => {};
  const html = btn.innerHTML, dis = btn.disabled;
  btn.disabled = true; btn.classList.add("busy");
  btn.innerHTML = `<span class="spin"></span>${label ? `<span>${esc(label)}</span>` : ""}`;
  return () => { try { btn.innerHTML = html; btn.disabled = dis; btn.classList.remove("busy"); } catch (e) {} };
}
// 包裹一个用户发起的慢操作:按钮转圈 + 暂停轮询(避免 8 秒重渲染冲掉加载态)。
// btn 可为 null(无按钮场景);fn 为实际 async 逻辑。
async function withBusy(btn, label, fn) {
  const restore = btnLoading(btn, label);
  INFLIGHT++; _barSync();
  try { return await fn(); }
  finally { INFLIGHT--; restore(); _barSync(); }
}
// 从内联 onclick 处理器里拿到被点的按钮(event 在同步阶段有效)
function evtBtn() { try { return event.target.closest("button"); } catch (e) { return null; } }
function toast(msg, type = "info", ms = 3600) {
  const box = $("toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", type === "err" ? "alert" : "status");
  const sym = type === "ok" ? "i-check" : type === "err" ? "i-x" : "i-info";
  el.innerHTML = `${ic(sym)}<span>${esc(msg)}</span>` +
    `<button class="toast-close" type="button" aria-label="关闭提示">${ic("i-x")}</button>`;
  box.appendChild(el);
  let timer = null;
  const dismiss = () => {
    if (!el.isConnected || el.classList.contains("hide")) return;
    clearTimeout(timer); el.classList.add("hide"); setTimeout(() => el.remove(), 250);
  };
  el.querySelector(".toast-close").addEventListener("click", dismiss);
  timer = setTimeout(dismiss, ms);
}
const empty = (cols, text, icon = "i-inbox", sub = "") =>
  `<tr><td colspan="${cols}"><div class="empty">` +
  `<div class="empty-ic">${ic(icon)}</div><div class="empty-t">${esc(text)}</div>` +
  `${sub ? `<div class="empty-sub">${esc(sub)}</div>` : ""}</div></td></tr>`;
const skeleton = (cols, rows = 3) => {
  let out = "";
  for (let i = 0; i < rows; i++) {
    let tds = "";
    for (let c = 0; c < cols; c++) tds += `<td><span class="sk" style="width:${40 + ((i + c) % 4) * 18}%"></span></td>`;
    out += `<tr>${tds}</tr>`;
  }
  return out;
};

// ─── form interaction helpers ───
function setFieldError(el, message = "") {
  if (!el) return false;
  const field = el.closest(".form-field") || el.parentElement;
  let error = field && field.querySelector(".field-error");
  if (message) {
    el.setAttribute("aria-invalid", "true");
    if (!error && field) {
      error = document.createElement("p");
      error.className = "field-error";
      error.setAttribute("role", "alert");
      field.appendChild(error);
    }
    if (error) error.textContent = message;
    return false;
  }
  el.removeAttribute("aria-invalid");
  if (error) error.remove();
  return true;
}
function toggleSecretInput(id, btn) {
  const input = $(id);
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  if (btn) {
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "隐藏 API Key" : "显示 API Key");
  }
  input.focus({ preventScroll: true });
}
function validateAiField(el, required = false) {
  if (!el) return true;
  const value = el.value.trim();
  if (required && !value) return setFieldError(el, el.id === "ai-model" ? "请输入模型名称" : "请输入接口地址");
  if (el.id === "ai-base" && value) {
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
    } catch (e) { return setFieldError(el, "请输入以 http:// 或 https:// 开头的有效地址"); }
  }
  if (el.id === "ai-temp" && value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 2) return setFieldError(el, "温度需填写 0–2 之间的数字");
  }
  return setFieldError(el, "");
}
function validateAiSettings(requireConfigured = false) {
  const required = requireConfigured || $("ai-enabled").checked;
  const fields = [$("ai-base"), $("ai-model"), $("ai-temp")];
  const valid = fields.map(el => validateAiField(el, required && (el.id === "ai-base" || el.id === "ai-model"))).every(Boolean);
  if (!valid) {
    const first = fields.find(el => el.getAttribute("aria-invalid") === "true");
    if (first) first.focus({ preventScroll: false });
    $("ai-msg").textContent = "请先修正标红的配置项";
  }
  return valid;
}
function validateNotificationConfig() {
  const el = $("n-config");
  try {
    const value = JSON.parse(el.value || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("object");
    return setFieldError(el, "");
  } catch (e) {
    return setFieldError(el, "请输入合法的 JSON 对象，例如 {\"token\":\"...\"}");
  }
}

