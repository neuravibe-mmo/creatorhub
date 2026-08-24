// ─── 预览 lightbox(图集左右翻动)───
let PV_N = 0, PV_I = 0, PV_REQ = 0;
function _pvRender(d) {
  const box = $("pv-media"), cap = $("pv-cap");
  const vid = (d.medias || []).find(m => m.kind === "video");
  if (d.media_type === "video" && (d.local_url || vid)) {
    const videoUrl = d.local_url || vid.url;
    box.innerHTML = `<video src="${esc(videoUrl)}" controls autoplay playsinline preload="metadata" poster="${esc(d.cover_url || "")}" referrerpolicy="no-referrer"></video>`;
    const video = box.querySelector("video");
    let triedRemote = !d.local_url || !vid || !vid.url;
    video.addEventListener("error", () => {
      if (video !== box.querySelector("video")) return;
      if (!triedRemote) {
        triedRemote = true;
        video.src = vid.url;
        video.load();
        return;
      }
      const reason = d.local_url && vid && vid.url
        ? "本地文件和原始链接均不可用"
        : (d.local_url ? "请检查本地文件是否完整" : "原始视频链接可能已失效");
      box.innerHTML = `<div class="pv-loading">视频加载失败,${reason}</div>`;
    });
  } else {
    const imgs = (d.medias || []).filter(m => m.kind === "image");
    const list = imgs.length ? imgs : (d.cover_url ? [{ url: d.cover_url }] : []);
    if (!list.length) {
      box.innerHTML = `<div class="pv-loading">暂无可预览的媒体</div>`;
    } else {
      PV_N = list.length; PV_I = 0;
      const slides = list.map(m => `<div class="pv-slide"><img src="${m.url}" referrerpolicy="no-referrer" alt=""></div>`).join("");
      const nav = PV_N > 1 ? `
        <button class="pv-arrow left" id="pv-prev" onclick="pvNav(-1)" aria-label="上一张">${ic("i-prev")}</button>
        <button class="pv-arrow right" id="pv-next" onclick="pvNav(1)" aria-label="下一张">${ic("i-next")}</button>
        <div class="pv-counter" id="pv-counter"></div>` : "";
      box.innerHTML = `<div class="pv-carousel"><div class="pv-track" id="pv-track">${slides}</div>${nav}</div>`;
      _pvBindSwipe();
      pvUpdate();
    }
  }
  cap.textContent = d.desc || "";
}
async function _pvOpen(fetcher, startIdx) {
  const ov = $("preview"), box = $("pv-media");
  const req = ++PV_REQ;
  PV_N = 0; PV_I = 0;
  box.innerHTML = `<div class="pv-loading">加载中…</div>`; $("pv-cap").textContent = "";
  ov.style.display = "flex";
  modalOpened(ov);
  setTimeout(() => ov.querySelector(".pv-close").focus(), 0);
  try {
    const data = await fetcher();
    if (req !== PV_REQ) return;
    _pvRender(data);
    if (startIdx && PV_N > 1) { PV_I = Math.max(0, Math.min(startIdx, PV_N - 1)); pvUpdate(); }
  }
  catch (e) {
    if (req === PV_REQ) box.innerHTML = `<div class="pv-loading">预览失败:${esc(e.message)}</div>`;
  }
}
function openPreview(id, startIdx) {
  return _pvOpen(() => api("/api/contents/" + id + "/media"), startIdx || 0);
}
function openPubPreview(accId, noteId, tok, src) {
  return _pvOpen(() => api(`/api/publish/note-media?account_id=${accId}&note_id=${encodeURIComponent(noteId)}&xsec_token=${encodeURIComponent(tok || "")}&xsec_source=${encodeURIComponent(src || "")}`));
}
async function openPubComments(accId, noteId, tok, src) {
  const ov = $("preview"), box = $("pv-media"), cap = $("pv-cap");
  const req = ++PV_REQ;
  PV_N = 0; PV_I = 0;
  box.innerHTML = `<div class="pv-loading">加载评论…</div>`; cap.textContent = ""; ov.style.display = "flex";
  modalOpened(ov);
  setTimeout(() => ov.querySelector(".pv-close").focus(), 0);
  try {
    const d = await api(`/api/publish/note-comments?account_id=${accId}&note_id=${encodeURIComponent(noteId)}&xsec_token=${encodeURIComponent(tok || "")}&xsec_source=${encodeURIComponent(src || "")}`);
    if (req !== PV_REQ) return;
    cap.textContent = `共 ${d.total} 条评论` + (d.has_more ? "(仅首页)" : "");
    box.innerHTML = `<div class="cmt-wrap">` + ((d.comments || []).map(c => `
      <div class="cmt-item">
        <div class="cmt-head"><b>${esc(c.user_nickname || "用户")}</b><span class="like">${ic("i-heart")}${fmtNum(c.like_count)}</span></div>
        <div class="cmt-text">${c.is_reply ? '<span class="mut">↳ </span>' : ""}${esc(c.text || "")}</div>
        <div class="cmt-time">${fmtTime(c.create_time)}</div>
      </div>`).join("") || `<div class="pv-loading">暂无评论</div>`) + `</div>`;
  } catch (e) {
    if (req === PV_REQ) box.innerHTML = `<div class="pv-loading">加载失败:${esc(e.message)}</div>`;
  }
}
function pvUpdate() {
  const tr = $("pv-track"); if (!tr) return;
  tr.style.transform = `translateX(-${PV_I * 100}%)`;
  const c = $("pv-counter"); if (c) c.textContent = `${PV_I + 1} / ${PV_N}`;
  const p = $("pv-prev"), n = $("pv-next");
  if (p) p.disabled = PV_I <= 0;
  if (n) n.disabled = PV_I >= PV_N - 1;
}
function pvNav(delta) {
  if (!PV_N) return;
  PV_I = Math.max(0, Math.min(PV_N - 1, PV_I + delta));
  pvUpdate();
}
function _pvBindSwipe() {
  const tr = $("pv-track"); if (!tr) return;
  let x0 = null;
  tr.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  tr.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) pvNav(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}
function hidePreview() {
  PV_REQ++;
  const v = $("pv-media").querySelector("video"); if (v) { try { v.pause(); } catch (e) {} }
  $("preview").style.display = "none"; $("pv-media").innerHTML = ""; $("pv-cap").textContent = "";
  PV_N = 0; PV_I = 0;
  modalClosed($("preview"));
}
document.addEventListener("keydown", e => {
  const modal = _visibleModal();
  if (!modal) return;
  if (e.key === "Tab") {
    const items = _modalFocusables(modal);
    if (!items.length) { e.preventDefault(); modal.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (modal === $("uimodal")) return; // 通用模态由 _uiKey 处理确认与取消
  if (e.key === "Escape") {
    e.preventDefault();
    if (modal === $("repost")) hideRepost();
    else if (modal === $("wcmodal")) hideWorkComments();
    else if (modal === $("collection-comments-modal")) hideCollectionComments();
    else if (modal === $("preview")) hidePreview();
    return;
  }
  if (modal === $("preview") && e.key === "ArrowLeft") pvNav(-1);
  else if (modal === $("preview") && e.key === "ArrowRight") pvNav(1);
});

