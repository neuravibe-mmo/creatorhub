// ─── 下载设置 ───
async function loadSettings() {
  try {
    const s = await api("/api/settings");
    $("dl-dir").value = s.download_dir || "";
    $("dl-quality").value = s.video_quality || "highest";
    if ($("ai-enabled")) {
      $("ai-enabled").checked = !!s.ai_enabled;
      $("ai-base").value = s.ai_base_url || "";
      $("ai-model").value = s.ai_model || "";
      $("ai-temp").value = s.ai_temperature || "0.9";
      $("ai-prompt").value = s.ai_prompt || "";
      $("ai-key").placeholder = s.ai_api_key_set ? "已保存(留空=不修改)" : "API Key";
    }
    csSyncAll();
  } catch (e) {}
}
async function saveAiSettings() {
  if (!validateAiSettings(false)) return;
  $("ai-msg").textContent = "保存中…";
  const body = {
    ai_enabled: $("ai-enabled").checked, ai_base_url: $("ai-base").value.trim(),
    ai_model: $("ai-model").value.trim(), ai_temperature: $("ai-temp").value.trim() || "0.9",
    ai_prompt: $("ai-prompt").value,
  };
  const key = $("ai-key").value.trim();
  if (key) body.ai_api_key = key;
  try {
    const s = await api("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    $("ai-key").value = ""; $("ai-key").placeholder = s.ai_api_key_set ? "已保存(留空=不修改)" : "API Key";
    $("ai-msg").textContent = "已保存 ✓ " + (s.ai_enabled ? "(规则勾选「用 AI」即生效)" : "(当前未启用)");
    toast("AI 设置已保存", "ok");
  } catch (e) { $("ai-msg").textContent = "失败: " + e.message; toast("保存失败:" + e.message, "err"); }
}
async function testAi() {
  const btn = evtBtn();
  if (!validateAiSettings(true)) return;
  $("ai-msg").textContent = "测试中…";
  // 用当前表单值测(key 留空则用已保存的),方便保存前先验证
  const body = {
    base_url: $("ai-base").value.trim(), model: $("ai-model").value.trim(),
    prompt: $("ai-prompt").value, temperature: $("ai-temp").value.trim() || "0.9",
  };
  const key = $("ai-key").value.trim();
  if (key) body.api_key = key;
  await withBusy(btn, "测试中", async () => {
    try {
      const r = await api("/api/settings/ai-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { $("ai-msg").innerHTML = `连通正常 ✓ 样例文案:<b>${esc(r.sample || "")}</b>`; toast("AI 连通正常 ✓", "ok", 6000); }
      else { $("ai-msg").textContent = "连通失败:" + (r.error || ""); toast("AI 连通失败:" + (r.error || ""), "err", 8000); }
    } catch (e) { $("ai-msg").textContent = "失败:" + e.message; toast("测试失败:" + e.message, "err"); }
  });
}
async function saveSettings() {
  $("dl-msg").textContent = "保存中…";
  try {
    const s = await api("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ download_dir: $("dl-dir").value.trim(), video_quality: $("dl-quality").value }),
    });
    $("dl-dir").value = s.download_dir || "";
    $("dl-quality").value = s.video_quality || "highest";
    csSyncAll();
    $("dl-msg").textContent = "已保存 ✓ 新作品将按此设置下载";
    toast("下载设置已保存", "ok");
  } catch (e) { $("dl-msg").textContent = "失败: " + e.message; toast("保存失败:" + e.message, "err"); }
}
const QMAP = { "": "默认", highest: "原画", "1080": "1080P", "720": "720P", "540": "540P", lowest: "省流" };

// ─── 通用分享链接下载 ───
let SHARE_LINKS = [], SHARE_LINK_INDEX = 0, SHARE_SOURCE = "", SHARE_ACCOUNTS = [];
let SHARE_HISTORY = [], SHARE_HISTORY_PAGE = 1, SHARE_HISTORY_PAGE_SIZE = 10, SHARE_HISTORY_TOTAL = 0;
const selShareHistory = new Set();

async function loadShareAccounts() {
  const sel = $("sd-account");
  if (!sel) return;
  try {
    SHARE_ACCOUNTS = await api("/api/accounts");
    filterShareAccounts();
  } catch (e) {}
}

function setShareLinkIndex(index) {
  SHARE_LINK_INDEX = Number(index) || 0;
  filterShareAccounts();
}

function shareAccountPlatform() {
  const platform = (SHARE_LINKS[SHARE_LINK_INDEX] || {}).platform || "";
  // 链接识别名与账号表平台名的少量映射。
  return platform === "wechat" ? "shipinhao" : platform;
}

function filterShareAccounts() {
  const sel = $("sd-account");
  if (!sel) return;
  const old = sel.value;
  const platform = shareAccountPlatform();
  const hasDetectedLink = !!SHARE_LINKS.length;
  const knownAccountPlatform = ["douyin", "xhs", "kuaishou", "shipinhao"].includes(platform);
  const rows = knownAccountPlatform
    ? SHARE_ACCOUNTS.filter(a => a.platform === platform)
    : [];
  const platformLabel = PF_NAME[platform] || platform || "";
  const emptyLabel = !hasDetectedLink
    ? "先识别链接，再选择对应平台账号"
    : knownAccountPlatform
      ? `不使用${platformLabel}账号登录态`
      : "该链接无需或暂无可复用账号";
  sel.innerHTML =
    `<option value="">${esc(emptyLabel)}</option>` +
    rows.map(a =>
      `<option value="${a.id}">${esc(PF_NAME[a.platform] || a.platform || "账号")} · ${esc(a.nickname || ("账号 " + a.id))}${a.status === "invalid" ? "（登录态可能失效）" : ""}</option>`
    ).join("");

  if (rows.some(a => String(a.id) === old)) {
    sel.value = old;
  } else {
    // 已识别为具体平台且只有一个可用账号时直接选中，图文下载无需用户再手选。
    const active = rows.filter(a => a.status !== "invalid");
    if (knownAccountPlatform && active.length === 1) sel.value = String(active[0].id);
  }
  csSyncAll();
}

function renderShareLinks(links) {
  const box = $("sd-links");
  SHARE_LINKS = links || [];
  SHARE_LINK_INDEX = Math.min(SHARE_LINK_INDEX, Math.max(0, SHARE_LINKS.length - 1));
  filterShareAccounts();
  if (!SHARE_LINKS.length) {
    box.style.display = "block";
    box.innerHTML = `<b>未识别到链接。</b> 请检查是否粘贴了完整分享内容。`;
    return;
  }
  const labels = SHARE_LINKS.map((link, i) => `
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:8px;cursor:pointer">
      <input type="radio" name="sd-link" value="${i}" ${i === SHARE_LINK_INDEX ? "checked" : ""}
        onchange="setShareLinkIndex(this.value)" style="width:auto;margin-top:3px">
      <span><b>${esc(link.platform === "generic" ? "通用站点" : (PF_NAME[link.platform] || link.platform))}</b>
      · ${esc(link.host)}<br><code style="word-break:break-all">${esc(link.url)}</code></span>
    </label>`).join("");
  box.style.display = "block";
  box.innerHTML = `<b>已识别 ${SHARE_LINKS.length} 条候选链接</b>${labels}`;
}

async function parseShareLinks(button = null) {
  const text = $("sd-text").value.trim();
  if (!text) { toast("请粘贴分享链接或完整分享文案", "err"); return null; }
  const btn = button || evtBtn();
  $("sd-msg").textContent = "正在清洗文案并识别链接…";
  return await withBusy(btn, "识别中", async () => {
    try {
      const result = await api("/api/share-download/links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_text: text }),
      });
      SHARE_SOURCE = text;
      renderShareLinks(result.links);
      $("sd-msg").textContent = result.count ? `已识别 ${result.count} 条链接 ✓` : "未识别到链接";
      if (!result.count) toast("没有识别到 http(s) 链接", "err");
      return result;
    } catch (e) {
      $("sd-msg").textContent = "识别失败：" + e.message;
      toast("识别失败：" + e.message, "err");
      return null;
    }
  });
}

