// ─── dialog focus / scroll management ───
const _modalTriggers = new WeakMap();
function _visibleModal() {
  return [...document.querySelectorAll(".pv-overlay[role='dialog']")].reverse()
    .find(el => getComputedStyle(el).display !== "none");
}
function modalOpened(el) {
  if (!el) return;
  const active = document.activeElement;
  if (active && active !== document.body) _modalTriggers.set(el, active);
  document.body.classList.add("modal-open");
}
function modalClosed(el) {
  if (!el) return;
  if (!_visibleModal()) document.body.classList.remove("modal-open");
  const trigger = _modalTriggers.get(el);
  _modalTriggers.delete(el);
  if (trigger && trigger.isConnected && typeof trigger.focus === "function") {
    setTimeout(() => trigger.focus({ preventScroll: true }), 0);
  }
}
function _modalFocusables(el) {
  return [...el.querySelectorAll(
    'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(node => node.offsetParent !== null);
}

// ─── 通用模态(替代原生 prompt / confirm:下拉 / 文本输入 / 确认)───
let _uiResolve = null, _uiGetVal = null, _uiCancelVal = null;
function _uiClose(val) {
  if (typeof OPEN_META_COMBO !== "undefined" && OPEN_META_COMBO) OPEN_META_COMBO.close();
  const modal = $("uimodal");
  modal.style.display = "none";
  modalClosed(modal);
  document.removeEventListener("keydown", _uiKey);
  const r = _uiResolve; _uiResolve = null; _uiGetVal = null;
  if (r) r(val);
}
function _uiKey(e) {
  if (e.key === "Escape") uiModalCancel();
  else if (e.key === "Enter" && document.activeElement && document.activeElement.tagName !== "TEXTAREA") uiModalOk();
}
function uiModalCancel() { _uiClose(_uiCancelVal); }
function uiModalOk() { _uiClose(_uiGetVal ? _uiGetVal() : ""); }
function _uiOpen(title, hint, { okText = "确定", danger = false, wide = false } = {}) {
  $("ui-title").textContent = title || "";
  $("ui-hint").textContent = hint || "";
  const ok = $("ui-ok");
  ok.innerHTML = `<svg aria-hidden="true"><use href="#${danger ? "i-trash" : "i-check"}"/></svg>` + esc(okText);
  ok.classList.toggle("danger", !!danger);
  ok.style.cssText = "flex:0 0 auto";
  const modal = $("uimodal");
  modal.querySelector(".rp-box").style.width = wide ? "min(94vw,680px)" : "min(94vw,480px)";
  modal.style.display = "flex";
  modalOpened(modal);
  document.addEventListener("keydown", _uiKey);
  setTimeout(() => {
    const el = [...$("ui-body").querySelectorAll("input,textarea,.cs-trg,.dt-trg,select,button")]
      .find(node => node.offsetParent !== null && !node.classList.contains("cs-native") && !node.classList.contains("dt-native"));
    if (el) el.focus();
  }, 30);
}
// 确认框。返回 true / false。danger=true 时确定按钮红色(危险操作)
function uiConfirm({ title = "确认", message = "", okText = "确定", danger = false } = {}) {
  return new Promise(res => {
    _uiResolve = res; _uiGetVal = () => true; _uiCancelVal = false;
    $("ui-body").innerHTML = "";
    _uiOpen(title, message, { okText, danger });
  });
}
// 下拉选择。options:[{value,label,disabled}]。返回选中 value 或 null(取消)
function uiSelect({ title, hint, options, value }) {
  return new Promise(res => {
    _uiResolve = res; _uiCancelVal = null;
    _uiGetVal = () => { const el = $("ui-body").querySelector("select,input,textarea"); return el ? el.value : ""; };
    $("ui-body").innerHTML =
      `<select id="ui-sel" style="width:100%">` +
      options.map(o => `<option value="${esc(o.value)}"${o.value === value ? " selected" : ""}${o.disabled ? " disabled" : ""}>${esc(o.label)}</option>`).join("") +
      `</select>`;
    enhanceSelect($("ui-sel"));
    _uiOpen(title, hint);
  });
}
// 文本输入(单行或多行)。返回字符串或 null(取消)
function uiPrompt({ title, hint, value, placeholder, multiline, rows, secret = false }) {
  return new Promise(res => {
    _uiResolve = res; _uiCancelVal = null;
    _uiGetVal = () => { const el = $("ui-body").querySelector("select,input,textarea"); return el ? el.value : ""; };
    $("ui-body").innerHTML = multiline
      ? `<textarea id="ui-inp" rows="${rows || 6}" placeholder="${esc(placeholder || "")}">${esc(value || "")}</textarea>`
      : `<input id="ui-inp" type="${secret ? "password" : "text"}" value="${esc(value || "")}" placeholder="${esc(placeholder || "")}" autocomplete="${secret ? "current-password" : "off"}">`;
    _uiOpen(title, hint);
  });
}

// ─── 自定义下拉:渐进增强原生 <select>(美化展开列表)───
// 弹层挂到 body 以避开卡片 overflow；Tab 时显式回到文档顺序，避免焦点落到 body 末尾。
let _openSelectClose = null;
function focusAdjacentControl(origin, backwards = false) {
  const nodes = [...document.querySelectorAll(
    'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(node => node.offsetParent !== null && !node.classList.contains("cs-native") && !node.classList.contains("dt-native") && !node.closest(".cs-panel,.dt-panel"));
  const index = nodes.indexOf(origin);
  const next = nodes[index + (backwards ? -1 : 1)];
  if (next) requestAnimationFrame(() => next.focus({ preventScroll: true }));
}
function enhanceSelect(sel) {
  if (sel.dataset.cs) return;
  sel.dataset.cs = "1";
  const wrap = document.createElement("div");
  wrap.className = "cs" + (sel.className ? " " + sel.className : "");
  const st = sel.getAttribute("style");
  if (st) wrap.setAttribute("style", st);
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.className = "cs-native";
  sel.removeAttribute("style");
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");

  const trg = document.createElement("button");
  trg.type = "button";
  trg.className = "cs-trg";
  trg.innerHTML = `<span class="cs-lbl"></span>` +
    `<svg class="cs-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
  trg.setAttribute("aria-haspopup", "listbox");
  trg.setAttribute("aria-expanded", "false");
  const labelEl = sel.id ? document.querySelector(`label[for="${sel.id}"]`) : null;
  const selectLabel = sel.getAttribute("aria-label") || (labelEl || {}).textContent || "选择选项";
  if (labelEl) {
    if (!labelEl.id) labelEl.id = `label-${sel.id}`;
    trg.setAttribute("aria-labelledby", labelEl.id);
    labelEl.addEventListener("click", e => { e.preventDefault(); trg.focus(); });
  } else trg.setAttribute("aria-label", selectLabel.trim());
  wrap.appendChild(trg);
  let panel = null, typeBuffer = "", typeTimer = null;

  function sync() {
    const o = sel.options[sel.selectedIndex];
    trg.querySelector(".cs-lbl").textContent = o ? o.textContent : "";
    trg.classList.toggle("ph", !o || o.value === "");
    trg.disabled = !!sel.disabled;
    trg.setAttribute("aria-disabled", sel.disabled ? "true" : "false");
  }
  function close() {
    if (panel) { panel.remove(); panel = null; }
    if (_openSelectClose === close) _openSelectClose = null;
    wrap.classList.remove("open");
    trg.setAttribute("aria-expanded", "false");
    trg.removeAttribute("aria-controls");
    window.removeEventListener("scroll", close, true);
    window.removeEventListener("resize", close);
    document.removeEventListener("mousedown", onDoc, true);
  }
  function onDoc(e) { if (!wrap.contains(e.target) && (!panel || !panel.contains(e.target))) close(); }
  function choose(i) {
    if (sel.selectedIndex !== i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    sync(); close(); trg.focus({ preventScroll: true });
  }
  function focusTyped(char) {
    clearTimeout(typeTimer);
    typeBuffer += char.toLocaleLowerCase();
    typeTimer = setTimeout(() => { typeBuffer = ""; }, 650);
    if (!panel) open(false);
    requestAnimationFrame(() => {
      if (!panel) return;
      const options = [...panel.querySelectorAll('.cs-opt:not(.dis)')];
      const from = Math.max(0, options.indexOf(document.activeElement) + 1);
      const ordered = options.slice(from).concat(options.slice(0, from));
      const target = ordered.find(option => option.textContent.trim().toLocaleLowerCase().startsWith(typeBuffer));
      if (target) { target.focus(); target.scrollIntoView({ block: "nearest" }); }
    });
  }
  function open(focusSelected = false) {
    if (sel.disabled) return;
    if (_openSelectClose && _openSelectClose !== close) _openSelectClose();
    panel = document.createElement("div");
    panel.className = "cs-panel";
    panel.id = `cs-panel-${sel.id || Math.random().toString(36).slice(2)}`;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", selectLabel.trim());
    Array.from(sel.options).forEach((o, i) => {
      const it = document.createElement("div");
      it.className = "cs-opt" + (i === sel.selectedIndex ? " sel" : "") + (o.disabled ? " dis" : "");
      const optionLabel = document.createElement("span");
      optionLabel.className = "cs-opt-label";
      optionLabel.textContent = o.textContent;
      it.appendChild(optionLabel);
      it.setAttribute("role", "option");
      it.setAttribute("aria-selected", i === sel.selectedIndex ? "true" : "false");
      it.id = `${panel.id}-option-${i}`;
      it.tabIndex = o.disabled ? -1 : 0;
      if (!o.disabled) it.addEventListener("click", ev => { ev.preventDefault(); choose(i); });
      if (!o.disabled) it.addEventListener("keydown", ev => {
        const options = [...panel.querySelectorAll('.cs-opt:not(.dis)')];
        const index = options.indexOf(it);
        if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          ev.preventDefault();
          options[(index + (ev.key === "ArrowDown" ? 1 : -1) + options.length) % options.length].focus();
        } else if (ev.key === "Home" || ev.key === "End") {
          ev.preventDefault(); options[ev.key === "Home" ? 0 : options.length - 1].focus();
        } else if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault(); choose(i);
        } else if (ev.key === "Escape") {
          ev.preventDefault(); close(); trg.focus({ preventScroll: true });
        } else if (ev.key === "Tab") {
          ev.preventDefault(); close(); focusAdjacentControl(trg, ev.shiftKey);
        } else if (ev.key.length === 1 && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
          focusTyped(ev.key);
        }
      });
      panel.appendChild(it);
    });
    document.body.appendChild(panel);
    const r = trg.getBoundingClientRect();
    panel.style.left = Math.max(6, Math.min(r.left, window.innerWidth - r.width - 6)) + "px";
    panel.style.width = Math.min(r.width, window.innerWidth - 12) + "px";
    const below = window.innerHeight - r.bottom;
    if (below < 280 && r.top > below) panel.style.bottom = (window.innerHeight - r.top + 5) + "px";
    else panel.style.top = (r.bottom + 5) + "px";
    panel.style.maxWidth = Math.max(180, window.innerWidth - 12) + "px";
    wrap.classList.add("open");
    _openSelectClose = close;
    trg.setAttribute("aria-expanded", "true");
    trg.setAttribute("aria-controls", panel.id);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    setTimeout(() => document.addEventListener("mousedown", onDoc, true), 0);
    if (focusSelected) setTimeout(() => {
      const target = panel && (panel.querySelector(".cs-opt.sel:not(.dis)") || panel.querySelector(".cs-opt:not(.dis)"));
      if (target) { target.focus(); target.scrollIntoView({ block: "nearest" }); }
    }, 0);
  }
  trg.addEventListener("click", e => { e.preventDefault(); panel ? close() : open(false); });
  trg.addEventListener("keydown", e => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault(); if (!panel) open(true);
    } else if (e.key === "Escape" && panel) {
      e.preventDefault(); close();
    } else if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); focusTyped(e.key);
    }
  });
  sel.addEventListener("change", sync);
  sel._csSync = sync;
  new MutationObserver(sync).observe(sel, { childList: true, attributes: true, attributeFilter: ["disabled"] });
  sync();
}
function enhanceAllSelects(root) {
  const scope = root || document;
  if (scope.matches && scope.matches("select:not([data-cs])")) enhanceSelect(scope);
  if (scope.querySelectorAll) scope.querySelectorAll("select:not([data-cs])").forEach(enhanceSelect);
}
function csSyncAll() { document.querySelectorAll("select[data-cs]").forEach(s => s._csSync && s._csSync()); }

// ─── 自定义 tooltip:接管原生 title(首次 hover 时把 title 转 data-tip,避免系统提示)───
const _tip = document.createElement("div"); _tip.className = "tip"; document.body.appendChild(_tip);
let _tipTarget = null, _tipTimer = null;
function _tipShow(el) {
  const text = el.getAttribute("data-tip");
  if (!text || !el.isConnected) { _tipHide(); return; }
  _tip.textContent = text;
  const r = el.getBoundingClientRect(), tr = _tip.getBoundingClientRect();
  let below = false, top = r.top - tr.height - 8;
  if (top < 6) { below = true; top = r.bottom + 8; }
  const left = Math.max(6, Math.min(r.left + r.width / 2 - tr.width / 2, window.innerWidth - tr.width - 6));
  _tip.style.left = left + "px"; _tip.style.top = top + "px";
  _tip.classList.toggle("below", below);
  _tip.classList.add("show");
}
function _tipHide() { _tip.classList.remove("show"); _tipTarget = null; clearTimeout(_tipTimer); }
document.addEventListener("mouseover", e => {
  const el = e.target.closest && e.target.closest("[title],[data-tip]");
  if (!el || el === _tip) return;
  if (el.hasAttribute("title")) {       // 把原生 title 搬到 data-tip,从此不再弹系统提示
    const t = el.getAttribute("title");
    if (t) { el.setAttribute("data-tip", t); if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", t); }
    el.removeAttribute("title");
  }
  if (el === _tipTarget) return;
  _tipTarget = el;
  clearTimeout(_tipTimer);
  _tipTimer = setTimeout(() => { if (_tipTarget === el) _tipShow(el); }, 300);
});
document.addEventListener("mouseout", e => {
  if (_tipTarget && (!e.relatedTarget || !_tipTarget.contains(e.relatedTarget))) _tipHide();
});
document.addEventListener("focusin", e => {
  const el = e.target.closest && e.target.closest("[title],[data-tip]");
  if (!el) return;
  if (el.hasAttribute("title")) {
    const t = el.getAttribute("title");
    if (t) { el.setAttribute("data-tip", t); if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", t); }
    el.removeAttribute("title");
  }
  _tipTarget = el; clearTimeout(_tipTimer); _tipTimer = setTimeout(() => _tipShow(el), 120);
});
document.addEventListener("focusout", e => {
  if (_tipTarget === e.target) _tipHide();
});
window.addEventListener("scroll", _tipHide, true);
document.addEventListener("click", _tipHide);

// ─── 自定义日期时间选择器:渐进增强 <input type=datetime-local> ───
const _pad2 = n => String(n).padStart(2, "0");
let _openDateClose = null;
function _dtFmt(d) { return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}T${_pad2(d.getHours())}:${_pad2(d.getMinutes())}`; }
function _dtDisp(d) { return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())} ${_pad2(d.getHours())}:${_pad2(d.getMinutes())}`; }
function _dtParse(v) { const m = (v || "").match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null; }
function enhanceDateTime(inp) {
  if (inp.dataset.dt) return; inp.dataset.dt = "1";
  const wrap = document.createElement("div");
  wrap.className = "dt" + (inp.className ? " " + inp.className : "");
  const st = inp.getAttribute("style"); if (st) wrap.setAttribute("style", st);
  inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
  inp.className = "dt-native"; inp.removeAttribute("style");
  inp.tabIndex = -1; inp.setAttribute("aria-hidden", "true");
  const labelEl = inp.id ? document.querySelector(`label[for="${inp.id}"]`) : null;
  const ph = inp.getAttribute("aria-label") || (labelEl || {}).textContent || "选择日期时间";
  const trg = document.createElement("button");
  trg.type = "button"; trg.className = "dt-trg";
  trg.innerHTML = `<span class="dt-lbl"></span>` +
    `<svg class="dt-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
  trg.setAttribute("aria-haspopup", "dialog"); trg.setAttribute("aria-expanded", "false");
  if (labelEl) {
    if (!labelEl.id) labelEl.id = `label-${inp.id}`;
    trg.setAttribute("aria-labelledby", labelEl.id);
    labelEl.addEventListener("click", e => { e.preventDefault(); trg.focus(); });
  } else trg.setAttribute("aria-label", ph.trim());
  wrap.appendChild(trg);
  let panel = null;
  function sync() { const d = _dtParse(inp.value); trg.querySelector(".dt-lbl").textContent = d ? _dtDisp(d) : ph; trg.classList.toggle("ph", !d); trg.disabled = !!inp.disabled; }
  function close() { if (panel) { panel.remove(); panel = null; } if (_openDateClose === close) _openDateClose = null; wrap.classList.remove("open"); trg.setAttribute("aria-expanded", "false"); trg.removeAttribute("aria-controls"); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); document.removeEventListener("mousedown", onDoc, true); }
  function onDoc(e) { if (!wrap.contains(e.target) && (!panel || !panel.contains(e.target))) close(); }
  function open() {
    if (inp.disabled) return;
    if (_openSelectClose) _openSelectClose();
    if (_openDateClose && _openDateClose !== close) _openDateClose();
    const init = _dtParse(inp.value) || new Date();
    let view = new Date(init.getFullYear(), init.getMonth(), 1);
    let chosen = _dtParse(inp.value);
    let h = init.getHours(), mi = init.getMinutes();
    panel = document.createElement("div"); panel.className = "dt-panel";
    panel.id = `dt-panel-${inp.id || Math.random().toString(36).slice(2)}`;
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", ph.trim());
    const getH = () => { const v = parseInt(panel.querySelector(".dt-h").value, 10); return isNaN(v) ? 0 : Math.max(0, Math.min(23, v)); };
    const getM = () => { const v = parseInt(panel.querySelector(".dt-m").value, 10); return isNaN(v) ? 0 : Math.max(0, Math.min(59, v)); };
    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      const lead = (new Date(y, m, 1).getDay() + 6) % 7;   // 周一为首列
      const days = new Date(y, m + 1, 0).getDate();
      const t = new Date();
      const chosenHere = chosen && chosen.getFullYear() === y && chosen.getMonth() === m;
      let cells = "";
      for (let i = 0; i < lead; i++) cells += `<span class="dt-day off"></span>`;
      for (let d = 1; d <= days; d++) {
        const today = t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
        const sel = chosen && chosen.getFullYear() === y && chosen.getMonth() === m && chosen.getDate() === d;
        cells += `<button type="button" class="dt-day${today ? " today" : ""}${sel ? " sel" : ""}" data-d="${d}" tabindex="${sel || (!chosenHere && d === 1) ? 0 : -1}" aria-label="${y} 年 ${m + 1} 月 ${d} 日${today ? "，今天" : ""}"${sel ? ' aria-current="date"' : ""}>${d}</button>`;
      }
      panel.innerHTML =
        `<div class="dt-head"><button type="button" class="dt-nav" data-nav="-1" aria-label="上个月">${ic("i-prev")}</button>` +
        `<span class="dt-title">${y} 年 ${m + 1} 月</span>` +
        `<button type="button" class="dt-nav" data-nav="1" aria-label="下个月">${ic("i-next")}</button></div>` +
        `<div class="dt-wk"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>` +
        `<div class="dt-grid">${cells}</div>` +
        `<div class="dt-time"><span>时间</span><input type="number" class="dt-h" min="0" max="23" value="${_pad2(h)}" aria-label="小时"><b>:</b><input type="number" class="dt-m" min="0" max="59" value="${_pad2(mi)}" aria-label="分钟"></div>` +
        `<div class="dt-foot"><button type="button" class="ghost sm" data-act="clear">清除</button><button type="button" class="ghost sm" data-act="now">现在</button><button type="button" class="sm" data-act="ok">确定</button></div>`;
      panel.querySelectorAll(".dt-nav").forEach(b => b.onclick = () => { h = getH(); mi = getM(); view.setMonth(view.getMonth() + (+b.dataset.nav)); render(); });
      panel.querySelectorAll(".dt-day[data-d]").forEach(c => c.onclick = () => { h = getH(); mi = getM(); chosen = new Date(view.getFullYear(), view.getMonth(), +c.dataset.d, h, mi); render(); });
      if (panel.isConnected) requestAnimationFrame(() => {
        const day = panel && (panel.querySelector(".dt-day.sel") || panel.querySelector(".dt-day[data-d]"));
        if (day) day.focus();
      });
    }
    function commit(d) { inp.value = d ? _dtFmt(d) : ""; inp.dispatchEvent(new Event("change", { bubbles: true })); sync(); close(); }
    render();
    panel.addEventListener("click", e => {
      const a = e.target.closest("[data-act]"); if (!a) return;
      if (a.dataset.act === "clear") commit(null);
      else if (a.dataset.act === "now") commit(new Date());
      else { const base = chosen || new Date(); base.setHours(getH(), getM(), 0, 0); commit(base); }
    });
    document.body.appendChild(panel);
    const r = trg.getBoundingClientRect();
    panel.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 280)) + "px";
    const below = window.innerHeight - r.bottom;
    if (below < 360 && r.top > below) panel.style.bottom = (window.innerHeight - r.top + 5) + "px";
    else panel.style.top = (r.bottom + 5) + "px";
    wrap.classList.add("open");
    _openDateClose = close;
    trg.setAttribute("aria-expanded", "true"); trg.setAttribute("aria-controls", panel.id);
    panel.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); close(); trg.focus({ preventScroll: true }); return; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key) && e.target.classList.contains("dt-day")) {
        e.preventDefault();
        const days = [...panel.querySelectorAll(".dt-day[data-d]")];
        const index = days.indexOf(e.target);
        const delta = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
        const target = e.key === "Home" ? days[0] : e.key === "End" ? days[days.length - 1] : days[Math.max(0, Math.min(days.length - 1, index + delta))];
        if (target) target.focus();
        return;
      }
      if (e.key === "Tab") {
        const focusables = [...panel.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),input:not([disabled])')];
        const first = focusables[0], last = focusables[focusables.length - 1];
        if ((!e.shiftKey && e.target === last) || (e.shiftKey && e.target === first)) {
          e.preventDefault(); close(); focusAdjacentControl(trg, e.shiftKey);
        }
      }
    });
    window.addEventListener("scroll", close, true); window.addEventListener("resize", close);
    setTimeout(() => document.addEventListener("mousedown", onDoc, true), 0);
    setTimeout(() => { const day = panel && (panel.querySelector(".dt-day.sel") || panel.querySelector(".dt-day[data-d]")); if (day) day.focus(); }, 0);
  }
  trg.addEventListener("click", e => { e.preventDefault(); panel ? close() : open(); });
  inp.addEventListener("change", sync);
  inp._dtSync = sync;
  new MutationObserver(sync).observe(inp, { attributes: true, attributeFilter: ["disabled"] });
  sync();
}
function enhanceAllDateTime(root) {
  const scope = root || document;
  if (scope.matches && scope.matches("input[type=datetime-local]:not([data-dt])")) enhanceDateTime(scope);
  if (scope.querySelectorAll) scope.querySelectorAll("input[type=datetime-local]:not([data-dt])").forEach(enhanceDateTime);
}
function dtSyncAll() { document.querySelectorAll("input[type=datetime-local][data-dt]").forEach(i => i._dtSync && i._dtSync()); }

