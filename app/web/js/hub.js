let HUB_ACC = "";
let HUB_TAB = (() => { try { return localStorage.getItem("dym-hubtab") || "myworks"; } catch (e) { return "myworks"; } })();
let DM_CONV = null;     // 当前打开的会话 id
let DM_CONVS = [];      // 会话缓存(供发送时取 peer 信息)
function hubAccKey() { return "dym-hubacc:" + PLATFORM; }
function loadHubAcc() { try { HUB_ACC = localStorage.getItem(hubAccKey()) || ""; } catch (e) { HUB_ACC = ""; } }
function setHubAcc(id) { HUB_ACC = String(id || ""); try { localStorage.setItem(hubAccKey(), HUB_ACC); } catch (e) {} if (HUB_TAB === "dm") startDmStream(); }

// 用该账号登录态弹出真实浏览器窗口,留给用户手动操作(收发私信 / 维护 / F12 抓接口)
async function openAccountBrowser(id) {
  await withBusy(evtBtn(), "打开中", async () => {
    try {
      const result = await api("/api/accounts/" + id + "/open-browser", { method: "POST" });
      if (result.logged_out) {
        toast("该账号登录态已失效，请关闭当前窗口后点「重新登录」完成扫码", "err", 8000);
        refreshAccounts();
      } else {
        toast("已弹出该账号浏览器窗口;用完请关窗(关窗即保存登录态)。窗口开着时该账号后台同步会暂停", "ok", 6000);
      }
    } catch (e) { toast("打开失败:" + e.message, "err"); }
  });
}

// 私信页:用当前选中账号打开真实浏览器手动收发(抖音私信走 WS,只能这样)
function openHubAccountBrowser() {
  if (!HUB_ACC) { toast("请先选择账号", "err"); return; }
  openAccountBrowser(+HUB_ACC);
}

// 从「账号」面板某行跳转查看该账号的本账号数据(作品/关注/粉丝/私信)
function openAccountHub(id) {
  setHubAcc(id);
  const s = $("hub-acc"); if (s) { s.value = HUB_ACC; if (s._csSync) s._csSync(); }
  DM_CONV = null;
  refreshHubSummary();
  switchTab("hub");
  switchHubTab("myworks");   // 默认落到「我的作品」,可再切关注/粉丝/私信
}

function populateHubAccounts() {
  const sel = $("hub-acc"); if (!sel) return;
  const list = ACCOUNTS;
  loadHubAcc();   // 账号按平台各记各的:先取当前平台上次选中的
  if (!list.some(a => String(a.id) === HUB_ACC)) setHubAcc(list.length ? list[0].id : "");
  sel.innerHTML = list.length
    ? list.map(a => `<option value="${a.id}">${esc(a.nickname || ("账号#" + a.id))}${a.status === "invalid" ? " · 登录失效" : ""}</option>`).join("")
    : `<option value="">无已登录账号</option>`;
  sel.value = HUB_ACC;
  if (sel._csSync) sel._csSync();
  refreshHubSummary();   // 账号列表/选中账号变了(含切平台)→ 立刻刷新计数徽章
}
function onHubAcc() {
  const sel = $("hub-acc"); if (!sel) return;
  setHubAcc(sel.value);
  DM_CONV = null;
  refreshHubSummary();
  refreshHubPanel();
}
// 面板内子标签(我的作品/关注/粉丝/私信)切换
function switchHubTab(name) {
  HUB_TAB = name;
  try { localStorage.setItem("dym-hubtab", name); } catch (e) {}
  document.querySelectorAll("[data-hubpanel]").forEach(p => { p.style.display = p.dataset.hubpanel === name ? "" : "none"; });
  document.querySelectorAll("[data-hubtab]").forEach(t => t.classList.toggle("active", t.dataset.hubtab === name));
  if (name === "dm") startDmStream(); else stopDmStream();
  refreshHubPanel();
}
// 计数徽章:纯查库汇总,进面板/换账号/切平台即刷新,不用点进子页才有数
async function refreshHubSummary() {
  const ids = { works: "hb-myworks", following: "hb-following", fans: "hb-fans", dm: "hb-dm" };
  const setAll = r => Object.entries(ids).forEach(([k, i]) => { const el = $(i); if (el) el.textContent = (r && r[k]) || 0; });
  if (!HUB_ACC) { setAll(null); return; }
  try { setAll(await api("/api/hub/summary?account_id=" + HUB_ACC)); }
  catch (e) { setAll(null); }
}
function refreshHubPanel() {
  const active = document.querySelector('.navitem.active');
  if (!active || active.dataset.tab !== "hub") return;
  if (HUB_TAB === "myworks") refreshMyWorks();
  else if (HUB_TAB === "following") refreshFollows("following");
  else if (HUB_TAB === "fans") refreshFollows("fan");
  else if (HUB_TAB === "dm") { refreshDmConvs(); startDmStream(); }
  else if (HUB_TAB === "stats") loadHubStats();
}

