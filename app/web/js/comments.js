// ─── 评论监控(独立) ───
const SRC = { public: "公开", creator: "创作中心" };
async function addWatch() {
  const url_or_id = $("w-url").value.trim();
  if (!url_or_id) { toast("请粘贴视频链接 / 账号主页 / sec_uid", "err"); return; }
  if (PLATFORM === "xhs" && !$("w-acc").value) {
    if (!ACCOUNTS.length) { toast("请先在「账号」里完成小红书扫码登录", "err"); switchTab("accounts"); return; }
    toast("小红书评论监控必须选择一个已登录账号", "err"); return;
  }
  const btn = evtBtn();
  $("w-msg").textContent = "解析中…";
  await withBusy(btn, "解析中", async () => {
    try {
      await api("/api/comment-watches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_or_id, platform: PLATFORM, kind: $("w-kind").value,
          mode: PLATFORM === "xhs" ? "public" : $("w-mode").value,
          account_id: $("w-acc").value ? +$("w-acc").value : null,
          interval_seconds: +$("w-interval").value,
          recent_works: +$("w-recent").value,
          recent_days: +$("w-days").value,
          max_scrolls: +$("w-depth").value,
          alias: $("w-alias").value.trim(), group_name: getMetaValue("w-group").trim(),
          tags: parseTags(getMetaValue("w-tags")),
        }),
      });
      ["w-url", "w-alias"].forEach(id => $(id).value = "");
      setMetaValue("w-group", ""); setMetaValue("w-tags", "");
      $("w-msg").textContent = "已添加 ✓"; toast("已开始监控评论", "ok");
    } catch (e) { $("w-msg").textContent = "失败: " + e.message; toast("添加失败:" + e.message, "err"); }
  });
  refreshWatches();
}
function watchRow(w) {
  const base = esc(watchBaseName(w));
  return `<tr>
    <td><div class="user-cell">${w.avatar ? `<img class="avatar" src="${w.avatar}" referrerpolicy="no-referrer">` : ""}<div><span>${base}</span>${w.alias ? `<div class="alias-line">${esc(w.alias)}</div>` : ""}</div></div></td>
    <td>${metaChips(w)}</td>
    <td>${w.kind === "video" ? (w.platform === "xhs" ? "笔记" : "视频") : (w.platform === "xhs" ? "创作者" : "账号")}</td>
    <td>${w.platform === "xhs" ? "公开" : (SRC[w.mode] || w.mode)}</td>
    <td class="num">${w.comment_count}</td>
    <td class="num">${Math.round(w.interval_seconds / 60)} 分
      ${w.kind === "user" && (w.recent_works || w.recent_days) ? `<div class="mut" style="font-size:11px">${w.recent_works ? `近 ${w.recent_works} 个` : "全局作品数"} · ${w.recent_days ? `${w.recent_days} 天` : "全局天数"}</div>` : ""}</td>
    <td class="mut">${w.last_scan_at ? new Date(w.last_scan_at + "Z").toLocaleString() : "—"}${w.last_error ? ` <span class="warn-ic" title="${esc(w.last_error)}">${ic("i-info")}</span>` : ""}</td>
    <td><span class="pill ${w.enabled ? "active" : "invalid"}">${w.enabled ? "监控中" : "已暂停"}</span></td>
    <td class="acttd">
      <button class="ghost sm" onclick="scanWatch(${w.id})">立即抓取</button>
      <button class="ghost sm" onclick="editWatchMeta(${w.id})">编辑</button>
      <button class="ghost sm" onclick="toggleWatch(${w.id}, ${!w.enabled})">${w.enabled ? "暂停" : "启用"}</button>
      <button class="ghost sm danger" onclick="delWatch(${w.id})">${ic("i-trash")}删除</button>
    </td></tr>`;
}
function renderWatchRows() {
  const groupName = $("watch-group") ? $("watch-group").value : "";
  const tag = $("watch-tag") ? $("watch-tag").value : "";
  const query = (($("watch-search") && $("watch-search").value) || "").trim().toLocaleLowerCase();
  const rows = WATCHES.filter(w => {
    if (!matchesMeta(w, groupName, tag)) return false;
    if (!query) return true;
    return [watchBaseName(w), w.alias, w.group_name, ...itemTags(w)]
      .join(" ").toLocaleLowerCase().includes(query);
  });
  if ($("watch-filter-count")) $("watch-filter-count").textContent = `显示 ${rows.length} / ${WATCHES.length}`;
  $("watch-table").innerHTML = rows.map(watchRow).join("")
    || empty(9, "没有匹配的评论监控", "i-msg", WATCHES.length ? "调整分组、标签或搜索条件" : "在上方添加一个评论监控");
}
async function refreshWatches() {
  const ws = await api("/api/comment-watches?platform=" + PLATFORM);
  WATCHES = ws; populateWatchFacets(); populateCommentSrc();
  if ($("tb-watch")) $("tb-watch").textContent = ws.length;
  renderWatchRows();
}
async function editWatchMeta(id) {
  const item = watchById(id); if (!item) return;
  const accounts = ACCOUNTS.filter(a => a.platform === item.platform && a.status !== "invalid");
  const canCreator = item.platform === "douyin" && item.kind === "user";
  const accountOptions = [
    `<option value="">${item.account_id ? "保持当前绑定" : "不指定账号"}</option>`,
    ...accounts.map(a => `<option value="${a.id}">${esc(a.nickname)}${a.has_creator ? " · 创作号" : ""}</option>`),
  ].join("");
  const intervalOptions = numericSelectOptions(item.interval_seconds || 600, [
    [60, "每 1 分钟"], [300, "每 5 分钟"], [600, "每 10 分钟"],
    [1800, "每 30 分钟"], [3600, "每小时"], [21600, "每 6 小时"], [86400, "每天"],
  ], " 秒");
  const recentOptions = numericSelectOptions(item.recent_works || 0, [
    [0, "跟随全局设置"], [3, "最近 3 个作品"], [5, "最近 5 个作品"],
    [10, "最近 10 个作品"], [20, "最近 20 个作品"], [50, "最近 50 个作品"],
  ]);
  const dayOptions = numericSelectOptions(item.recent_days || 0, [
    [0, "跟随全局设置"], [3, "最近 3 天"], [7, "最近 7 天"],
    [14, "最近 14 天"], [30, "最近 30 天"], [90, "最近 90 天"],
  ]);
  const depthOptions = numericSelectOptions(item.max_scrolls || 0, [
    [0, "跟随全局设置"], [3, "浅层抓取"], [6, "标准抓取"],
    [12, "深度抓取"], [20, "最大抓取"],
  ]);
  const value = await new Promise(res => {
    _uiResolve = res; _uiCancelVal = null;
    _uiGetVal = () => ({
      alias: $("ew-alias").value.trim(),
      group_name: getMetaValue("ew-group").trim(),
      tags: parseTags(getMetaValue("ew-tags")),
      interval_seconds: +$("ew-interval").value,
      account_id: $("ew-account").value ? +$("ew-account").value : null,
      mode: $("ew-mode").value,
      recent_works: $("ew-recent") ? +$("ew-recent").value : item.recent_works || 0,
      recent_days: $("ew-days") ? +$("ew-days").value : item.recent_days || 0,
      max_scrolls: $("ew-depth") ? +$("ew-depth").value : item.max_scrolls || 0,
    });
    $("ui-body").innerHTML = `
      <fieldset class="monitor-config-group">
        <legend>标识与归类</legend>
        <div><label class="field" for="ew-alias">管理别名</label>
          <input id="ew-alias" maxlength="60" value="${esc(item.alias || "")}" placeholder="便于快速识别"></div>
        <div class="row">
          <div><label class="field" for="ew-group">分组</label><input id="ew-group" data-meta-combo="group"></div>
          <div><label class="field" for="ew-tags">标签</label><input id="ew-tags" data-meta-combo="tags"></div>
        </div>
      </fieldset>
      <fieldset class="monitor-config-group">
        <legend>抓取策略</legend>
        <div class="row">
          <div><label class="field" for="ew-interval">抓取频率</label>
            <select id="ew-interval">${intervalOptions}</select></div>
          <div><label class="field" for="ew-account">抓取账号</label><select id="ew-account">${accountOptions}</select></div>
        </div>
        <div><label class="field" for="ew-mode">评论来源</label>
          <select id="ew-mode"><option value="public">公开评论区</option>${canCreator ? '<option value="creator">创作中心（仅自有账号）</option>' : ""}</select></div>
        ${item.kind === "user" ? `<div class="row">
          <div><label class="field" for="ew-recent">检查近期作品数</label><select id="ew-recent">${recentOptions}</select></div>
          <div><label class="field" for="ew-days">作品时间范围</label><select id="ew-days">${dayOptions}</select></div>
        </div>` : ""}
        ${item.platform === "xhs" ? "" : `<div><label class="field" for="ew-depth">评论区抓取深度</label>
          <select id="ew-depth">${depthOptions}</select></div>`}
      </fieldset>`;
    enhanceMetaControl($("ew-group"), "group"); enhanceMetaControl($("ew-tags"), "tags");
    setMetaValue("ew-group", item.group_name || ""); setMetaValue("ew-tags", itemTags(item).join(","));
    $("ew-interval").value = String(item.interval_seconds || 600);
    $("ew-account").value = item.account_id ? String(item.account_id) : "";
    $("ew-mode").value = canCreator ? (item.mode || "public") : "public";
    if ($("ew-recent")) $("ew-recent").value = String(item.recent_works || 0);
    if ($("ew-days")) $("ew-days").value = String(item.recent_days || 0);
    if ($("ew-depth")) $("ew-depth").value = String(item.max_scrolls || 0);
    ["ew-interval", "ew-account", "ew-mode", "ew-recent", "ew-days", "ew-depth"]
      .forEach(key => { const el = $(key); if (el) enhanceSelect(el); });
    _uiOpen("编辑评论监控", "监控目标保持不变；需要更换作品或被监控的创作者时，请新建评论监控。", { okText: "保存修改", wide: true });
  });
  if (value === null) return;
  try {
    await api("/api/comment-watches/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    toast("评论监控配置已更新", "ok"); refreshWatches(); refreshComments();
  } catch (e) { toast("更新失败:" + e.message, "err"); }
}
async function scanWatch(id) {
  const btn = evtBtn();
  toast("抓取中…正在拉取评论区", "info", 7000);
  await withBusy(btn, "抓取中", async () => {
    try { const r = await api("/api/comment-watches/" + id + "/scan-now", { method: "POST" }); toast(`评论抓取完成,新增 ${r.new_comments ?? 0} 条`, "ok"); }
    catch (e) { toast("抓取失败:" + e.message, "err"); }
  });
  refreshWatches(); refreshComments();
}
async function toggleWatch(id, on) { try { await api("/api/comment-watches/" + id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: on }) }); refreshWatches(); } catch (e) { toast("操作失败:" + e.message, "err"); } }
async function delWatch(id) { if (await uiConfirm({ title: "删除评论监控", message: "删除该评论监控及其抓到的评论?", okText: "删除", danger: true })) { try { await api("/api/comment-watches/" + id, { method: "DELETE" }); toast("已删除", "ok"); refreshWatches(); refreshComments(); } catch (e) { toast("删除失败:" + e.message, "err"); } } }

