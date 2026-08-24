// ─── 短视频弹幕监控(独立) ───
function danmakuWatchBaseName(w) {
  return w.title || w.aweme_id || (w.sec_uid || "").slice(0, 12);
}
function populateDanmakuFacets() {
  setFacetOptions("danmaku-watch-group", "全部分组", DANMAKU_WATCHES.map(x => x.group_name));
  setFacetOptions("danmaku-watch-tag", "全部标签", DANMAKU_WATCHES.flatMap(itemTags));
  const sel = $("danmaku-src"); if (!sel) return;
  const old = DANMAKU_SRC;
  sel.innerHTML = '<option value="">全部来源</option>' +
    DANMAKU_WATCHES.map(x => x.id ? '<option value="' + x.id + '">' +
      esc(danmakuWatchBaseName(x)) + '</option>' : "").join("");
  DANMAKU_SRC = [...sel.options].some(o => o.value === old) ? old : "";
  sel.value = DANMAKU_SRC;
}
function danmakuWatchRow(w) {
  const base = esc(danmakuWatchBaseName(w));
  const source = w.mode === "creator" ? "创作中心" : "公开视频";
  const error = w.last_error
    ? ' <span class="warn-ic" title="' + esc(w.last_error) + '">' + ic("i-info") + "</span>" : "";
  const avatar = w.avatar
    ? '<img class="avatar" src="' + esc(w.avatar) + '" referrerpolicy="no-referrer">' : "";
  const alias = w.alias ? '<div class="alias-line">' + esc(w.alias) + "</div>" : "";
  const interval = w.interval_seconds
    ? Math.round(w.interval_seconds / 60) + " 分"
    : "跟随全局" + (w.effective_interval_seconds ? "（" + Math.round(w.effective_interval_seconds / 60) + " 分）" : "");
  const scope = w.kind === "user"
    ? '<div class="mut" style="font-size:11px;margin-top:2px">' +
      (w.recent_works ? "近 " + w.recent_works + " 个" : "全局 " + (w.effective_recent_works || "") + " 个") +
      " · " + (w.recent_days ? "近 " + w.recent_days + " 天" : "全局 " + (w.effective_recent_days || "") + " 天") +
      "</div>" : "";
  return '<tr>' +
    '<td><div class="user-cell">' + avatar + '<div><span>' + base + "</span>" + alias + scope + "</div></div></td>" +
    "<td>" + (w.kind === "video" ? "单条视频" : "账号作品") + "</td>" +
    "<td>" + source + "</td>" +
    '<td class="num">' + fmtNum(w.danmaku_count || 0) + "</td>" +
    '<td class="num">' + interval + "</td>" +
    '<td class="mut">' + (w.last_scan_at ? new Date(w.last_scan_at + "Z").toLocaleString() : "—") + error + "</td>" +
    '<td><span class="pill ' + (w.enabled ? "active" : "invalid") + '">' +
      (w.enabled ? "监控中" : "已暂停") + "</span></td>" +
    '<td class="acttd">' +
      '<button class="ghost sm" onclick="editDanmakuWatch(' + w.id + ')">编辑</button>' +
      '<button class="ghost sm" onclick="scanDanmakuWatch(' + w.id + ')">立即抓取</button>' +
      '<button class="ghost sm" onclick="toggleDanmakuWatch(' + w.id + ", " + (!w.enabled) + ')">' +
        (w.enabled ? "暂停" : "启用") + "</button>" +
      '<button class="ghost sm danger" onclick="delDanmakuWatch(' + w.id + ')">' +
        ic("i-trash") + "删除</button></td></tr>";
}
function renderDanmakuWatchRows() {
  const group = $("danmaku-watch-group") ? $("danmaku-watch-group").value : "";
  const tag = $("danmaku-watch-tag") ? $("danmaku-watch-tag").value : "";
  const query = (($("danmaku-watch-search") && $("danmaku-watch-search").value) || "").trim().toLocaleLowerCase();
  const rows = DANMAKU_WATCHES.filter(w => {
    if (!matchesMeta(w, group, tag)) return false;
    if (!query) return true;
    return [danmakuWatchBaseName(w), w.alias, w.group_name, ...itemTags(w)]
      .join(" ").toLocaleLowerCase().includes(query);
  });
  if ($("danmaku-watch-filter-count")) {
    $("danmaku-watch-filter-count").textContent =
      "显示 " + rows.length + " / " + DANMAKU_WATCHES.length;
  }
  $("danmaku-watch-table").innerHTML = rows.map(danmakuWatchRow).join("") ||
    empty(8, "没有匹配的弹幕监控", "i-msg",
          DANMAKU_WATCHES.length ? "调整筛选条件" : "在上方添加一个弹幕监控");
}
async function addDanmakuWatch() {
  const url = $("d-w-url").value.trim();
  if (!url) { toast("请粘贴视频链接 / 账号主页 / aweme_id", "err"); return; }
  const mode = $("d-w-mode").value;
  if (mode === "creator" && !$("d-w-acc").value) {
    toast("创作中心模式需要选择创作者账号", "err"); return;
  }
  const btn = evtBtn();
  $("d-w-msg").textContent = "解析中…";
  await withBusy(btn, "解析中", async () => {
    try {
      await api("/api/danmaku-watches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_or_id: url, platform: "douyin", kind: $("d-w-kind").value, mode: mode,
          account_id: $("d-w-acc").value ? +$("d-w-acc").value : null,
          interval_seconds: +$("d-w-interval").value,
          recent_works: +$("d-w-recent").value, recent_days: +$("d-w-days").value,
          max_scrolls: +$("d-w-depth").value, alias: $("d-w-alias").value.trim(),
          time_start_ms: Math.round(Math.max(0, +$("d-w-time-start").value || 0) * 1000),
          time_end_ms: Math.round(Math.max(0, +$("d-w-time-end").value || 0) * 1000),
          probe_step_seconds: +$("d-w-probe-step").value || 0,
          include_keywords: parseDanmakuKeywords($("d-w-include").value),
          exclude_keywords: parseDanmakuKeywords($("d-w-exclude").value),
          min_text_length: Math.max(0, +$("d-w-min-len").value || 0),
          max_text_length: Math.max(0, +$("d-w-max-len").value || 0),
          min_like_count: Math.max(0, +$("d-w-min-like").value || 0),
          max_records_per_scan: Math.max(0, +$("d-w-scan-cap").value || 0),
          max_records_total: Math.max(0, +$("d-w-total-cap").value || 0),
          group_name: getMetaValue("d-w-group").trim(),
          tags: parseTags(getMetaValue("d-w-tags")),
        }),
      });
      ["d-w-url", "d-w-alias", "d-w-include", "d-w-exclude"].forEach(id => $(id).value = "");
      ["d-w-time-start", "d-w-time-end", "d-w-min-len", "d-w-max-len", "d-w-min-like", "d-w-scan-cap", "d-w-total-cap"].forEach(id => $(id).value = "0");
      setMetaValue("d-w-group", ""); setMetaValue("d-w-tags", "");
      $("d-w-msg").textContent = "已添加 ✓";
      toast("已开始监控弹幕", "ok");
    } catch (e) {
      $("d-w-msg").textContent = "失败: " + e.message;
      toast("添加失败:" + e.message, "err");
    }
  });
  refreshDanmakuWatches();
}
async function refreshDanmakuWatches() {
  if (PLATFORM !== "douyin") return;
  const rows = await api("/api/danmaku-watches?platform=douyin");
  DANMAKU_WATCHES = rows;
  populateDanmakuFacets();
  if ($("tb-danmaku")) $("tb-danmaku").textContent = rows.length;
  renderDanmakuWatchRows();
}
function onDanmakuSrc() {
  DANMAKU_SRC = $("danmaku-src").value;
  DANMAKU_PAGE = 1;
  refreshDanmaku();
}
async function editDanmakuWatch(id) {
  const item = DANMAKU_WATCHES.find(x => x.id === id);
  if (!item) return;
  const intervalOptions = numericSelectOptions(item.interval_seconds || 0, [
    [0, "跟随全局设置"], [60, "每 1 分钟"], [300, "每 5 分钟"],
    [600, "每 10 分钟"], [1800, "每 30 分钟"], [3600, "每小时"], [86400, "每天"],
  ]);
  const recentOptions = numericSelectOptions(item.recent_works || 0, [
    [0, "跟随全局设置"], [3, "最近 3 个作品"], [5, "最近 5 个作品"],
    [10, "最近 10 个作品"], [20, "最近 20 个作品"], [50, "最近 50 个作品"],
  ]);
  const dayOptions = numericSelectOptions(item.recent_days || 0, [
    [0, "跟随全局设置"], [3, "最近 3 天"], [7, "最近 7 天"],
    [14, "最近 14 天"], [30, "最近 30 天"], [90, "最近 90 天"],
  ]);
  const depthOptions = numericSelectOptions(item.max_scrolls || 0, [
    [0, "跟随全局设置"], [3, "浅层"], [6, "标准"], [12, "深度"], [20, "最大"],
  ]);
  const probeOptions = numericSelectOptions(item.probe_step_seconds || 0, [
    [0, "跟随全局设置"], [0.5, "每 0.5 秒"], [1, "每 1 秒"], [2, "每 2 秒"], [5, "每 5 秒"],
  ], " 秒");
  const value = await new Promise(res => {
    _uiResolve = res; _uiCancelVal = null;
    _uiGetVal = () => ({
      interval_seconds: +$("edw-interval").value,
      recent_works: +$("edw-recent").value,
      recent_days: +$("edw-days").value,
      max_scrolls: +$("edw-depth").value,
      time_start_ms: Math.round(Math.max(0, +$("edw-start").value || 0) * 1000),
      time_end_ms: Math.round(Math.max(0, +$("edw-end").value || 0) * 1000),
      probe_step_seconds: +$("edw-probe").value || 0,
      include_keywords: parseDanmakuKeywords($("edw-include").value),
      exclude_keywords: parseDanmakuKeywords($("edw-exclude").value),
      min_text_length: Math.max(0, +$("edw-min-len").value || 0),
      max_text_length: Math.max(0, +$("edw-max-len").value || 0),
      min_like_count: Math.max(0, +$("edw-min-like").value || 0),
      max_records_per_scan: Math.max(0, +$("edw-scan-cap").value || 0),
      max_records_total: Math.max(0, +$("edw-total-cap").value || 0),
    });
    $("ui-body").innerHTML = `
      <fieldset class="monitor-config-group"><legend>扫描范围</legend>
        <div class="row">
          <div><label class="field" for="edw-start">视频内起点(秒)</label><input id="edw-start" type="number" min="0" step="0.1" value="${(item.time_start_ms || 0) / 1000}"></div>
          <div><label class="field" for="edw-end">视频内终点(秒)</label><input id="edw-end" type="number" min="0" step="0.1" value="${(item.time_end_ms || 0) / 1000}"></div>
          <div><label class="field" for="edw-probe">时间轴扫描步长</label><select id="edw-probe">${probeOptions}</select></div>
          <div><label class="field" for="edw-interval">检查频率</label><select id="edw-interval">${intervalOptions}</select></div>
        </div>
      </fieldset>
      <fieldset class="monitor-config-group"><legend>账号模式与容量</legend>
        <div class="row">
          <div><label class="field" for="edw-recent">近期作品数</label><select id="edw-recent">${recentOptions}</select></div>
          <div><label class="field" for="edw-days">作品时间范围</label><select id="edw-days">${dayOptions}</select></div>
          <div><label class="field" for="edw-depth">加载轮次</label><select id="edw-depth">${depthOptions}</select></div>
        </div>
        <div class="row">
          <div><label class="field" for="edw-scan-cap">单轮入库上限</label><input id="edw-scan-cap" type="number" min="0" value="${item.max_records_per_scan || 0}"></div>
          <div><label class="field" for="edw-total-cap">总保留上限</label><input id="edw-total-cap" type="number" min="0" value="${item.max_records_total || 0}"></div>
          <div><label class="field" for="edw-min-like">最少点赞数</label><input id="edw-min-like" type="number" min="0" value="${item.min_like_count || 0}"></div>
        </div>
      </fieldset>
      <fieldset class="monitor-config-group"><legend>内容过滤</legend>
        <div class="row">
          <div><label class="field" for="edw-min-len">最短文本长度</label><input id="edw-min-len" type="number" min="0" max="200" value="${item.min_text_length || 0}"></div>
          <div><label class="field" for="edw-max-len">最长文本长度</label><input id="edw-max-len" type="number" min="0" max="200" value="${item.max_text_length || 0}"></div>
        </div>
        <div><label class="field" for="edw-include">包含关键词</label><input id="edw-include" value="${esc((item.include_keywords || []).join(","))}" placeholder="逗号分隔，命中任一项才保留"></div>
        <div><label class="field" for="edw-exclude">排除关键词</label><input id="edw-exclude" value="${esc((item.exclude_keywords || []).join(","))}" placeholder="逗号分隔，命中任一项则丢弃"></div>
      </fieldset>`;
    ["edw-interval", "edw-recent", "edw-days", "edw-depth", "edw-probe"].forEach(key => {
      const el = $(key); if (el) enhanceSelect(el);
    });
    $("edw-interval").value = String(item.interval_seconds || 0);
    $("edw-recent").value = String(item.recent_works || 0);
    $("edw-days").value = String(item.recent_days || 0);
    $("edw-depth").value = String(item.max_scrolls || 0);
    $("edw-probe").value = String(item.probe_step_seconds || 0);
    ["edw-interval", "edw-recent", "edw-days", "edw-depth", "edw-probe"].forEach(key => {
      const el = $(key); if (el && el._csSync) el._csSync();
    });
    _uiOpen("编辑弹幕监控", "监控对象保持不变；可调整视频内时间范围、过滤条件和容量上限。", { okText: "保存修改", wide: true });
  });
  if (value === null) return;
  try {
    await api("/api/danmaku-watches/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
    });
    toast("弹幕监控配置已更新", "ok"); refreshDanmakuWatches(); refreshDanmaku();
  } catch (e) { toast("更新失败:" + e.message, "err"); }
}
async function scanDanmakuWatch(id) {
  const btn = evtBtn();
  toast("抓取中…正在加载视频弹幕", "info", 7000);
  await withBusy(btn, "抓取中", async () => {
    try {
      const result = await api("/api/danmaku-watches/" + id + "/scan-now", { method: "POST" });
      toast("弹幕抓取完成,新增 " + (result.new_danmaku ?? 0) + " 条", "ok");
    } catch (e) { toast("抓取失败:" + e.message, "err"); }
  });
  refreshDanmakuWatches(); refreshDanmaku();
}
async function toggleDanmakuWatch(id, on) {
  try {
    await api("/api/danmaku-watches/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: on }),
    });
    refreshDanmakuWatches();
  } catch (e) { toast("操作失败:" + e.message, "err"); }
}
async function delDanmakuWatch(id) {
  if (!await uiConfirm({ title: "删除弹幕监控", message: "删除该监控及其抓到的弹幕?",
                         okText: "删除", danger: true })) return;
  try {
    await api("/api/danmaku-watches/" + id, { method: "DELETE" });
    toast("已删除", "ok"); refreshDanmakuWatches(); refreshDanmaku();
  } catch (e) { toast("删除失败:" + e.message, "err"); }
}
function danmakuTime(ms) {
  const value = Math.max(0, Math.floor(ms || 0));
  const sec = Math.floor(value / 1000);
  const base = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  const fraction = value % 1000;
  return fraction ? base + "." + String(fraction).padStart(3, "0") : base;
}
function danmakuCapturedAt(value) {
  if (!value) return "—";
  const raw = String(value);
  const d = new Date(/[zZ]$/.test(raw) ? raw : raw + "Z");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString() + "." + String(d.getMilliseconds()).padStart(3, "0");
}
function renderDanmakuPager(meta) {
  const pager = $("danmaku-pager");
  if (!pager) return;
  const total = Math.max(0, Number(meta && meta.total || 0));
  const pageSize = Math.max(1, Number(meta && meta.page_size || DANMAKU_PAGE_SIZE));
  const pages = Math.max(1, Number(meta && meta.pages || Math.ceil(total / pageSize) || 1));
  const page = Math.max(1, Number(meta && meta.page || DANMAKU_PAGE));
  DANMAKU_TOTAL = total;
  DANMAKU_PAGE_SIZE = pageSize;
  DANMAKU_PAGE = page;
  if ($("danmaku-page-size")) $("danmaku-page-size").value = String(pageSize);
  if ($("danmaku-page-input")) {
    $("danmaku-page-input").value = String(page);
    $("danmaku-page-input").max = String(pages);
  }
  $("danmaku-page-info").textContent = "第 " + page + " / " + pages + " 页 · 共 " + fmtNum(total) + " 条";
  if ($("danmaku-first")) $("danmaku-first").disabled = page <= 1;
  $("danmaku-prev").disabled = page <= 1;
  $("danmaku-next").disabled = page >= pages;
  if ($("danmaku-last")) $("danmaku-last").disabled = page >= pages;
  pager.hidden = total <= pageSize;
}
async function refreshDanmaku(resetPage = false) {
  if (PLATFORM !== "douyin" || !$("danmaku-table")) return;
  if (resetPage) DANMAKU_PAGE = 1;
  const params = new URLSearchParams({
    platform: "douyin", page: String(DANMAKU_PAGE),
    page_size: String(DANMAKU_PAGE_SIZE), paginate: "true",
  });
  if (DANMAKU_SRC) params.set("watch_id", DANMAKU_SRC);
  const query = ($("danmaku-query") && $("danmaku-query").value || "").trim();
  const start = +(($('danmaku-time-start') && $('danmaku-time-start').value) || 0);
  const end = +(($('danmaku-time-end') && $('danmaku-time-end').value) || 0);
  if (query) params.set("q", query);
  if (start > 0) params.set("min_video_time_ms", String(Math.round(start * 1000)));
  if (end > 0) params.set("max_video_time_ms", String(Math.round(end * 1000)));
  params.set("sort", ($("danmaku-sort") && $("danmaku-sort").value) || "video_asc");
  const payload = await api("/api/danmaku?" + params.toString());
  const meta = Array.isArray(payload)
    ? { items: payload, total: payload.length, page: 1, page_size: DANMAKU_PAGE_SIZE,
        pages: Math.max(1, Math.ceil(payload.length / DANMAKU_PAGE_SIZE)) }
    : (payload || {});
  const pages = Math.max(1, Number(meta.pages || 1));
  if (DANMAKU_PAGE > pages && Number(meta.total || 0) > 0) {
    DANMAKU_PAGE = pages;
    return refreshDanmaku();
  }
  const rows = Array.isArray(meta.items) ? meta.items : [];
  if ($("danmaku-filter-count")) {
    $("danmaku-filter-count").textContent = `显示 ${rows.length} / ${Number(meta.total || rows.length)}`;
  }
  $("danmaku-table").innerHTML = rows.map(r => '<tr>' +
    '<td class="wrap" style="max-width:360px">' + esc(r.text || "") + "</td>" +
    '<td class="mut" title="' + esc(r.user_id || "") + '">' +
      esc(r.user_nickname || (r.user_id ? "用户 ID " + r.user_id : "用户")) + "</td>" +
    '<td class="num"><code>' + danmakuTime(r.video_time_ms) + "</code></td>" +
    "<td>" + (r.source === "creator" ? "创作中心" : "播放页") + "</td>" +
    '<td class="mut">' + (r.created_at ? danmakuCapturedAt(r.created_at) :
      (r.create_time ? fmtTime(r.create_time) : "—")) + "</td>" +
    '<td class="acttd"><button class="ghost sm danger" onclick="deleteDanmaku(' + r.id + ')">' +
      ic("i-trash") + "删除</button></td></tr>").join("") ||
    empty(6, "暂无弹幕", "i-msg", "添加弹幕监控后，带视频时间点的弹幕会显示在这里");
  renderDanmakuPager(meta);
}
function danmakuPageCount() {
  return Math.max(1, Math.ceil(DANMAKU_TOTAL / DANMAKU_PAGE_SIZE));
}
function goDanmakuPage(page) {
  const pages = danmakuPageCount();
  const target = page <= 0 ? pages : Math.min(pages, Math.max(1, Math.round(Number(page) || 1)));
  if (target === DANMAKU_PAGE) return;
  DANMAKU_PAGE = target;
  refreshDanmaku();
}
function changeDanmakuPage(delta) {
  goDanmakuPage(DANMAKU_PAGE + Number(delta || 0));
}
function jumpDanmakuPage() {
  const input = $("danmaku-page-input");
  const value = input ? Number(input.value) : 1;
  if (!Number.isFinite(value) || value < 1) {
    if (input) { input.value = String(DANMAKU_PAGE); input.focus(); }
    return;
  }
  goDanmakuPage(value);
}
function handleDanmakuPageInput(event) {
  if (event && event.key === "Enter") {
    event.preventDefault();
    jumpDanmakuPage();
  }
}
function setDanmakuPageSize() {
  const value = +(($('danmaku-page-size') && $('danmaku-page-size').value) || 10);
  DANMAKU_PAGE_SIZE = [10, 20, 50, 100, 200].includes(value) ? value : 10;
  DANMAKU_PAGE = 1;
  refreshDanmaku();
}
async function deleteDanmaku(id) {
  try { await api("/api/danmaku/" + id, { method: "DELETE" }); refreshDanmaku(); }
  catch (e) { toast("删除失败:" + e.message, "err"); }
}
async function clearDanmaku() {
  if (!await uiConfirm({ title: "清空弹幕", message: "清空所有弹幕记录?",
                         okText: "清空", danger: true })) return;
  try {
    const result = await api("/api/danmaku", { method: "DELETE" });
    toast("已清空 " + result.deleted + " 条弹幕", "ok");
    refreshDanmaku(); refreshDanmakuWatches();
  } catch (e) { toast("清空失败:" + e.message, "err"); }
}

