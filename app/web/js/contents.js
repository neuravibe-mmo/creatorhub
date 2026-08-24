// ─── 内容 ───
function fmtTime(unix) { return unix ? new Date(unix * 1000).toLocaleString() : "—"; }
function fmtDur(sec) { if (!sec) return ""; const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function fmtNum(n) { return n >= 10000 ? (n / 10000).toFixed(1) + "w" : (n || 0); }
function contentTimeCell(unix) {
  if (!unix) return `<span class="mut">—</span>`;
  const date = new Date(unix * 1000);
  const day = date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = date.toLocaleTimeString("zh-CN", { hour12: false });
  return `<div class="content-time"><span>${esc(day)}</span><span>${esc(time)}</span></div>`;
}
function contentStatusLabel(status) {
  return ({ pending: "等待中", downloading: "下载中", done: "已下载", failed: "失败", skipped: "仅记录" })[status] || status || "未知";
}

function contentPathMeta(r) {
  const raw = String(r.local_path || "").trim();
  if (!raw) return null;
  const splitAt = Math.max(raw.lastIndexOf("\\"), raw.lastIndexOf("/"));
  const parent = splitAt >= 0 ? raw.slice(0, splitAt) : "";
  let leaf = splitAt >= 0 ? raw.slice(splitAt + 1) : raw;
  const prefix = String(r.aweme_id || "") + "_";
  if (r.aweme_id && leaf.startsWith(prefix)) leaf = leaf.slice(prefix.length);
  const dot = leaf.lastIndexOf(".");
  const hasExt = dot > 0 && leaf.length - dot <= 10;
  const name = hasExt ? leaf.slice(0, dot) : leaf;
  const ext = hasExt ? leaf.slice(dot + 1).toUpperCase() : "";
  const dirs = parent.split(/[\\/]+/).filter(Boolean);
  return { name: name || leaf, ext, dir: dirs.slice(-2).join("\\") };
}
function contentPathCell(r) {
  const p = contentPathMeta(r);
  if (!p) return `<span class="local-path-empty">—</span>`;
  return `<div class="local-path">
    <div class="local-path-info">
      <div class="local-path-file"><span class="local-path-name">${esc(p.name)}</span>${p.ext ? `<span class="local-path-ext">${esc(p.ext)}</span>` : ""}</div>
      <div class="local-path-dir">${esc(p.dir || "当前目录")}</div>
    </div>
    <button type="button" class="ghost local-path-action reveal" onclick="revealContentPath(${r.id},this)" data-tip="在文件夹中显示" aria-label="在文件夹中显示">${ic("i-folder")}</button>
  </div>`;
}
async function revealContentPath(id, btn) {
  const old = btn && btn.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spin"></span>`; }
  try {
    await api(`/api/contents/${id}/reveal`, {
      method: "POST", headers: { "X-CreatorHub-Local-Action": "reveal" },
    });
    toast("已在文件夹中显示", "ok", 1800);
  } catch (e) {
    toast("打开文件夹失败:" + e.message, "err");
  } finally {
    if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = old; }
  }
}