function shareRequestBody(download) {
  const text = $("sd-text").value.trim();
  const maxSize = Number($("sd-max-size").value || 0);
  const accountId = Number($("sd-account").value || 0);
  return {
    share_text: text,
    download,
    all_links: $("sd-all-links").checked,
    link_index: SHARE_LINK_INDEX,
    quality: $("sd-quality").value,
    output_dir: $("sd-dir").value.trim() || null,
    save_metadata: $("sd-metadata").checked,
    save_thumbnail: $("sd-thumbnail").checked,
    save_subtitles: $("sd-subtitles").checked,
    max_filesize_mb: Number.isFinite(maxSize) && maxSize > 0 ? Math.floor(maxSize) : 0,
    account_id: accountId || null,
  };
}

function fmtShareSize(bytes) {
  let n = Number(bytes || 0);
  if (n < 1024) return n + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return n.toFixed(n >= 10 ? 1 : 2) + " " + units[i];
}

function copySharePath(button) {
  const value = button.dataset.path || "";
  navigator.clipboard.writeText(value).then(
    () => toast("本地路径已复制", "ok"),
    () => toast("复制失败，请手动复制路径", "err")
  );
}

function fmtShareHistoryTime(value) {
  if (!value) return "—";
  let text = String(value);
  if (!/[zZ]$|[+-]\d\d:\d\d$/.test(text)) text += "Z";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function shareHistoryMetadata(row) {
  return row && row.metadata && typeof row.metadata === "object" ? row.metadata : {};
}
function shareHistoryNumber(row, key) {
  const raw = row && row[key] != null ? row[key] : shareHistoryMetadata(row)[key];
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}
function shareHistoryTitle(row) {
  const metadata = shareHistoryMetadata(row);
  return String((row && (row.desc || row.title)) || metadata.title || metadata.description ||
    ((row && row.status) === "failed" ? "下载失败" : "未命名作品"));
}
function shareHistoryType(row) {
  const value = String((row && (row.media_type || row.type)) || shareHistoryMetadata(row).media_type || "").toLowerCase();
  return value === "images" || value === "image" || value === "图文" ? "images" : value === "video" || value === "视频" ? "video" : value;
}
function shareHistoryCreateTime(row) {
  const direct = Number(row && row.create_time || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const metadata = shareHistoryMetadata(row);
  const timestamp = Number(metadata.timestamp || 0);
  if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;
  const uploadDate = String(metadata.upload_date || "");
  if (/^\d{8}$/.test(uploadDate)) {
    const date = new Date(`${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return Math.floor(date.getTime() / 1000);
  }
  return 0;
}
function shareHistoryQuality(row) {
  const metadata = shareHistoryMetadata(row);
  const raw = String((row && row.quality) || metadata.format || metadata.format_id || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const width = Number(row && row.width || metadata.width || 0);
  const height = Number(row && row.height || metadata.height || 0);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) return `${width}×${height}`;
  const level = raw.match(/(?:^|[_\s-])(\d{3,4})p(?:$|[_\s-])/i);
  if (level) return `${level[1]}P`;
  return raw.length > 14 ? `${raw.slice(0, 13)}…` : raw;
}
function shareHistoryPlatform(row) {
  return String((row && row.platform) || shareHistoryMetadata(row).platform || "generic");
}
function shareHistoryFiles(row) {
  return Array.isArray(row && row.files) ? row.files.filter(file => file && typeof file === "object") : [];
}
function shareHistoryMediaFiles(row) {
  return shareHistoryFiles(row).filter(file => file.role === "media");
}
function shareHistoryFirstPath(row) {
  const files = shareHistoryMediaFiles(row);
  const first = files[0] || shareHistoryFiles(row)[0] || {};
  return String(first.path || first.relative_path || "");
}
function shareHistoryPathCell(row) {
  const path = shareHistoryFirstPath(row);
  if (!path) return `<span class="local-path-empty">—</span>`;
  const p = contentPathMeta({ local_path: path, aweme_id: row.item_id });
  const files = shareHistoryFiles(row);
  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const fileHint = files.length > 1
    ? `${files.length} 个文件${totalSize ? ` · ${fmtShareSize(totalSize)}` : ""}`
    : (totalSize ? fmtShareSize(totalSize) : "");
  return `<div class="local-path">
    <div class="local-path-info">
      <div class="local-path-file"><span class="local-path-name">${esc(p ? p.name : path)}</span>${p && p.ext ? `<span class="local-path-ext">${esc(p.ext)}</span>` : ""}</div>
      <div class="local-path-dir">${esc(p ? (p.dir || "当前目录") : "当前目录")}</div>
      ${fileHint ? `<span class="share-history-file-count">${esc(fileHint)}</span>` : ""}
    </div>
    <button type="button" class="ghost local-path-action reveal" onclick="revealShareHistoryPath(${Number(row.id)},this)" data-tip="在文件夹中显示" aria-label="在文件夹中显示">${ic("i-folder")}</button>
  </div>`;
}
function populateShareHistoryFacets() {
  const select = $("sd-history-platform");
  if (!select) return;
  const old = select.value;
  const platforms = [...new Set(SHARE_HISTORY.map(shareHistoryPlatform).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  select.innerHTML = `<option value="">全部平台</option>` + platforms.map(platform =>
    `<option value="${esc(platform)}">${esc(PF_NAME[platform] || (platform === "generic" ? "通用站点" : platform))}</option>`).join("");
  select.value = platforms.includes(old) ? old : "";
  if (select._csSync) select._csSync();
}
function shareHistoryFilteredRows() {
  const query = (($('sd-history-search') && $('sd-history-search').value) || "").trim().toLocaleLowerCase();
  const platform = ($('sd-history-platform') && $('sd-history-platform').value) || "";
  const type = ($('sd-history-type') && $('sd-history-type').value) || "";
  const status = ($('sd-history-status') && $('sd-history-status').value) || "";
  return SHARE_HISTORY.filter(row => {
    if (platform && shareHistoryPlatform(row) !== platform) return false;
    if (type && shareHistoryType(row) !== type) return false;
    if (status && (row.status || row.download_status) !== status) return false;
    if (!query) return true;
    const metadata = shareHistoryMetadata(row);
    return [shareHistoryTitle(row), row.author, row.item_id, row.source_url, metadata.uploader, metadata.channel]
      .filter(Boolean).join(" ").toLocaleLowerCase().includes(query);
  });
}
function shareHistoryStatus(row) {
  const value = String((row && (row.status || row.download_status)) || "failed");
  return ["done", "failed"].includes(value) ? value : "failed";
}
function shareHistoryRow(row) {
  const metadata = shareHistoryMetadata(row);
  const type = shareHistoryType(row);
  const typeName = type === "images" ? "图文" : type === "video" ? "视频" : (row.media_type || "媒体");
  const status = shareHistoryStatus(row);
  const platform = shareHistoryPlatform(row);
  const platformName = PF_NAME[platform] || (platform === "generic" ? "通用站点" : platform || "通用站点");
  const cover = row.cover_url || metadata.thumbnail || "";
  const title = shareHistoryTitle(row);
  const author = row.author || metadata.uploader || metadata.channel || "";
  const itemId = row.item_id || row.aweme_id || metadata.id || "";
  const createTime = shareHistoryCreateTime(row);
  const likeCount = shareHistoryNumber(row, "like_count");
  const commentCount = shareHistoryNumber(row, "comment_count");
  const duration = shareHistoryNumber(row, "duration");
  const mediaCount = shareHistoryMediaFiles(row).length || Number(row.media_count || 0);
  const files = shareHistoryFiles(row);
  const error = row.error ? `<span class="warn-ic" data-tip="${esc(row.error)}">${ic("i-info")}</span>` : "";
  const downloadTime = row.created_at ? fmtShareHistoryTime(row.created_at) : "";
  const descriptionMeta = `<div class="share-history-meta">
    <span class="src-chip" title="${esc(platformName)}">${ic("i-link")}${esc(platformName)}</span>
    ${author ? `<span class="share-history-author" title="${esc(author)}">${esc(author)}</span>` : ""}
    ${itemId ? `<span class="share-history-id" title="ID ${esc(itemId)}">ID ${esc(itemId)}</span>` : ""}
    ${downloadTime ? `<span class="share-history-download-time" title="下载于 ${esc(downloadTime)}">下载于 ${esc(downloadTime)}</span>` : ""}
  </div>`;
  const quality = shareHistoryQuality(row);
  return `<tr>
    <td class="content-check-cell"><input type="checkbox" data-id="${Number(row.id)}" onchange="shareHistoryToggleOne(${Number(row.id)},this.checked)" ${selShareHistory.has(row.id) ? "checked" : ""} aria-label="选择下载记录"></td>
    <td class="content-cover-cell">${cover ? `<img class="thumb" src="${esc(cover)}" alt="${esc(title.slice(0, 20))}" referrerpolicy="no-referrer" loading="lazy" onclick="openShareHistoryPreview(${Number(row.id)})">` : `<span class="content-cover-empty" onclick="openShareHistoryPreview(${Number(row.id)})">${ic(type === "images" ? "i-image" : "i-film")}</span>`}</td>
    <td class="content-desc-cell"><div class="content-desc-text" title="${esc(title)}">${esc(title)}</div>${descriptionMeta}</td>
    <td><span class="content-kind">${esc(typeName)}</span>${quality ? `<span class="content-quality">${esc(quality)}</span>` : ""}${mediaCount ? `<span class="content-quality">${mediaCount} 个媒体</span>` : ""}</td>
    <td class="mut num">${contentTimeCell(createTime)}</td>
    <td class="content-metrics num"><span class="metric like">${ic("i-heart")}${fmtNum(likeCount)}</span>${commentCount ? `<span class="metric">${ic("i-msg")}${fmtNum(commentCount)}</span>` : ""}${duration ? `<span class="metric">${ic("i-clock")}${fmtDur(duration)}</span>` : ""}${!files.length && mediaCount ? `<span class="metric">${ic("i-film")}${mediaCount}</span>` : ""}</td>
    <td class="content-action-cell"><div class="content-status-row"><span class="pill ${status}">${contentStatusLabel(status)}</span>${error}</div><div class="content-action-buttons"><button class="ghost sm content-action-delete danger" onclick="deleteShareHistory(${Number(row.id)})" data-tip="删除记录" aria-label="删除下载记录">${ic("i-trash")}</button></div>${row.error ? `<div class="mut" style="max-width:180px;white-space:normal;margin-top:5px">${esc(row.error)}</div>` : ""}</td>
    <td class="local-path-cell">${shareHistoryPathCell(row)}</td>
  </tr>`;
}
function renderShareHistoryPager(total) {
  const pager = $("sd-history-pager");
  if (!pager) return;
  const pages = Math.max(1, Math.ceil(total / SHARE_HISTORY_PAGE_SIZE));
  if ($("sd-history-page-size")) $("sd-history-page-size").value = String(SHARE_HISTORY_PAGE_SIZE);
  if ($("sd-history-page-input")) {
    $("sd-history-page-input").value = String(SHARE_HISTORY_PAGE);
    $("sd-history-page-input").max = String(pages);
  }
  $("sd-history-page-info").textContent = `第 ${SHARE_HISTORY_PAGE} / ${pages} 页 · 共 ${fmtNum(total)} 条`;
  $("sd-history-first").disabled = SHARE_HISTORY_PAGE <= 1;
  $("sd-history-prev").disabled = SHARE_HISTORY_PAGE <= 1;
  $("sd-history-next").disabled = SHARE_HISTORY_PAGE >= pages;
  $("sd-history-last").disabled = SHARE_HISTORY_PAGE >= pages;
  pager.hidden = total <= SHARE_HISTORY_PAGE_SIZE;
}
function updateShareHistorySelBar() {
  const count = selShareHistory.size;
  $("sd-history-selcount").textContent = "已选 " + count;
  $("sd-history-selbar").style.display = count ? "inline-flex" : "none";
  const ids = [...document.querySelectorAll('#sd-history-body input[type="checkbox"]')].map(cb => +cb.dataset.id).filter(Boolean);
  const allSelected = ids.length > 0 && ids.every(id => selShareHistory.has(id));
  const selectedOnPage = ids.filter(id => selShareHistory.has(id)).length;
  const toggle = $("sd-history-selall-btn"); if (toggle) toggle.textContent = allSelected ? "取消全选" : "全选";
  const checkbox = $("sd-history-selall"); if (checkbox) { checkbox.checked = allSelected; checkbox.indeterminate = selectedOnPage > 0 && !allSelected; }
}
function renderShareHistoryRows(resetPage = false) {
  if (resetPage) SHARE_HISTORY_PAGE = 1;
  const body = $("sd-history-body");
  if (!body) return;
  const rows = shareHistoryFilteredRows();
  const pages = Math.max(1, Math.ceil(rows.length / SHARE_HISTORY_PAGE_SIZE));
  if (SHARE_HISTORY_PAGE > pages) { SHARE_HISTORY_PAGE = pages; return renderShareHistoryRows(); }
  SHARE_HISTORY_TOTAL = rows.length;
  const start = (SHARE_HISTORY_PAGE - 1) * SHARE_HISTORY_PAGE_SIZE;
  const pageRows = rows.slice(start, start + SHARE_HISTORY_PAGE_SIZE);
  $("sd-history-count").textContent = `${SHARE_HISTORY.length} 条`;
  if ($("sd-history-filter-count")) $("sd-history-filter-count").textContent = `显示 ${rows.length} / ${SHARE_HISTORY.length}`;
  body.innerHTML = pageRows.map(shareHistoryRow).join("") || empty(8, rows.length ? "暂无下载历史" : (SHARE_HISTORY.length ? "没有匹配的下载历史" : "暂无下载历史"), "i-download", SHARE_HISTORY.length ? "调整筛选条件" : "开始下载后会自动记录；旧下载会从元数据文件补录");
  updateShareHistorySelBar();
  renderShareHistoryPager(rows.length);
}
async function refreshShareHistory() {
  const body = $("sd-history-body");
  if (!body) return;
  body.innerHTML = skeleton(8, 3);
  try {
    const rows = await api("/api/share-download/history?limit=500");
    SHARE_HISTORY = Array.isArray(rows) ? rows : [];
    populateShareHistoryFacets();
    const validIds = new Set(SHARE_HISTORY.map(row => row.id));
    [...selShareHistory].forEach(id => { if (!validIds.has(id)) selShareHistory.delete(id); });
    renderShareHistoryRows();
  } catch (e) {
    $("sd-history-count").textContent = "读取失败";
    if ($("sd-history-filter-count")) $("sd-history-filter-count").textContent = "";
    body.innerHTML = empty(8, "历史记录读取失败", "i-info", e.message);
  }
}

function _shareHistoryReportParams(full) {
  const params = new URLSearchParams({ platform: PLATFORM });
  if (full) {
    params.set("full", "true");
    return params;
  }
  const put = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  };
  put("q", $("sd-history-search") && $("sd-history-search").value);
  put("platform", $("sd-history-platform") && $("sd-history-platform").value);
  put("media_type", $("sd-history-type") && $("sd-history-type").value);
  put("status", $("sd-history-status") && $("sd-history-status").value);
  return params;
}

async function exportShareHistoryReport(full = false, explicitBtn = null) {
  const btn = explicitBtn || evtBtn();
  const group = btn && btn.closest(".export-actions");
  const unlock = _lockExportGroup(group, btn);
  await withBusy(btn, full ? "全量导出" : "筛选导出", async () => {
    try {
      await _downloadExcelReport(
        "/api/reports/share-download-history.xlsx?" + _shareHistoryReportParams(full).toString(),
        "creatorhub_share_download_history.xlsx",
      );
      const count = $("sd-history-filter-count")?.textContent?.trim();
      toast(`链接下载历史 ${full ? "全量" : "筛选结果"} Excel 已导出${!full && count ? `（${count}）` : ""}`, "ok");
    } catch (e) {
      toast("下载历史导出失败: " + e.message, "err");
    } finally {
      unlock();
    }
  });
}

function shareHistoryToggleOne(id, on) { on ? selShareHistory.add(id) : selShareHistory.delete(id); updateShareHistorySelBar(); }
function shareHistoryToggleAll(on) {
  document.querySelectorAll('#sd-history-body input[type="checkbox"]').forEach(cb => {
    const id = +cb.dataset.id; if (!id) return;
    cb.checked = on; on ? selShareHistory.add(id) : selShareHistory.delete(id);
  });
  updateShareHistorySelBar();
}
function shareHistorySelAllToggle() {
  const ids = [...document.querySelectorAll('#sd-history-body input[type="checkbox"]')].map(cb => +cb.dataset.id).filter(Boolean);
  const allSelected = ids.length > 0 && ids.every(id => selShareHistory.has(id));
  shareHistoryToggleAll(!allSelected);
}
function shareHistorySelClear() { selShareHistory.clear(); renderShareHistoryRows(); }
async function shareHistoryBatchDelete() {
  if (!selShareHistory.size) return;
  if (!await uiConfirm({ title: "批量删除下载历史", message: `删除选中的 ${selShareHistory.size} 条历史记录?本地媒体文件会保留。`, okText: "删除记录", danger: true })) return;
  try {
    const result = await api("/api/share-download/history/batch-delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selShareHistory] }),
    });
    toast(`已删除 ${result.deleted || 0} 条历史记录，本地文件未删除`, "ok");
    selShareHistory.clear();
    refreshShareHistory();
  } catch (e) { toast("批量删除失败:" + e.message, "err"); }
}
function goShareHistoryPage(page) {
  const pages = Math.max(1, Math.ceil(SHARE_HISTORY_TOTAL / SHARE_HISTORY_PAGE_SIZE));
  const target = page <= 0 ? pages : Math.min(pages, Math.max(1, Math.round(Number(page) || 1)));
  if (target === SHARE_HISTORY_PAGE) return;
  SHARE_HISTORY_PAGE = target; renderShareHistoryRows();
}
function changeShareHistoryPage(delta) { goShareHistoryPage(SHARE_HISTORY_PAGE + Number(delta || 0)); }
function jumpShareHistoryPage() {
  const input = $("sd-history-page-input");
  const value = input ? Number(input.value) : 1;
  if (!Number.isFinite(value) || value < 1) { if (input) input.value = String(SHARE_HISTORY_PAGE); return; }
  goShareHistoryPage(value);
}
function handleShareHistoryPageInput(event) { if (event && event.key === "Enter") { event.preventDefault(); jumpShareHistoryPage(); } }
function setShareHistoryPageSize() {
  const value = +(($('sd-history-page-size') && $('sd-history-page-size').value) || 10);
  SHARE_HISTORY_PAGE_SIZE = [10, 20, 50].includes(value) ? value : 10;
  SHARE_HISTORY_PAGE = 1; renderShareHistoryRows();
}
async function revealShareHistoryPath(id, btn) {
  const old = btn && btn.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spin"></span>`; }
  try {
    await api(`/api/share-download/history/${id}/reveal`, { method: "POST", headers: { "X-CreatorHub-Local-Action": "reveal" } });
    toast("已在文件夹中显示", "ok", 1800);
  } catch (e) { toast("打开文件夹失败:" + e.message, "err"); }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
}
function openShareHistoryPreview(id, startIdx) {
  return _pvOpen(() => api(`/api/share-download/history/${id}/preview`), startIdx || 0);
}
async function deleteShareHistory(id) {
  const ok = await uiConfirm({
    title: "删除下载历史",
    message: "只删除这条历史记录，本地媒体文件会保留。",
    okText: "删除记录",
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/api/share-download/history/${id}`, { method: "DELETE" });
    toast("历史记录已删除，本地文件未删除", "ok");
    selShareHistory.delete(id);
    refreshShareHistory();
  } catch (e) {
    toast("删除历史失败：" + e.message, "err");
  }
}

function renderShareResult(response, download) {
  const card = $("sd-result-card"), box = $("sd-result");
  const results = response.results || [];
  card.style.display = "block";
  $("sd-result-summary").textContent = `${results.filter(x => x.ok).length}/${results.length} 成功`;
  box.innerHTML = results.map((item, index) => {
    if (!item.ok) return `<div class="hint" style="margin-bottom:10px;border-color:var(--danger)">
      <b>第 ${index + 1} 条处理失败</b><br><span style="color:var(--danger)">${esc(item.error || "未知错误")}</span>
      <br><code style="word-break:break-all">${esc(item.url || "")}</code></div>`;
    const m = item.metadata || {};
    const files = item.files || [];
    const warnings = item.warnings || [];
    const dataBits = [
      m.uploader ? `作者：${esc(m.uploader)}` : "",
      m.duration ? `时长：${esc(fmtDur(Math.round(m.duration)))}` : "",
      m.width && m.height ? `画面：${m.width}×${m.height}` : "",
      m.view_count != null ? `播放：${fmtNum(m.view_count)}` : "",
      m.like_count != null ? `点赞：${fmtNum(m.like_count)}` : "",
    ].filter(Boolean).join(" · ");
    const fileHtml = files.length ? files.map(file => `
      <div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line-soft)">
        <span class="pill bare">${esc(file.role || "file")}</span>
        <code style="flex:1;min-width:0;overflow-wrap:anywhere">${esc(file.relative_path || file.name)}</code>
        <span class="mut">${fmtShareSize(file.size)}</span>
        <button class="ghost sm" data-path="${esc(file.path || "")}" onclick="copySharePath(this)">复制路径</button>
      </div>`).join("") : "";
    return `<div style="margin-bottom:${index + 1 < results.length ? "18px" : "0"}">
      <div style="font-size:16px;font-weight:700;margin-bottom:5px">${esc(m.title || "作品信息")}</div>
      <div class="mut">${dataBits || esc(item.input_platform || "")}</div>
      ${m.description ? `<div class="hint" style="margin-top:9px;white-space:pre-wrap;max-height:130px;overflow:auto">${esc(m.description)}</div>` : ""}
      ${warnings.length ? `<div class="hint" style="margin-top:9px;color:var(--warn)">${warnings.map(esc).join("<br>")}</div>` : ""}
      ${download ? `<div class="mut" style="margin-top:10px">保存目录：<code>${esc(item.output_dir || "")}</code></div>${fileHtml}` : ""}
    </div>`;
  }).join("") || `<div class="hint">没有返回处理结果</div>`;
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function runShareDownload(download, button = null) {
  const btn = button || evtBtn();
  const text = $("sd-text").value.trim();
  if (!text) { toast("请粘贴分享链接或完整分享文案", "err"); return; }
  // 文案发生变化时先在本地重新识别，确保单选下标对应当前输入。
  if (SHARE_SOURCE !== text || !SHARE_LINKS.length) {
    const parsed = await parseShareLinks(null);
    if (!parsed || !parsed.count) return;
  }
  $("sd-msg").textContent = download ? "正在解析并下载，较大视频需要等待…" : "正在读取远端作品信息…";
  await withBusy(btn, download ? "下载中" : "读取中", async () => {
    try {
      const response = await api("/api/share-download", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareRequestBody(download)),
      });
      renderShareResult(response, download);
      if (download) refreshShareHistory();
      if (response.ok) {
        $("sd-msg").textContent = download ? "下载完成 ✓" : "作品信息读取完成 ✓";
        toast(download ? "链接作品下载完成" : "作品信息读取完成", "ok");
      } else {
        const first = (response.results || []).find(x => !x.ok);
        $("sd-msg").textContent = "处理完成，但有失败项：" + ((first && first.error) || "");
        toast("有链接处理失败，请查看结果", "err", 7000);
      }
    } catch (e) {
      $("sd-msg").textContent = "处理失败：" + e.message;
      toast("处理失败：" + e.message, "err", 7000);
    }
  });
}

function inspectShareLink(button = null) { return runShareDownload(false, button); }
function downloadShareLink(button = null) { return runShareDownload(true, button); }

