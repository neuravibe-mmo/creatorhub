// ─── 总览迷你图表(近 7 天采集,纯 SVG 分组柱状)───
async function refreshOverviewChart() {
  const box = $("overview-chart");
  if (!box) return;
  let d;
  try { d = await api("/api/stats/series?days=7&platform=" + PLATFORM); }
  catch (e) { box.innerHTML = `<div class="chart-empty">图表加载失败</div>`; return; }
  const days = d.days || [], A = d.contents || [], B = d.comments || [];
  const total = A.reduce((s, n) => s + n, 0) + B.reduce((s, n) => s + n, 0);
  if (!days.length || total === 0) {
    box.innerHTML = `<div class="chart-empty">近 7 天暂无采集数据 — 添加监控并「立即抓取」后这里会出现趋势</div>`;
    return;
  }
  // viewBox 坐标系,响应式缩放
  const W = 720, H = 180, padL = 28, padR = 12, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = days.length, slot = iw / n;
  const maxV = Math.max(1, ...A, ...B);
  // y 轴参考线(0 / 中 / 顶)
  const ticks = [0, Math.round(maxV / 2), maxV].filter((v, i, a) => a.indexOf(v) === i);
  const y = v => padT + ih - (v / maxV) * ih;
  let gl = "", axt = "";
  ticks.forEach(t => {
    const yy = y(t).toFixed(1);
    gl += `<line class="gl" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"/>`;
    axt += `<text class="axt" x="${padL - 6}" y="${(+yy + 3).toFixed(1)}" text-anchor="end">${t}</text>`;
  });
  const bw = Math.max(5, Math.min(16, slot / 2 - 4));   // 每根柱宽
  let bars = "", labels = "";
  const md = (s) => s.slice(5);   // MM-DD
  for (let i = 0; i < n; i++) {
    const cx = padL + slot * i + slot / 2;
    const xa = cx - bw - 1, xb = cx + 1;
    const ha = (A[i] / maxV) * ih, hb = (B[i] / maxV) * ih;
    bars += `<rect class="bar" x="${xa.toFixed(1)}" y="${y(A[i]).toFixed(1)}" width="${bw}" height="${ha.toFixed(1)}" rx="2" fill="var(--acc)"><title>${md(days[i])} · 作品 ${A[i]}</title></rect>`;
    bars += `<rect class="bar" x="${xb.toFixed(1)}" y="${y(B[i]).toFixed(1)}" width="${bw}" height="${hb.toFixed(1)}" rx="2" fill="var(--info)"><title>${md(days[i])} · 评论 ${B[i]}</title></rect>`;
    labels += `<text class="axt" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${md(days[i])}</text>`;
  }
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="近 7 天每日新增作品与评论柱状图">${gl}${axt}${bars}${labels}</svg>`;
}

// ─── 平台切换(抖音 / 小红书) ───

async function exportMonitorReport(explicitBtn = null) {
  const btn = explicitBtn || evtBtn();
  const params = new URLSearchParams({ platform: PLATFORM });
  await withBusy(btn, "导出中", async () => {
    try {
      const response = await fetch("/api/reports/monitor.xlsx?" + params.toString());
      if (!response.ok) {
        let message = response.status;
        try {
          const body = await response.json();
          message = body.detail || message;
        } catch (e) { }
        throw new Error(message);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const matched = disposition.match(/filename="?([^";]+)"?/i);
      const filename = matched ? matched[1] :
        `creatorhub_monitor_report_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.xlsx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Excel 监控报告已导出", "ok");
    } catch (e) {
      toast("报告导出失败: " + e.message, "err");
    }
  });
}