// ─── 批量选择 ───
const selContent = new Set(), selComment = new Set();
function pruneSel(set, ids) { const p = new Set(ids); [...set].forEach(id => { if (!p.has(id)) set.delete(id); }); }
const CONTENT_CBS = '#content-table input[type="checkbox"], #content-cards input[type="checkbox"]';
function contentToggleOne(id, on) { on ? selContent.add(id) : selContent.delete(id); updateContentSelBar(); }
function contentToggleAll(on) { document.querySelectorAll(CONTENT_CBS).forEach(cb => { const id = +cb.dataset.id; if (!id) return; cb.checked = on; on ? selContent.add(id) : selContent.delete(id); }); updateContentSelBar(); }
function contentSelAllToggle() {
  const ids = [...document.querySelectorAll(CONTENT_CBS)].map(cb => +cb.dataset.id).filter(Boolean);
  const allSel = ids.length > 0 && ids.every(id => selContent.has(id));
  contentToggleAll(!allSel);
}
function contentSelClear() { selContent.clear(); const sa = $("content-selall"); if (sa) sa.checked = false; refreshContents(); }
function updateContentSelBar() {
  const n = selContent.size;
  $("content-selcount").textContent = "已选 " + n;
  $("content-selbar").style.display = n ? "inline-flex" : "none";
  const ids = [...document.querySelectorAll(CONTENT_CBS)].map(cb => +cb.dataset.id).filter(Boolean);
  const allSel = ids.length > 0 && ids.every(id => selContent.has(id));
  const selectedOnPage = ids.filter(id => selContent.has(id)).length;
  const btn = $("content-selall-btn"); if (btn) btn.textContent = allSel ? "取消全选" : "全选";
  const sa = $("content-selall"); if (sa) { sa.checked = allSel; sa.indeterminate = selectedOnPage > 0 && !allSel; }
}
async function contentBatchDelete() {
  if (!selContent.size) return;
  if (!await uiConfirm({ title: "批量删除作品", message: `删除选中的 ${selContent.size} 条作品及其本地文件?`, okText: "删除", danger: true })) return;
  try { const r = await api("/api/contents/batch-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selContent], with_file: true }) }); toast(`已删除 ${r.deleted} 条(清理 ${r.files_removed} 个文件)`, "ok"); selContent.clear(); refreshContents(); }
  catch (e) { toast("批量删除失败:" + e.message, "err"); }
}
const COMMENT_CBS = '#comment-table input[type="checkbox"]';
function commentToggleOne(id, on) { on ? selComment.add(id) : selComment.delete(id); updateCommentSelBar(); }
function commentToggleAll(on) { document.querySelectorAll(COMMENT_CBS).forEach(cb => { const id = +cb.dataset.id; if (!id) return; cb.checked = on; on ? selComment.add(id) : selComment.delete(id); }); updateCommentSelBar(); }
function commentSelAllToggle() {
  const ids = [...document.querySelectorAll(COMMENT_CBS)].map(cb => +cb.dataset.id).filter(Boolean);
  const allSel = ids.length > 0 && ids.every(id => selComment.has(id));
  commentToggleAll(!allSel);
}
function commentSelClear() { selComment.clear(); const sa = $("comment-selall"); if (sa) sa.checked = false; refreshComments(); }
function updateCommentSelBar() {
  const n = selComment.size; const c = $("comment-selcount"), b = $("comment-batchbtn");
  c.textContent = "已选 " + n; c.style.display = n ? "inline" : "none"; b.style.display = n ? "inline-flex" : "none";
  const ids = [...document.querySelectorAll(COMMENT_CBS)].map(cb => +cb.dataset.id).filter(Boolean);
  const allSel = ids.length > 0 && ids.every(id => selComment.has(id));
  const selectedOnPage = ids.filter(id => selComment.has(id)).length;
  const btn = $("comment-selall-btn"); if (btn) btn.textContent = allSel ? "取消全选" : "全选";
  const sa = $("comment-selall"); if (sa) { sa.checked = allSel; sa.indeterminate = selectedOnPage > 0 && !allSel; }
}
async function commentBatchDelete() {
  if (!selComment.size) return;
  if (!await uiConfirm({ title: "批量删除评论", message: `删除选中的 ${selComment.size} 条评论?`, okText: "删除", danger: true })) return;
  try { const r = await api("/api/comments/batch-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selComment] }) }); toast(`已删除 ${r.deleted} 条评论`, "ok"); selComment.clear(); refreshComments(); }
  catch (e) { toast("批量删除失败:" + e.message, "err"); }
}

function srcOf(r) {
  const t = monitorById(r.target_id);
  return t ? `<div style="margin:0 0 8px">${sourceMeta(t)}</div>` : "";
}
function noteCard(r) {
  const typeIc = r.media_type === "images" ? "i-image" : "i-play";
  const typeLabel = r.media_type === "images" ? "图文" : "视频";
  const cover = r.cover_url
    ? `<img class="ncard-cover" src="${r.cover_url}" alt="${esc((r.desc || "笔记").slice(0, 20))}" referrerpolicy="no-referrer" loading="lazy" onclick="openPreview(${r.id})">`
    : `<div class="ncard-cover ph" onclick="openPreview(${r.id})">${ic("i-image")}</div>`;
  return `<div class="ncard">
    ${cover}
    <span class="ncard-type">${ic(typeIc)}${typeLabel}</span>
    <input type="checkbox" class="ncard-sel" data-id="${r.id}" aria-label="选择" onchange="contentToggleOne(${r.id}, this.checked)" ${selContent.has(r.id) ? "checked" : ""}>
    <div class="ncard-body">
      <p class="ncard-title">${esc(r.desc || "(无标题)")}</p>
      ${srcOf(r)}
      <div class="ncard-foot">
        <span>${fmtTime(r.create_time)}</span>
        <span class="like">${ic("i-heart")}${fmtNum(r.like_count)}</span>
      </div>
      <div class="ncard-actions">
        <span class="pill ${r.download_status}" style="flex:1;justify-content:center" title="${esc(r.error || "")}">${contentStatusLabel(r.download_status)}${r.error ? " ⓘ" : ""}</span>
        ${["failed", "skipped"].includes(r.download_status) ? `<button class="ghost sm" onclick="retryDl(${r.id})">${r.download_status === "skipped" ? "下载" : "重试"}</button>` : ""}
        ${(PLATFORM === "xhs" && r.download_status === "done") ? `<button class="ghost sm" onclick="repostDouyin(${r.id})">发抖音</button>` : ""}
        <button class="ghost sm danger" onclick="delContent(${r.id})">${ic("i-trash")}删除</button>
      </div>
    </div>
  </div>`;
}
function renderContentPager(meta) {
  const pager = $("content-pager");
  if (!pager) return;
  const total = Math.max(0, Number(meta && meta.total || 0));
  const pageSize = Math.max(1, Number(meta && meta.page_size || CONTENT_PAGE_SIZE));
  const pages = Math.max(1, Number(meta && meta.pages || Math.ceil(total / pageSize) || 1));
  const page = Math.max(1, Number(meta && meta.page || CONTENT_PAGE));
  CONTENT_TOTAL = total;
  CONTENT_PAGE_SIZE = pageSize;
  CONTENT_PAGE = page;
  if ($("content-page-size")) $("content-page-size").value = String(pageSize);
  if ($("content-page-input")) {
    $("content-page-input").value = String(page);
    $("content-page-input").max = String(pages);
  }
  if ($("content-page-info")) $("content-page-info").textContent =
    "第 " + page + " / " + pages + " 页 · 共 " + fmtNum(total) + " 条";
  if ($("content-first")) $("content-first").disabled = page <= 1;
  if ($("content-prev")) $("content-prev").disabled = page <= 1;
  if ($("content-next")) $("content-next").disabled = page >= pages;
  if ($("content-last")) $("content-last").disabled = page >= pages;
  pager.hidden = total <= pageSize;
}
function contentPageCount() {
  return Math.max(1, Math.ceil(CONTENT_TOTAL / CONTENT_PAGE_SIZE));
}
function goContentPage(page) {
  const pages = contentPageCount();
  const target = page <= 0 ? pages : Math.min(pages, Math.max(1, Math.round(Number(page) || 1)));
  if (target === CONTENT_PAGE) return;
  CONTENT_PAGE = target;
  refreshContents();
}
function changeContentPage(delta) { goContentPage(CONTENT_PAGE + Number(delta || 0)); }
function jumpContentPage() {
  const input = $("content-page-input");
  const value = input ? Number(input.value) : 1;
  if (!Number.isFinite(value) || value < 1) {
    if (input) { input.value = String(CONTENT_PAGE); input.focus(); }
    return;
  }
  goContentPage(value);
}
function handleContentPageInput(event) {
  if (event && event.key === "Enter") { event.preventDefault(); jumpContentPage(); }
}
function setContentPageSize() {
  const value = +(($('content-page-size') && $('content-page-size').value) || 10);
  CONTENT_PAGE_SIZE = [10, 20, 50, 100, 200].includes(value) ? value : 10;
  CONTENT_PAGE = 1;
  refreshContents();
}
async function refreshContents(resetPage = false) {
  if (resetPage) CONTENT_PAGE = 1;
  const params = new URLSearchParams({
    platform: PLATFORM, page: String(CONTENT_PAGE),
    page_size: String(CONTENT_PAGE_SIZE), paginate: "true",
  });
  if (CONTENT_SRC) params.set("target_id", CONTENT_SRC);
  if (CONTENT_GROUP) params.set("group_name", CONTENT_GROUP);
  if (CONTENT_TAG) params.set("tag", CONTENT_TAG);
  const query = (($('content-search') && $('content-search').value) || "").trim();
  const mediaType = ($('content-type') && $('content-type').value) || "";
  const status = ($('content-status') && $('content-status').value) || "";
  const minLikes = +(($('content-min-likes') && $('content-min-likes').value) || 0);
  const minComments = +(($('content-min-comments') && $('content-min-comments').value) || 0);
  if (query) params.set("q", query);
  if (mediaType) params.set("media_type", mediaType);
  if (status) params.set("download_status", status);
  if (Number.isFinite(minLikes) && minLikes > 0) params.set("min_like_count", String(Math.floor(minLikes)));
  if (Number.isFinite(minComments) && minComments > 0) params.set("min_comment_count", String(Math.floor(minComments)));
  params.set("sort", ($('content-sort') && $('content-sort').value) || "create_desc");
  const payload = await api("/api/contents?" + params.toString());
  const meta = Array.isArray(payload)
    ? { items: payload, total: payload.length, page: 1, page_size: CONTENT_PAGE_SIZE,
        pages: Math.max(1, Math.ceil(payload.length / CONTENT_PAGE_SIZE)) }
    : (payload || {});
  const pages = Math.max(1, Number(meta.pages || 1));
  if (CONTENT_PAGE > pages) { CONTENT_PAGE = pages; return refreshContents(); }
  const rows = Array.isArray(meta.items) ? meta.items : [];
  CONTENTS = rows;
  $("stat-dl").textContent = rows.filter(r => r.download_status === "done").length;
  if ($("content-filter-count")) $("content-filter-count").textContent =
    `显示 ${rows.length} / ${Number(meta.total || rows.length)}`;
  const xhs = PLATFORM === "xhs";
  $("content-title").textContent = xhs ? "最新笔记 / 下载状态" : "最新作品 / 下载状态";
  $("content-table-wrap").style.display = xhs ? "none" : "";
  $("content-cards").style.display = xhs ? "" : "none";
  if (xhs) {
    $("content-cards").innerHTML = rows.map(noteCard).join("")
      || `<div class="empty" style="columns:1">${ic("i-image")}<div class="empty-t">暂无笔记</div></div>`;
    updateContentSelBar(); renderContentPager(meta);
    return;
  }
  $("content-table").innerHTML = rows.map(r => {
    const monitor = monitorById(r.target_id);
    const description = esc(r.desc || "(无描述)");
    return `<tr>
      <td class="content-check-cell"><input type="checkbox" data-id="${r.id}" onchange="contentToggleOne(${r.id}, this.checked)" ${selContent.has(r.id) ? "checked" : ""}></td>
      <td class="content-cover-cell">${r.cover_url ? `<img class="thumb" src="${r.cover_url}" alt="封面" referrerpolicy="no-referrer" onclick="openPreview(${r.id})">` : `<span class="content-cover-empty">${ic(r.media_type === "images" ? "i-image" : "i-film")}</span>`}</td>
      <td class="content-desc-cell">
        <div class="content-desc-text" title="${description}">${description}</div>
        ${monitor ? `<div class="content-desc-meta">${sourceMeta(monitor)}</div>` : ""}
      </td>
      <td><span class="content-kind">${r.media_type === "images" ? "图集" : "视频"}</span>${r.quality ? `<span class="content-quality">${esc(r.quality)}</span>` : ""}</td>
      <td class="mut num">${contentTimeCell(r.create_time)}</td>
      <td class="content-metrics num"><span class="metric like">${ic("i-heart")}${fmtNum(r.like_count)}</span>${r.duration ? `<span class="metric">${ic("i-clock")}${fmtDur(r.duration)}</span>` : ""}</td>
      <td class="content-action-cell">
        <div class="content-status-row"><span class="pill ${r.download_status}">${contentStatusLabel(r.download_status)}</span>${r.error ? `<span class="warn-ic" data-tip="${esc(r.error)}">${ic("i-info")}</span>` : ""}</div>
        <div class="content-action-buttons">
          ${["failed", "skipped"].includes(r.download_status) ? `<button class="ghost sm" onclick="retryDl(${r.id})">${r.download_status === "skipped" ? "下载" : "重试"}</button>` : ""}
          ${(PLATFORM === "douyin" && r.download_status === "done") ? `<button class="ghost sm content-action-primary" onclick="pickRepostTarget(${r.id})">${ic("i-send")}转发</button>` : ""}
          ${(PLATFORM === "xhs" && r.download_status === "done") ? `<button class="ghost sm content-action-primary" onclick="repostDouyin(${r.id})">${ic("i-send")}发抖音</button>` : ""}
          <button class="ghost sm content-action-delete danger" onclick="delContent(${r.id})" data-tip="删除作品" aria-label="删除作品">${ic("i-trash")}</button>
        </div>
      </td>
      <td class="local-path-cell">${contentPathCell(r)}</td>
    </tr>`;
  }).join("") || empty(8, "暂无作品", "i-film", "监控目标有新作品时会自动抓取并下载,显示在这里");
  updateContentSelBar(); renderContentPager(meta);
}
async function retryDl(id) {
  const btn = event.target.closest("button"); btn.disabled = true; btn.textContent = "重试中…";
  try { await api("/api/contents/" + id + "/retry-download", { method: "POST" }); toast("已重新加入下载队列", "ok"); }
  catch (e) { toast("重试失败:" + e.message, "err"); }
  setTimeout(() => refreshContents(), 1200);
}
async function delContent(id) {
  if (!await uiConfirm({ title: "删除作品", message: "删除这条作品记录及其已下载的本地文件?", okText: "删除", danger: true })) return;
  try { const r = await api("/api/contents/" + id + "?with_file=true", { method: "DELETE" }); toast(`已删除(清理 ${r.files_removed} 个文件)`, "ok"); refreshContents(); }
  catch (e) { toast("删除失败:" + e.message, "err"); }
}