// ── 本账号数据分析(B4)──
function _kpiCard(label, val, delta) {
  const d = (delta === undefined || delta === null || delta === 0) ? ""
    : `<span class="kpi-delta ${delta > 0 ? "pos" : "neg"}">较上次 ${delta > 0 ? "+" : "−"}${fmtNum(Math.abs(delta))}</span>`;
  return `<div class="kpi-card"><div class="kpi-label">${esc(label)}</div>`
    + `<div class="kpi-value">${fmtNum(val)}${d}</div></div>`;
}
function _spark(vals) {
  // 极简 SVG 折线(粉丝趋势),无外部依赖
  vals = vals.filter(v => typeof v === "number");
  if (vals.length < 2) return '<div class="empty" style="padding:18px 8px"><div class="empty-t">趋势数据不足</div><div class="empty-sub">运行几天后会生成连续曲线</div></div>';
  const w = 480, h = 60, mn = Math.min(...vals), mx = Math.max(...vals), rng = (mx - mn) || 1;
  const points = vals.map((v, i) => ({ x: +(i / (vals.length - 1) * w).toFixed(1), y: +(h - (v - mn) / rng * (h - 10) - 5).toFixed(1) }));
  const pts = points.map(p => `${p.x},${p.y}`).join(" "), last = points[points.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".24"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" y1="${h - 5}" x2="${w}" y2="${h - 5}" stroke="var(--line-soft)" stroke-width="1"/>
    <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#spark-fill)"/>
    <polyline fill="none" stroke="var(--acc)" stroke-width="2.4" vector-effect="non-scaling-stroke" points="${pts}"/>
    <circle cx="${last.x}" cy="${last.y}" r="3.5" fill="var(--surface)" stroke="var(--acc)" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg>`;
}
async function loadHubStats() {
  const kpi = $("stats-kpi"), tr = $("stats-trend"), wb = $("stats-works");
  if (!kpi) return;
  if (!HUB_ACC) { kpi.innerHTML = ""; if (tr) tr.innerHTML = ""; if (wb) wb.innerHTML = `<tr><td colspan="5" class="mut">请先选择账号</td></tr>`; return; }
  try {
    const d = await api("/api/account-stats/" + HUB_ACC + "?days=30");
    if ($("hb-stats")) $("hb-stats").textContent = (d.works || []).length;
    kpi.innerHTML = _kpiCard("粉丝", d.account.follower_count || 0, d.fans_delta)
      + _kpiCard("作品数", d.account.aweme_count || 0)
      + _kpiCard("近30天快照", (d.trend || []).length);
    if (tr) {
      const vals = (d.trend || []).map(x => x.follower_count);
      const summary = vals.length > 1 ? `粉丝数从 ${fmtNum(vals[0])} 变化到 ${fmtNum(vals[vals.length - 1])}` : "粉丝趋势数据不足";
      tr.innerHTML = `<div class="trend-panel"><div class="trend-head"><b>粉丝趋势</b><span>近 30 天</span></div>`
        + `<div class="spark-wrap" role="img" aria-label="${summary}">${_spark(vals)}</div></div>`;
    }
    if (wb) wb.innerHTML = (d.works || []).length
      ? d.works.map(w => `<tr><td>${esc((w.desc || w.item_id || "").slice(0, 30))}</td>`
        + `<td class="num">${fmtNum(w.play_count || 0)}</td><td class="num">${fmtNum(w.like_count || 0)}</td><td class="num">${fmtNum(w.comment_count || 0)}</td>`
        + `<td><span class="pill bare">${esc(w.status || "—")}</span></td></tr>`).join("")
      : `<tr><td colspan="5" class="mut">暂无作品数据,先到「我的作品」点「同步作品」</td></tr>`;
  } catch (e) {
    kpi.innerHTML = `<div class="mut">加载失败:${esc(e.message)}</div>`;
  }
}
function hubGridEmpty(text, sub = "") {
  return `<div class="empty" style="width:100%;column-span:all;break-inside:avoid"><div class="empty-ic">${ic("i-inbox")}</div>` +
    `<div class="empty-t">${esc(text)}</div>${sub ? `<div class="empty-sub">${esc(sub)}</div>` : ""}</div>`;
}

// ── 我的作品 ──
async function refreshMyWorks() {
  const grid = $("mw-grid"); if (!grid) return;
  if (!HUB_ACC) { grid.innerHTML = hubGridEmpty("请先选择已登录账号"); return; }
  try {
    const list = await api("/api/account-works?account_id=" + HUB_ACC);
    if ($("hb-myworks")) $("hb-myworks").textContent = list.length;
    grid.innerHTML = list.length ? list.map(workCard).join("")
      : hubGridEmpty("暂无作品", "点右上「同步作品」抓取本账号已发布作品");
  } catch (e) { grid.innerHTML = hubGridEmpty("加载失败:" + e.message); }
}
function workLink(platform, id) {
  id = encodeURIComponent(id);
  if (platform === "xhs") return "https://www.xiaohongshu.com/explore/" + id;
  if (platform === "kuaishou") return "https://www.kuaishou.com/short-video/" + id;
  if (platform === "shipinhao") return "https://channels.weixin.qq.com/platform/post/list";
  return "https://www.douyin.com/video/" + id;
}
function openWork(platform, id) { try { window.open(workLink(platform, id), "_blank", "noopener"); } catch (e) {} }
function workCard(w) {
  const oc = `onclick="openWork('${esc(w.platform)}','${esc(w.item_id).replace(/'/g, "\'")}')"`;
  // 图裂时回退占位(onerror 换成灰底图标),避免绝对角标压到标题
  const cover = w.cover_url
    ? `<img class="ncard-cover" src="${w.cover_url}" referrerpolicy="no-referrer" loading="lazy" alt="" ${oc}
         onerror="this.onerror=null;this.removeAttribute('src');this.style.visibility='hidden'">`
    : `<div class="ncard-cover ph" ${oc}>${ic("i-image")}</div>`;
  const title = esc(w.desc || "无描述");
  return `<div class="ncard">
    ${cover}
    <span class="ncard-type">${ic(w.media_type === "video" ? "i-play" : "i-image")}${w.media_type === "video" ? "视频" : "图文"}</span>
    <div class="ncard-body">
      <p class="ncard-title" style="cursor:pointer" title="${title}" ${oc}>${title}</p>
      <div class="ncard-foot">
        <span class="metric like">${ic("i-heart")}${fmtNum(w.like_count)}</span>
        <span class="metric">${ic("i-msg")}${fmtNum(w.comment_count)}</span>
        ${w.play_count ? `<span class="metric">${ic("i-play")}${fmtNum(w.play_count)}</span>` : ""}
        <span class="like">${fmtTime(w.create_time)}</span>
      </div>
      <div class="ncard-actions">
        ${w.platform === "douyin" ? '<button class="ghost sm" onclick="monitorOwnWorkDanmaku(\'' + esc(w.item_id) + '\',' + (w.account_id || "null") + ')">' + ic("i-msg") + '弹幕</button>' : ""}
        <button class="ghost sm" onclick="openWorkComments(${w.id},'${esc(w.platform)}','${title.replace(/'/g, "\'")}')">${ic("i-msg")}评论</button>
      </div>
    </div>
  </div>`;
}
function monitorOwnWorkDanmaku(itemId, accountId) {
  if (PLATFORM !== "douyin") switchPlatform("douyin");
  switchTab("danmaku");
  if ($("d-w-url")) $("d-w-url").value = itemId || "";
  if ($("d-w-kind")) $("d-w-kind").value = "video";
  if ($("d-w-mode")) $("d-w-mode").value = "creator";
  applyDanmakuForm();
  if ($("d-w-acc") && accountId) $("d-w-acc").value = String(accountId);
  toast("已填入作品 ID，请确认后开始弹幕监控", "info", 5000);
}
async function syncMyWorks() {
  if (!HUB_ACC) { toast("请先选择账号", "err"); return; }
  await withBusy(evtBtn(), "同步中", async () => {
    try { const r = await api("/api/accounts/" + HUB_ACC + "/works/sync", { method: "POST" }); toast(`同步完成:抓到 ${r.fetched} 条,新增 ${r.added}`, "ok"); }
    catch (e) { toast("同步失败:" + e.message, "err"); }
  });
  refreshMyWorks();
}