async function _downloadExcelReport(path, fallbackName) {
  const response = await fetch(path);
  if (!response.ok) {
    let message = response.status;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch (e) { }
    throw new Error(message);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const matched = disposition.match(/filename="?([^";]+)"?/i);
  const filename = matched ? matched[1] : fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function _moduleReportParams(module, full) {
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
  if (module === "monitors") {
    put("q", $("mon-search") && $("mon-search").value);
    put("group_name", $("mon-group") && $("mon-group").value);
    put("tag", $("mon-tag") && $("mon-tag").value);
  } else if (module === "contents") {
    put("target_id", CONTENT_SRC);
    put("group_name", CONTENT_GROUP);
    put("tag", CONTENT_TAG);
    put("q", $("content-search") && $("content-search").value);
    put("media_type", $("content-type") && $("content-type").value);
    put("download_status", $("content-status") && $("content-status").value);
    put("min_like_count", $("content-min-likes") && $("content-min-likes").value);
    put("min_comment_count", $("content-min-comments") && $("content-min-comments").value);
    put("sort", $("content-sort") && $("content-sort").value);
  } else if (module === "comment-watches") {
    put("q", $("watch-search") && $("watch-search").value);
    put("group_name", $("watch-group") && $("watch-group").value);
    put("tag", $("watch-tag") && $("watch-tag").value);
  } else if (module === "comments") {
    put("watch_id", COMMENT_SRC);
    put("group_name", COMMENT_GROUP);
    put("tag", COMMENT_TAG);
    put("q", $("comment-query") && $("comment-query").value);
    put("reply_type", $("comment-type") && $("comment-type").value);
    put("min_like_count", $("comment-min-likes") && $("comment-min-likes").value);
    put("sort", $("comment-sort") && $("comment-sort").value);
  } else if (module === "danmaku-watches") {
    put("q", $("danmaku-watch-search") && $("danmaku-watch-search").value);
    put("group_name", $("danmaku-watch-group") && $("danmaku-watch-group").value);
    put("tag", $("danmaku-watch-tag") && $("danmaku-watch-tag").value);
  } else if (module === "danmaku") {
    put("watch_id", DANMAKU_SRC);
    put("q", $("danmaku-query") && $("danmaku-query").value);
    const start = +(($("danmaku-time-start") && $("danmaku-time-start").value) || 0);
    const end = +(($("danmaku-time-end") && $("danmaku-time-end").value) || 0);
    if (start > 0) put("min_video_time_ms", Math.round(start * 1000));
    if (end > 0) put("max_video_time_ms", Math.round(end * 1000));
    put("sort", $("danmaku-sort") && $("danmaku-sort").value);
  }
  return params;
}

const _reportLabels = {
  monitors: "监控列表",
  contents: "作品数据",
  "comment-watches": "评论监控",
  comments: "评论数据",
  "danmaku-watches": "弹幕监控",
  danmaku: "弹幕数据",
};
const _reportCountIds = {
  monitors: "mon-filter-count",
  contents: "content-filter-count",
  "comment-watches": "watch-filter-count",
  comments: "comment-filter-count",
  "danmaku-watches": "danmaku-watch-filter-count",
  danmaku: "danmaku-filter-count",
};
function _lockExportGroup(group, active) {
  if (!group) return () => {};
  const siblings = [...group.querySelectorAll("button")].filter(button => button !== active);
  const states = siblings.map(button => button.disabled);
  siblings.forEach(button => { button.disabled = true; });
  group.classList.add("is-busy");
  group.setAttribute("aria-busy", "true");
  return () => {
    siblings.forEach((button, index) => { button.disabled = states[index]; });
    group.classList.remove("is-busy");
    group.removeAttribute("aria-busy");
  };
}

async function exportModuleReport(module, full = false, explicitBtn = null) {
  const paths = {
    monitors: "/api/reports/monitors.xlsx",
    contents: "/api/reports/contents.xlsx",
    "comment-watches": "/api/reports/comment-watches.xlsx",
    comments: "/api/reports/comments.xlsx",
    "danmaku-watches": "/api/reports/danmaku-watches.xlsx",
    danmaku: "/api/reports/danmaku.xlsx",
  };
  const path = paths[module];
  if (!path) return;
  const btn = explicitBtn || evtBtn();
  const group = btn && btn.closest(".export-actions");
  const unlock = _lockExportGroup(group, btn);
  const label = _reportLabels[module] || "模块数据";
  const params = _moduleReportParams(module, full);
  await withBusy(btn, full ? "全量导出" : "筛选导出", async () => {
    try {
      await _downloadExcelReport(
        path + "?" + params.toString(),
        "creatorhub_" + module + "_report.xlsx",
      );
      const count = $( _reportCountIds[module] )?.textContent?.trim();
      const scope = full ? "全量" : "筛选结果";
      toast(`${label} ${scope} Excel 已导出${!full && count ? `（${count}）` : ""}`, "ok");
    } catch (e) {
      toast("报告导出失败: " + e.message, "err");
    } finally {
      unlock();
    }
  });
}

let PLATFORM = "douyin";
const PF_NAME = { douyin: "抖音", xhs: "小红书", kuaishou: "快手", shipinhao: "视频号" };
let CURRENT_TAB = "overview";
const PAGE_META = {
  overview: {
    title: "总览", desc: "集中查看账号状态、采集规模与近 7 天数据变化。"
  },
  accounts: {
    title: "账号与网络", desc: "管理登录状态、账号资料与独立代理绑定。"
  },
  "risk-control": {
    title: "风控中心", desc: "统一管理风控规则，查看账号状态、触发原因、恢复进度与事件记录。"
  },
  monitors: {
    title: "作品监控", desc: "添加采集目标，管理下载策略并追踪作品状态。"
  },
  collections: {
    title: "关键词批量采集", desc: "批量搜索抖音视频，并按上限采集评论与媒体。"
  },
  comments: {
    title: "评论监控", desc: "订阅作品或账号评论，按来源、分组和标签筛选。"
  },
  danmaku: {
    title: "弹幕监控", desc: "监控短视频播放器内的弹幕，保留每条弹幕在视频中的时间点。"
  },
  hub: {
    title: "本账号管理", desc: "同步自己的作品、关系、私信与账号数据。"
  },
  publish: {
    title: "内容发布", desc: "准备素材与文案，创建立即或定时发布任务。"
  },
  autocomment: {
    title: "自动评论", desc: "配置评论与回复规则，并审核待发布文案。"
  },
  "share-download": {
    title: "链接下载", desc: "从分享文案识别链接，检查媒体信息并下载到本地。"
  },
  notifications: {
    title: "通知渠道", desc: "配置 Bark、钉钉或 Telegram，及时接收任务提醒。"
  },
  settings: {
    title: "系统设置", desc: "调整下载偏好与 AI 文案服务配置。"
  },
};
function updatePageContext(name = CURRENT_TAB) {
  const meta = PAGE_META[name] || PAGE_META.overview;
  if ($("page-title")) $("page-title").textContent = meta.title;
  if ($("page-desc")) $("page-desc").textContent = meta.desc;
  if ($("page-platform")) $("page-platform").textContent = PF_NAME[PLATFORM] || "当前平台";
  if ($("page-kicker")) $("page-kicker").textContent = pfIsChannels(PLATFORM) ? "本账号工作台" : "多平台工作台";
  document.title = `${meta.title} · ${PF_NAME[PLATFORM] || ""} | CreatorHub`;
}
// 是否支持「发布」面板(四平台均有)
function pfHasPublish(pf) { return pf === "xhs" || pf === "kuaishou" || pf === "douyin" || pf === "shipinhao"; }
// 视频号只有「本账号」数据(助手接口本账号),不支持监控他人作品/评论
function pfIsChannels(pf) { return pf === "shipinhao"; }
function switchPlatform(pf) {
  if (!["douyin", "xhs", "kuaishou", "shipinhao"].includes(pf)) pf = "douyin";
  PLATFORM = pf;
  CONTENT_SRC = CONTENT_GROUP = CONTENT_TAG = "";
  COMMENT_SRC = COMMENT_GROUP = COMMENT_TAG = "";
  DANMAKU_SRC = "";
  DANMAKU_PAGE = 1;
  if (OPEN_META_COMBO) OPEN_META_COMBO.close();
  ["t-group", "t-tags", "w-group", "w-tags", "d-w-group", "d-w-tags"].forEach(id => setMetaValue(id, ""));
  ["mon-search", "watch-search", "danmaku-query", "danmaku-time-start", "danmaku-time-end"].forEach(id => { if ($(id)) $(id).value = ""; });
  ["mon-group", "mon-tag", "content-group", "content-tag", "content-src",
    "watch-group", "watch-tag", "comment-group", "comment-tag", "comment-src",
    "danmaku-watch-group", "danmaku-watch-tag", "danmaku-src"].forEach(id => {
    const select = $(id);
    if (select) { select.value = ""; if (select._csSync) select._csSync(); }
  });
  try { localStorage.setItem("dym-pf", pf); } catch (e) {}
  applyPlatformUI();
  // 切换后立刻刷新该平台数据
  refreshAccounts(); refreshMonitors(); refreshContents(); refreshWatches(); refreshComments(); refreshDanmakuWatches(); refreshDanmaku(); refreshCollections();
  if (CURRENT_TAB === "risk-control") refreshRiskCenter(true);
  populateAcAccount(); onAcMode(); refreshCommentRules(); refreshCommentTasks();
  if (pfHasPublish(PLATFORM)) refreshPublish();
}
function applyPlatformUI() {
  document.body.classList.toggle("pf-douyin", PLATFORM === "douyin");
  document.body.classList.toggle("pf-xhs", PLATFORM === "xhs");
  document.body.classList.toggle("pf-kuaishou", PLATFORM === "kuaishou");
  document.body.classList.toggle("pf-shipinhao", PLATFORM === "shipinhao");
  // 视频号:只有本账号数据,隐藏「监控他人作品/评论」相关入口(.notsh-only)
  document.body.classList.toggle("pf-channels", pfIsChannels(PLATFORM));
  if (PLATFORM !== "douyin" && CURRENT_TAB === "danmaku") switchTab("overview");
  document.querySelectorAll(".pswitch button").forEach(b => {
    const active = b.dataset.pf === PLATFORM;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
    b.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".dy-only").forEach(e => e.classList.toggle("hidden", PLATFORM !== "douyin"));
  document.querySelectorAll(".xhs-only").forEach(e => e.classList.toggle("hidden", PLATFORM !== "xhs"));
  document.querySelectorAll(".ks-only").forEach(e => e.classList.toggle("hidden", PLATFORM !== "kuaishou"));
  document.querySelectorAll(".sh-only").forEach(e => e.classList.toggle("hidden", PLATFORM !== "shipinhao"));
  document.querySelectorAll(".notsh-only").forEach(e => e.classList.toggle("hidden", pfIsChannels(PLATFORM)));
  document.querySelectorAll(".collect-only").forEach(e => e.classList.toggle("hidden", PLATFORM !== "douyin"));
  document.querySelectorAll(".meta-scope").forEach(e => {
    e.textContent = (PF_NAME[PLATFORM] || "当前平台") + "内独立";
  });
  // 发布面板入口:抖音 / 小红书 / 快手均显示
  document.querySelectorAll(".pub-only").forEach(e => e.classList.toggle("hidden", !pfHasPublish(PLATFORM)));
  // 发布面板文案随平台切换
  const ks = PLATFORM === "kuaishou", dy = PLATFORM === "douyin", sph = PLATFORM === "shipinhao";
  const pubSub = $("pub-head-sub");
  if (pubSub) pubSub.textContent = dy ? "上传图集 / 视频到抖音创作平台(实验性)"
    : ks ? "上传图集 / 视频到快手创作平台(实验性)"
    : sph ? "上传视频到视频号助手(实验性)" : "上传图集 / 视频到小红书(实验性)";
  if ($("pub-head-lead")) $("pub-head-lead").textContent = (ks || dy || sph) ? "发布作品" : "发布笔记";
  if ($("pub-title")) $("pub-title").placeholder = (ks || dy || sph) ? "给作品起个标题" : "给笔记起个标题";
  const pubHintText = dy
    ? "发布通过自动化抖音创作平台完成。首次登录或触发验证时，请在弹出窗口中完成短信验证或扫码；视频上传后还需等待转码。注意：定时发布可能因本人验证而暂停，建议发布时在场。"
    : ks
    ? "发布通过自动化快手创作平台完成。若遇验证码或需要补充封面，请在弹出窗口中手动处理；定时任务由后台引擎按计划执行。"
    : sph
    ? "发布通过自动化视频号助手完成。视频需等待转码，发布前可能要求补充封面、实名或人脸验证，请在弹出窗口中处理。注意：平台页面改版后可能需要重新适配。"
    : "发布通过账号独立的可见 Chrome 页面完成。提交只点击一次；若显示“结果待确认”，请先到小红书核对，系统不会自动重发。";
  const pubHint = $("pub-hint");
  if (pubHint) {
    const copy = pubHint.querySelector("span");
    if (copy) copy.textContent = pubHintText;
    else pubHint.textContent = pubHintText;
  }
  // 评论监控「类型」下拉随平台改写文案
  const wk = $("w-kind");
  if (wk) {
    const cur = wk.value;
    wk.innerHTML = PLATFORM === "xhs"
      ? '<option value="auto">类型:自动识别</option><option value="video">单条笔记</option><option value="user">创作者近期笔记</option>'
      : '<option value="auto">类型:自动识别</option><option value="video">单条视频</option><option value="user">账号近期作品</option>';
    if ([...wk.options].some(o => o.value === cur)) wk.value = cur;
  }
  const wl = $("w-url-label");
  if (wl) wl.textContent = PLATFORM === "xhs"
    ? "笔记链接 / 创作者主页 / xhslink 短链 / id"
    : PLATFORM === "kuaishou" ? "作品链接 / 创作者主页 / v.kuaishou.com 短链 / id"
    : "视频链接 / 账号主页 / sec_uid / 视频 id";
  if ($("w-url")) $("w-url").placeholder = PLATFORM === "xhs"
    ? "笔记链接=盯单条笔记;创作者主页或 user_id=盯创作者近期笔记"
    : PLATFORM === "kuaishou" ? "作品链接=盯单条作品;主页或 user_id=盯创作者近期作品"
    : "作品链接=盯单条视频;主页链接或 sec_uid=盯账号近期作品";
  const ckl = $("ck-label");
  if (ckl) ckl.textContent = PLATFORM === "xhs"
    ? "完整 Cookie(含 a1;发布需创作者会话)"
    : PLATFORM === "kuaishou" ? "完整 Cookie(含 userId 与 web_st)" : "完整 Cookie(含 sessionid)";
  if ($("ck-val")) $("ck-val").placeholder = PLATFORM === "xhs"
    ? "从 creator.xiaohongshu.com 登录后复制完整 Cookie"
    : PLATFORM === "kuaishou" ? "从 www.kuaishou.com 登录后复制完整 Cookie"
    : "从浏览器开发者工具复制完整 Cookie";
  applyMonitorForm();
  applyCollectionForm();
  if (PLATFORM === "douyin") applyDanmakuForm();
  if ($("t-kind") && PLATFORM !== "xhs") $("t-kind").value = "creator";
  // 视频号只有本账号数据,不支持「监控他人」:若正停在这些面板,自动切到「账号管理」
  if (pfIsChannels(PLATFORM)) {
    const cur = (document.querySelector('.navitem.active') || {}).dataset;
    if (cur && ["monitors", "comments", "autocomment"].includes(cur.tab)) switchTab("hub");
    // 视频号本账号只有「我的作品 / 数据」;若停在关注/粉丝/私信子页,切回我的作品
    if (["following", "fans", "dm"].includes(HUB_TAB)) switchHubTab("myworks");
  }
  if (PLATFORM !== "douyin" && CURRENT_TAB === "collections") switchTab("overview");
  // 不支持发布的平台:若正停在该面板则回到总览(当前四平台均支持,兜底保留)
  if (!pfHasPublish(PLATFORM)) {
    const pub = document.querySelector('[data-panel="publish"]');
    if (pub && pub.style.display !== "none") switchTab("overview");
  }
  csSyncAll();   // 平台切换可能改了下拉选项/值,同步自定义下拉显示
  updatePageContext();
}
function applyMonitorForm() {
  const title = $("mon-add-title");
  const lbl = $("t-url-label");
  if (PLATFORM === "douyin" || PLATFORM === "kuaishou") {
    const isKs = PLATFORM === "kuaishou";
    if (title) title.innerHTML = (isKs ? '添加创作者监控' : '添加作品监控')
      + ' <span class="sub">监控并下载新作品</span>';
    if (lbl) lbl.textContent = isKs ? "创作者主页链接 / 短链 / user_id" : "主页链接 / 短链 / sec_uid";
    $("t-url").placeholder = isKs
      ? "粘贴快手创作者主页链接、v.kuaishou.com 短链或 user_id"
      : "粘贴抖音主页链接、v.douyin.com 短链或 sec_uid";
    return;
  }
  const kind = $("t-kind") ? $("t-kind").value : "creator";
  if (kind === "keyword") {
    if (title) title.innerHTML = '添加关键词监控 <span class="sub">盯一个搜索词的新笔记</span>';
    if (lbl) lbl.textContent = "搜索关键词";
    $("t-url").placeholder = "例如:口红试色 / 露营装备";
  } else {
    if (title) title.innerHTML = '添加创作者监控 <span class="sub">监控并下载新笔记</span>';
    if (lbl) lbl.textContent = "创作者主页链接 / xhslink 短链 / user_id";
    $("t-url").placeholder = "粘贴小红书创作者主页链接、xhslink 短链或 24 位 user_id";
  }
}

// ─── 标签页切换 ───
function switchTab(name, pushHistory = false) {
  if (!PAGE_META[name]) name = "overview";
  const changed = CURRENT_TAB !== name;
  CURRENT_TAB = name;
  if (_openSelectClose) _openSelectClose();
  if (_openDateClose) _openDateClose();
  if (OPEN_META_COMBO) OPEN_META_COMBO.close();
  let activePanel = null;
  document.querySelectorAll("[data-panel]").forEach(p => {
    const active = p.dataset.panel === name;
    p.style.display = active ? "" : "none";
    p.classList.remove("panel-enter");
    if (active) activePanel = p;
  });
  if (changed && activePanel) requestAnimationFrame(() => {
    activePanel.classList.add("panel-enter");
    activePanel.addEventListener("animationend", () => activePanel.classList.remove("panel-enter"), { once: true });
  });
  document.querySelectorAll(".navitem").forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle("active", active);
    if (active) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  try { localStorage.setItem("dym-tab", name); } catch (e) {}
  try {
    if (pushHistory && changed) history.pushState(null, "", "#" + name);
    else if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  } catch (e) {}
  updatePageContext(name);
  window.scrollTo({ top: 0, behavior: "auto" });
  if (changed) requestAnimationFrame(() => {
    const title = $("page-title");
    if (title) title.focus({ preventScroll: true });
  });
  if (name === "hub") { refreshHubSummary(); refreshHubPanel(); }
  else stopDmStream();   // 离开本账号管理即断开私信实时流
  if (name === "share-download") {
    loadShareAccounts();
    refreshShareHistory();
  }
  if (name === "collections") { populateCollectionAccount(); refreshCollections(); }
  if (name === "risk-control") refreshRiskCenter();
}

