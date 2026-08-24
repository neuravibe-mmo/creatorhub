function esc(s) { return (s || "").toString().replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function loop() {
  if (INFLIGHT > 0 || document.hidden) return;   // 慢操作/后台标签页不刷新,减少干扰与无效请求
  refreshMonitors(); refreshContents(); refreshWatches(); refreshComments(); refreshDanmakuWatches(); refreshDanmaku(); refreshOverviewChart(); refreshCommentRules(); refreshCommentTasks(); if (pfHasPublish(PLATFORM)) refreshPublish();
  if (CURRENT_TAB === "collections") refreshCollections();
  if (CURRENT_TAB === "risk-control") refreshRiskCenter();
}

// initial skeletons while data loads
$("mon-table").innerHTML = skeleton(8);
$("content-table").innerHTML = skeleton(8);
$("sd-history-body").innerHTML = skeleton(8);
$("watch-table").innerHTML = skeleton(9);
$("comment-table").innerHTML = skeleton(6);
$("danmaku-watch-table").innerHTML = skeleton(8);
$("danmaku-table").innerHTML = skeleton(6);
$("collection-job-table").innerHTML = collectionTaskSkeleton(3);
$("collection-content-list").innerHTML = collectionResultSkeleton(4);

// restore last-selected section (default: 总览);旧版四个独立页已并入「账号管理」
const VALID_TABS = ["overview", "accounts", "risk-control", "collections", "monitors", "comments", "danmaku", "hub", "publish", "autocomment", "share-download", "notifications", "settings"];
const LEGACY_HUB_TABS = ["myworks", "following", "fans", "dm"];
switchTab((() => {
  try {
    const hashTab = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (VALID_TABS.includes(hashTab)) return hashTab;
    const t = localStorage.getItem("dym-tab");
    if (LEGACY_HUB_TABS.includes(t)) { HUB_TAB = t; return "hub"; }
    return VALID_TABS.includes(t) ? t : "overview";
  } catch (e) { return "overview"; }
})());
switchHubTab(HUB_TAB);   // 恢复上次停留的子标签(我的作品/关注/粉丝/私信)

// restore last-selected platform (default: 抖音)
PLATFORM = (() => { try { const p = localStorage.getItem("dym-pf"); return ["xhs", "douyin", "kuaishou", "shipinhao"].includes(p) ? p : "douyin"; } catch (e) { return "douyin"; } })();
applyPlatformUI();

onTypeChange(); bindPubFilePicker(); onPubType(); populateWatchAccount(); applyDanmakuForm(); onAcMode(); loadSettings(); refreshAccounts(); refreshProxies(); refreshChannels(); loop();
enhanceAllSelects();   // 把所有原生 <select> 升级为美化下拉
enhanceAllMetaControls(); // 分组/标签：当前平台词库下拉，可搜索并新增
enhanceAllDateTime();  // 把 datetime-local 升级为自定义日期选择器
// 编辑弹窗和异步列表会动态插入控件；统一做渐进增强，避免新旧样式混用。
const controlEnhancer = new MutationObserver(records => {
  records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType !== 1) return;
    enhanceAllSelects(node);
    enhanceAllDateTime(node);
  }));
});
controlEnhancer.observe(document.body, { childList: true, subtree: true });

// shell 交互：浏览器前进/后退、平台键盘切换、长页面返回顶部。
window.addEventListener("hashchange", () => {
  const tab = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (VALID_TABS.includes(tab) && tab !== CURRENT_TAB) switchTab(tab);
});
document.querySelector(".pswitch").addEventListener("keydown", e => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const buttons = [...document.querySelectorAll(".pswitch button")];
  let index = buttons.indexOf(document.activeElement);
  if (e.key === "Home") index = 0;
  else if (e.key === "End") index = buttons.length - 1;
  else index = (index + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[index].focus();
  switchPlatform(buttons[index].dataset.pf);
});
let _backTopTick = false;
window.addEventListener("scroll", () => {
  if (_backTopTick) return;
  _backTopTick = true;
  requestAnimationFrame(() => {
    $("backtop").classList.toggle("show", window.scrollY > 520);
    _backTopTick = false;
  });
}, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });
setInterval(loop, 8000);