// ── 作品评论(弹窗:抖音直连分页 / 小红书客户端 / 快手拦截,落库后展示)──
let WC_WORK = null;   // 当前查看评论的作品 {id, platform, title}
async function openWorkComments(workId, platform, title) {
  WC_WORK = { id: workId, platform, title: title || "" };
  $("wc-title").textContent = "评论 · " + (title || "");
  $("wc-count").textContent = "加载中…";
  $("wc-list").innerHTML = "";
  $("wcmodal").style.display = "flex";
  modalOpened($("wcmodal"));
  setTimeout(() => $("wcmodal").querySelector(".pv-close").focus(), 0);
  await loadWorkComments();
}
function hideWorkComments() {
  $("wcmodal").style.display = "none"; WC_WORK = null;
  modalClosed($("wcmodal"));
}
async function loadWorkComments() {
  if (!WC_WORK) return;
  try {
    const list = await api("/api/account-works/" + WC_WORK.id + "/comments");
    $("wc-count").textContent = list.length ? (list.length + " 条(含回复)") : "暂无评论";
    $("wc-list").innerHTML = list.length ? list.map(cmtRow).join("")
      : `<div class="empty" style="padding:26px"><div class="empty-ic">${ic("i-msg")}</div><div class="empty-t">还没抓到评论</div><div class="empty-sub">点右上「抓取评论」用该账号登录态拉取</div></div>`;
  } catch (e) {
    $("wc-count").textContent = "—";
    $("wc-list").innerHTML = `<div class="empty" style="padding:24px"><div class="empty-t">加载失败:${esc(e.message)}</div></div>`;
  }
}
function cmtRow(c) {
  return `<div class="wc-item${c.is_reply ? " reply" : ""}">
    <div class="wc-head"><b>${esc(c.user_nickname || "匿名")}</b><span class="wc-time">${fmtTime(c.create_time)}</span></div>
    <div class="wc-text">${esc(c.text || "")}</div>
    <div class="wc-meta">${ic("i-heart")}${fmtNum(c.like_count)}${c.is_reply ? " · 回复" : ""}</div>
  </div>`;
}
async function syncWorkComments() {
  if (!WC_WORK) return;
  await withBusy(evtBtn(), "抓取中", async () => {
    try { const r = await api("/api/account-works/" + WC_WORK.id + "/comments/sync", { method: "POST" }); toast(`抓到 ${r.fetched} 条,新增 ${r.added}`, "ok"); }
    catch (e) { toast("抓取失败:" + e.message, "err"); }
  });
  await loadWorkComments();
}