function renderCommentPager(meta) {
  const pager = $("comment-pager");
  if (!pager) return;
  const total = Math.max(0, Number(meta && meta.total || 0));
  const pageSize = Math.max(1, Number(meta && meta.page_size || COMMENT_PAGE_SIZE));
  const pages = Math.max(1, Number(meta && meta.pages || Math.ceil(total / pageSize) || 1));
  const page = Math.max(1, Number(meta && meta.page || COMMENT_PAGE));
  COMMENT_TOTAL = total;
  COMMENT_PAGE_SIZE = pageSize;
  COMMENT_PAGE = page;
  if ($("comment-page-size")) $("comment-page-size").value = String(pageSize);
  if ($("comment-page-input")) {
    $("comment-page-input").value = String(page);
    $("comment-page-input").max = String(pages);
  }
  if ($("comment-page-info")) $("comment-page-info").textContent =
    "第 " + page + " / " + pages + " 页 · 共 " + fmtNum(total) + " 条";
  if ($("comment-first")) $("comment-first").disabled = page <= 1;
  if ($("comment-prev")) $("comment-prev").disabled = page <= 1;
  if ($("comment-next")) $("comment-next").disabled = page >= pages;
  if ($("comment-last")) $("comment-last").disabled = page >= pages;
  pager.hidden = total <= pageSize;
}
function commentPageCount() {
  return Math.max(1, Math.ceil(COMMENT_TOTAL / COMMENT_PAGE_SIZE));
}
function goCommentPage(page) {
  const pages = commentPageCount();
  const target = page <= 0 ? pages : Math.min(pages, Math.max(1, Math.round(Number(page) || 1)));
  if (target === COMMENT_PAGE) return;
  COMMENT_PAGE = target;
  refreshComments();
}
function changeCommentPage(delta) { goCommentPage(COMMENT_PAGE + Number(delta || 0)); }
function jumpCommentPage() {
  const input = $("comment-page-input");
  const value = input ? Number(input.value) : 1;
  if (!Number.isFinite(value) || value < 1) {
    if (input) { input.value = String(COMMENT_PAGE); input.focus(); }
    return;
  }
  goCommentPage(value);
}
function handleCommentPageInput(event) {
  if (event && event.key === "Enter") { event.preventDefault(); jumpCommentPage(); }
}
function setCommentPageSize() {
  const value = +(($('comment-page-size') && $('comment-page-size').value) || 10);
  COMMENT_PAGE_SIZE = [10, 20, 50, 100, 200].includes(value) ? value : 10;
  COMMENT_PAGE = 1;
  refreshComments();
}
async function refreshComments(resetPage = false) {
  if (resetPage) COMMENT_PAGE = 1;
  const params = new URLSearchParams({
    platform: PLATFORM, page: String(COMMENT_PAGE),
    page_size: String(COMMENT_PAGE_SIZE), paginate: "true",
  });
  if (COMMENT_SRC) params.set("watch_id", COMMENT_SRC);
  if (COMMENT_GROUP) params.set("group_name", COMMENT_GROUP);
  if (COMMENT_TAG) params.set("tag", COMMENT_TAG);
  const query = (($('comment-query') && $('comment-query').value) || "").trim();
  const replyType = ($('comment-type') && $('comment-type').value) || "";
  const minLikes = +(($('comment-min-likes') && $('comment-min-likes').value) || 0);
  if (query) params.set("q", query);
  if (replyType) params.set("reply_type", replyType);
  if (Number.isFinite(minLikes) && minLikes > 0) params.set("min_like_count", String(Math.floor(minLikes)));
  params.set("sort", ($('comment-sort') && $('comment-sort').value) || "latest");
  const payload = await api("/api/comments?" + params.toString());
  const meta = Array.isArray(payload)
    ? { items: payload, total: payload.length, page: 1, page_size: COMMENT_PAGE_SIZE,
        pages: Math.max(1, Math.ceil(payload.length / COMMENT_PAGE_SIZE)) }
    : (payload || {});
  const pages = Math.max(1, Number(meta.pages || 1));
  if (COMMENT_PAGE > pages) { COMMENT_PAGE = pages; return refreshComments(); }
  const rows = Array.isArray(meta.items) ? meta.items : [];
  $("stat-cmt").textContent = rows.length;
  if ($("comment-filter-count")) $("comment-filter-count").textContent =
    `显示 ${rows.length} / ${Number(meta.total || rows.length)}`;
  $("comment-table").innerHTML = rows.map(r => {
    const w = watchById(r.watch_id);
    const src = w ? sourceMeta(w) : "";
    return `<tr>
    <td><input type="checkbox" data-id="${r.id}" onchange="commentToggleOne(${r.id}, this.checked)" ${selComment.has(r.id) ? "checked" : ""}></td>
    <td class="wrap" style="max-width:360px">${r.is_reply ? '<span class="mut">↳</span> ' : ""}${esc(r.text || "").slice(0, 60)}${src}</td>
    <td class="mut">${esc(r.user_nickname || "")}</td>
    <td class="mut num">${fmtNum(r.like_count)}</td>
    <td class="mut num">${fmtTime(r.create_time)}</td>
    <td class="acttd"><button class="ghost sm danger" onclick="delComment(${r.id})">${ic("i-trash")}删除</button></td>
  </tr>`;
  }).join("") || empty(6, "暂无评论", "i-msg", "添加评论监控后,抓到的新评论会显示在这里,并可推送通知");
  updateCommentSelBar(); renderCommentPager(meta);
}
async function delComment(id) {
  try { await api("/api/comments/" + id, { method: "DELETE" }); refreshComments(); }
  catch (e) { toast("删除失败:" + e.message, "err"); }
}
async function clearComments() {
  if (!await uiConfirm({ title: "清空评论", message: "清空所有评论记录?", okText: "清空", danger: true })) return;
  try { const r = await api("/api/comments", { method: "DELETE" }); toast(`已清空 ${r.deleted} 条评论`, "ok"); refreshComments(); }
  catch (e) { toast("清空失败:" + e.message, "err"); }
}