// ── 关注 / 粉丝 ──
// 小红书网页端不提供关注/粉丝列表(App 专属:实测无接口、无弹层),不做无用的同步
const XHS_FOLLOW_NA = "小红书网页端不提供关注 / 粉丝列表(仅 App 可见),无法同步。抖音 / 快手可正常同步。";
async function refreshFollows(direction) {
  const tbody = $(direction === "fan" ? "fans-table" : "following-table"); if (!tbody) return;
  if (PLATFORM === "xhs") {
    const badge = $(direction === "fan" ? "hb-fans" : "hb-following");
    if (badge) badge.textContent = "—";
    tbody.innerHTML = empty(3, direction === "fan" ? "粉丝列表网页端不可用" : "关注列表网页端不可用",
      "i-info", XHS_FOLLOW_NA);
    return;
  }
  if (!HUB_ACC) { tbody.innerHTML = empty(3, "请先选择已登录账号", "i-user"); return; }
  try {
    const list = await api(`/api/follows?account_id=${HUB_ACC}&direction=${direction}`);
    const badge = $(direction === "fan" ? "hb-fans" : "hb-following");
    if (badge) badge.textContent = list.length;
    tbody.innerHTML = list.length ? list.map(f => followRow(f, direction)).join("")
      : empty(3, direction === "fan" ? "暂无粉丝数据" : "暂无关注数据", "i-user", "点右上「同步」抓取");
  } catch (e) { tbody.innerHTML = empty(3, "加载失败:" + e.message, "i-info"); }
}
function followRow(f, direction) {
  const rel = f.is_mutual ? `<span class="pill active bare">互相关注</span>`
    : f.is_following ? `<span class="pill bare">已关注</span>`
      : `<span class="pill bare" style="color:var(--mut)">未关注</span>`;
  const act = f.is_following
    ? `<button class="ghost sm" onclick="actFollow('unfollow',${f.id})">取关</button>`
    : `<button class="ghost sm" onclick="actFollow('follow',${f.id})">回关</button>`;
  return `<tr>
    <td><div class="fu-cell">
      ${f.avatar ? `<img class="avatar" src="${f.avatar}" referrerpolicy="no-referrer" alt="">` : `<span class="avatar"></span>`}
      <div><div><b>${esc(f.nickname)}</b></div>${f.signature ? `<div class="fu-sign">${esc(f.signature)}</div>` : ""}</div>
    </div></td>
    <td>${rel}</td>
    <td class="acttd">${act}</td>
  </tr>`;
}
async function syncFollows(direction) {
  if (PLATFORM === "xhs") { toast(XHS_FOLLOW_NA, "info", 6000); return; }
  if (!HUB_ACC) { toast("请先选择账号", "err"); return; }
  await withBusy(evtBtn(), "同步中", async () => {
    try { const r = await api(`/api/accounts/${HUB_ACC}/follows/sync?direction=${direction}`, { method: "POST" }); toast(`同步完成:抓到 ${r.fetched} 条,新增 ${r.added}`, "ok"); }
    catch (e) { toast("同步失败:" + e.message, "err"); }
  });
  refreshFollows(direction);
}
async function actFollow(action, edgeId) {
  // 取该行 follow 边的目标信息(从已渲染列表里拿)
  const dir = HUB_TAB === "fans" ? "fan" : "following";
  let edge = null;
  try { const list = await api(`/api/follows?account_id=${HUB_ACC}&direction=${dir}`); edge = list.find(x => x.id === edgeId); } catch (e) {}
  if (!edge) { toast("找不到该用户,请重新同步", "err"); return; }
  const label = action === "unfollow" ? "取关" : "回关";
  if (!await uiConfirm({ title: label + "确认", message: `确认对「${edge.nickname}」${label}?将打开浏览器窗口执行(有头窗口,可手动过验证码)。`, danger: action === "unfollow" })) return;
  await withBusy(evtBtn(), label + "中", async () => {
    try {
      await api("/api/account-actions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: +HUB_ACC, action, target_uid: edge.uid, target_sec_uid: edge.sec_uid || "", target_nick: edge.nickname, run_now: true })
      });
      toast(label + "成功", "ok");
    } catch (e) { toast(label + "失败:" + e.message, "err"); }
  });
  refreshFollows(dir);
}

// ── 私信 ──
// ─── 私信实时接收(SSE):进 DM 面板订阅,新消息即时刷新;离开断开 ───
let DM_SSE = null, DM_SSE_ACC = "";
function startDmStream() {
  // 幂等:同账号已连就不重连(避免每次面板刷新/收到消息都断开重来)
  if (DM_SSE && DM_SSE_ACC === HUB_ACC && DM_SSE.readyState !== 2) return;
  stopDmStream();
  if (!HUB_ACC || PLATFORM !== "douyin") return;
  DM_SSE_ACC = HUB_ACC;
  try {
    DM_SSE = new EventSource(`/api/dm/stream?account_id=${HUB_ACC}`);
    DM_SSE.onmessage = (e) => {
      let evt; try { evt = JSON.parse(e.data); } catch (_) { return; }
      if (!evt || !evt.conv_id) return;
      // 当前打开的会话:实时刷新线程 + 标记已读(不让红点冒出来);否则只刷列表(会有红点)
      if (evt.conv_id === DM_CONV) { refreshDmMessages(); markDmRead(evt.conv_id); }
      else refreshDmConvs();
    };
    DM_SSE.onerror = () => { /* EventSource 自带重连 */ };
  } catch (_) {}
}
function stopDmStream() { if (DM_SSE) { try { DM_SSE.close(); } catch (_) {} DM_SSE = null; DM_SSE_ACC = ""; } }

async function refreshDmConvs() {
  const box = $("dm-convs"); if (!box) return;
  if (!HUB_ACC) { box.innerHTML = `<div class="empty" style="padding:24px"><div class="empty-t">请先选择账号</div></div>`; return; }
  try {
    const list = await api("/api/dm/conversations?account_id=" + HUB_ACC);
    DM_CONVS = list;
    if ($("hb-dm")) $("hb-dm").textContent = list.length;
    box.innerHTML = list.length ? list.map(convRow).join("")
      : `<div class="empty" style="padding:24px"><div class="empty-ic">${ic("i-send")}</div><div class="empty-t">暂无会话</div><div class="empty-sub">点右上「同步私信」</div></div>`;
    if (DM_CONV) { const el = box.querySelector(`.dm-conv[data-conv="${cssAttr(DM_CONV)}"]`); if (el) el.classList.add("active"); }
  } catch (e) { box.innerHTML = `<div class="empty" style="padding:24px"><div class="empty-t">加载失败:${esc(e.message)}</div></div>`; }
}
function cssAttr(s) { return (s || "").toString().replace(/"/g, '\\"'); }
function convRow(c) {
  return `<div class="dm-conv" data-conv="${esc(c.conv_id)}" onclick="openDmConv('${esc(c.conv_id).replace(/'/g, "\'")}')">
    ${c.peer_avatar ? `<img class="avatar" src="${c.peer_avatar}" referrerpolicy="no-referrer" alt="">` : `<span class="avatar"></span>`}
    <div class="meta"><b>${esc(c.peer_nickname)}</b><div class="last">${esc(c.last_text || "")}</div></div>
    ${c.unread_count ? `<span class="unread">${c.unread_count}</span>` : ""}
  </div>`;
}
async function syncDm() {
  if (!HUB_ACC) { toast("请先选择账号", "err"); return; }
  await withBusy(evtBtn(), "同步中", async () => {
    try { const r = await api("/api/accounts/" + HUB_ACC + "/dm/sync", { method: "POST" }); toast(`同步完成:抓到 ${r.fetched} 个会话,新增 ${r.added}`, "ok"); }
    catch (e) { toast("同步失败:" + e.message, "err"); }
  });
  refreshDmConvs();
}
async function openDmConv(convId) {
  DM_CONV = convId;
  document.querySelectorAll("#dm-convs .dm-conv").forEach(e => e.classList.toggle("active", e.dataset.conv === convId));
  const thread = $("dm-thread");
  if (thread) thread.innerHTML = `<div class="empty"><div class="empty-t">加载聊天记录…</div></div>`;
  // 抖音:点开会话时无头拉历史(imapi get_by_conversation),落库后再渲染
  if (PLATFORM === "douyin") {
    try { await api(`/api/accounts/${HUB_ACC}/dm/conversations/${convId}/fetch-history`, { method: "POST" }); }
    catch (e) { /* 拉取失败也照常显示库里已有的(最后一条) */ }
  }
  markDmRead(convId);
  await refreshDmMessages();
}
// 标记已读:清红点,刷新左侧列表
function markDmRead(convId) {
  if (!HUB_ACC || !convId) return;
  api(`/api/accounts/${HUB_ACC}/dm/conversations/${convId}/mark-read`, { method: "POST" })
    .then(() => refreshDmConvs()).catch(() => {});
}
// 分享视频卡片(msg_type=8):封面+标题+作者,点击跳抖音该视频
function dmVideoCard(c) {
  const url = c.item_id ? `https://www.douyin.com/video/${encodeURIComponent(c.item_id)}` : "#";
  const cover = c.cover
    ? `<img src="${esc(c.cover)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
    : "";
  const avatar = c.avatar
    ? `<img class="av" src="${esc(c.avatar)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
    : "";
  return `<a class="dm-vcard" href="${url}" target="_blank" rel="noopener">
    <div class="cov">${cover}<span class="play">▶</span></div>
    <div class="meta">
      <div class="ttl">${esc(c.title || "[视频]")}</div>
      <div class="au">${avatar}<span>${esc(c.author || "")}</span></div>
    </div>
  </a>`;
}
function dmBody(m) {
  if (m.card && m.card.kind === "video") return dmVideoCard(m.card);
  return esc(m.text);
}
async function refreshDmMessages() {
  const thread = $("dm-thread"); if (!thread || !HUB_ACC || !DM_CONV) return;
  try {
    const msgs = await api(`/api/dm/messages?account_id=${HUB_ACC}&conv_id=${encodeURIComponent(DM_CONV)}`);
    thread.innerHTML = msgs.length
      ? msgs.map(m => `<div class="dm-bubble ${m.direction === "out" ? "out" : "in"}${m.card ? " card" : ""}">${dmBody(m)}<span class="t">${fmtTime(m.create_time)}</span></div>`).join("")
      : `<div class="empty"><div class="empty-t">暂无消息记录</div><div class="empty-sub">该会话没有可拉取的历史(或对方为系统号)</div></div>`;
    thread.scrollTop = thread.scrollHeight;
  } catch (e) { thread.innerHTML = `<div class="empty"><div class="empty-t">加载失败:${esc(e.message)}</div></div>`; }
}
async function sendDm() {
  const inp = $("dm-input"); const text = (inp.value || "").trim();
  if (!HUB_ACC) { toast("请先选择账号", "err"); return; }
  if (!DM_CONV) { toast("请先选择左侧会话", "err"); return; }
  if (!text) return;
  const c = DM_CONVS.find(x => x.conv_id === DM_CONV) || {};
  await withBusy(evtBtn(), "发送中", async () => {
    try {
      await api("/api/account-actions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: +HUB_ACC, action: "send_dm", target_uid: c.peer_uid || "", target_sec_uid: c.peer_sec_uid || "", target_nick: c.peer_nickname || "", conv_id: DM_CONV, content: text, run_now: true })
      });
      inp.value = ""; toast("已发送", "ok");
      // 发完重拉历史,展示刚发出的消息(imapi 有短暂延迟,稍等再拉)
      await new Promise(r => setTimeout(r, 700));
      await openDmConv(DM_CONV);
    } catch (e) { toast("发送失败:" + e.message, "err"); }
  });
}
function accOptions(list, ph) {
  return `<option value="">${ph}</option>` +
    list.map(a => `<option value="${a.id}">${esc(a.nickname)}${a.has_creator ? " · 创作号" : ""}</option>`).join("");
}
function populateAccountSelect() {
  const sel = $("t-acc"); if (!sel) return;
  const required = PLATFORM === "xhs" || PLATFORM === "douyin";
  const platformName = PLATFORM === "xhs" ? "小红书" : "抖音";
  sel.innerHTML = accOptions(ACCOUNTS, required ? `请选择${platformName}账号(必选)` : "不指定账号");
  // 抖音匿名主页可能返回风控后的旧快照；作品监控与小红书一样必须使用登录态。
  if (required && ACCOUNTS.length) sel.value = String(ACCOUNTS[0].id);
}
function populateCollectionAccount() {
  const sel = $("col-account"); if (!sel) return;
  const current = sel.value;
  const list = ACCOUNTS.filter(a => a.platform === "douyin" && a.status !== "invalid" && a.has_storage);
  sel.innerHTML = accOptions(list, list.length ? "请选择抖音账号" : "暂无可用抖音账号");
  if (list.some(a => String(a.id) === current)) sel.value = current;
  else if (list.length) sel.value = String(list[0].id);
  if (sel._csSync) sel._csSync();
}
function populateWatchAccount() {
  const sel = $("w-acc"); if (!sel) return;
  const xhs = PLATFORM === "xhs";
  const creatorOnly = !xhs && $("w-mode") && $("w-mode").value === "creator";
  const list = creatorOnly ? ACCOUNTS.filter(a => a.has_creator) : ACCOUNTS;
  const ph = xhs ? "请选择小红书账号(必选)"
    : (creatorOnly && list.length === 0 ? "无创作者账号,请先创作者登录" : "不指定账号");
  sel.innerHTML = accOptions(list, ph);
  if (xhs && list.length) sel.value = String(list[0].id);
}
function populateDanmakuAccount() {
  const sel = $("d-w-acc"); if (!sel) return;
  const creatorOnly = $("d-w-mode") && $("d-w-mode").value === "creator";
  const list = creatorOnly
    ? ACCOUNTS.filter(a => a.platform === "douyin" && a.has_creator)
    : ACCOUNTS.filter(a => a.platform === "douyin");
  const ph = creatorOnly && !list.length ? "无创作者账号,请先创作者登录" : "不指定账号";
  sel.innerHTML = accOptions(list, ph);
  if (creatorOnly && list.length) sel.value = String(list[0].id);
}
function applyDanmakuForm() {
  const kind = $("d-w-kind") ? $("d-w-kind").value : "auto";
  const mode = $("d-w-mode") ? $("d-w-mode").value : "public";
  const isVideo = kind === "video";
  const recentWrap = $("d-w-recent-wrap");
  const daysWrap = $("d-w-days-wrap");
  if (recentWrap) recentWrap.hidden = isVideo;
  if (daysWrap) daysWrap.hidden = isVideo;
  const urlLabel = $("d-w-url-label");
  if (urlLabel) urlLabel.textContent = isVideo
    ? "视频链接 / aweme_id"
    : kind === "user" ? "账号主页 / sec_uid" : "视频链接 / 账号主页 / aweme_id";
  if ($("d-w-url")) $("d-w-url").placeholder = isVideo
    ? "作品链接或 aweme_id=监控单条视频弹幕"
    : kind === "user" ? "账号主页或 sec_uid=监控账号近期作品"
    : "作品链接=单条视频；主页链接=账号近期作品";
  const accLabel = $("d-w-acc-label");
  if (accLabel) accLabel.textContent = mode === "creator"
    ? "创作中心账号（必选）" : "播放页账号（可选）";
  const depthLabel = $("d-w-depth-label");
  if (depthLabel) depthLabel.textContent = mode === "creator"
    ? "创作中心翻页深度" : "弹幕加载轮次";
  const probeWrap = $("d-w-probe-wrap");
  if (probeWrap) probeWrap.hidden = mode === "creator";
  populateDanmakuAccount();
}
async function refreshProfile(id) {
  const btn = evtBtn();
  await withBusy(btn, "拉取中", async () => {
    try { const r = await api("/api/accounts/" + id + "/refresh-profile", { method: "POST" }); const idLbl = (r.platform || PLATFORM) === "xhs" ? " · 小红书号 " : " · 抖音号 "; toast("资料已更新:" + (r.nickname || "") + (r.douyin_id ? idLbl + r.douyin_id : ""), "ok"); }
    catch (e) { toast("刷新失败:" + e.message, "err"); }
  });
  refreshAccounts();
}
async function setProxy(id) {
  const a = ACCOUNTS.find(x => x.id === id);
  let opts = [];
  try { opts = await api("/api/proxies/options"); } catch (e) { }
  const cur = a && a.has_proxy ? a.proxy : "";
  const options = [
    { value: "auto", label: "🔀 自动分配(占用最少)" },
    ...opts.map(p => ({ value: p.url, label: `${p.label} · ${p.status} · 占用${p.used_by} · ${p.masked}${p.enabled ? "" : " · 已停用"}` })),
    { value: "__custom__", label: "✎ 手动输入地址…" },
    { value: "", label: "🚫 清除代理(走真实 IP)" },
  ];
  const v = await uiSelect({
    title: "账号代理",
    hint: (a ? a.nickname + " · " : "") + "当前:" + (cur || "未配置"),
    options, value: (cur && opts.some(o => o.value === cur)) ? cur : "auto",
  });
  if (v === null) return;
  try {
    if (v === "auto") {
      const r = await api("/api/accounts/" + id + "/assign-proxy", { method: "POST" });
      toast("已从代理池分配:" + r.proxy, "ok");
    } else if (v === "__custom__") {
      const url = await uiPrompt({
        title: "手动输入代理", value: cur,
        hint: "http://user:pass@host:port 或 socks5://host:port;留空=清除",
        placeholder: "http://user:pass@host:port" });
      if (url === null) return;
      const r = await api("/api/accounts/" + id + "/proxy", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxy: url.trim() }) });
      toast(url.trim() ? "代理已设置:" + r.proxy : "代理已清除", "ok");
    } else {
      const r = await api("/api/accounts/" + id + "/proxy", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxy: v }) });
      toast(v ? "代理已设置:" + r.proxy : "代理已清除", "ok");
    }
    refreshAccounts(); refreshProxies();
  } catch (e) { toast("设置失败:" + e.message, "err"); }
}

