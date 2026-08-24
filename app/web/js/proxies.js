// ─── 代理池 ───
let PROXIES = [];
let LAST_DETECT = null;   // {url, geo} 判别结果,加入池时一并带上归属地
async function refreshProxies() {
  const tb = $("proxy-table"); if (!tb) return;
  let rows = [];
  try { rows = await api("/api/proxies"); } catch (e) { return; }
  PROXIES = rows;
  const stCls = s => s === "ok" ? "active" : s === "bad" ? "invalid" : "bare";
  const stTxt = { ok: "正常", bad: "不可用", unknown: "未测" };
  const geoCell = p => {
    if (!p.geo_checked) return `<span class="pill bare">未测</span>`;
    const cls = p.is_mainland ? "active" : "invalid";
    const warn = p.is_mainland ? "" : ' <span title="非中国大陆 IP,与抖音/小红书国内账号时区不符,有风控风险">⚠️</span>';
    return `<div><span class="pill ${cls}">${esc(p.geo_loc || "未知")}</span>${warn}</div>` +
      (p.exit_ip ? `<div class="mut" style="font-size:11px;margin-top:2px">${esc(p.exit_ip)}${p.isp ? " · " + esc(p.isp) : ""}</div>` : "");
  };
  tb.querySelector("tbody").innerHTML = rows.map(p => `<tr>
      <td>
        <div><b>${esc(p.label || "(未命名)")}</b> <span class="pill ${stCls(p.status)}">${stTxt[p.status] || p.status}</span>${p.enabled ? "" : ' <span class="pill bare">已停用</span>'}</div>
        <div class="mut" style="font-size:11px;margin-top:2px"><code>${esc(p.url)}</code></div>
        ${p.note ? `<div class="mut" style="font-size:11px">${esc(p.note)}</div>` : ""}
      </td>
      <td>${geoCell(p)}</td>
      <td><span class="pill ${p.used_by ? "active" : "bare"}">${p.used_by} 个账号</span></td>
      <td class="acttd">
        <button class="ghost sm" onclick="editPoolProxy(${p.id})">编辑</button>
        <button class="ghost sm" onclick="testPoolProxy(${p.id})">测试</button>
        <button class="ghost sm" onclick="togglePoolProxy(${p.id},${p.enabled})">${p.enabled ? "停用" : "启用"}</button>
        <button class="ghost sm danger" onclick="delPoolProxy(${p.id},${p.used_by})">${ic("i-trash")}删除</button>
      </td>
    </tr>`).join("") || empty(4, "代理池为空", "i-shield", "添加住宅/4G 代理,账号即可一号一代理关联使用");
}
async function detectProxy() {
  const raw = $("px-url").value.trim();
  if (!raw) { toast("请先填代理地址", "err"); return; }
  const btn = event.target.closest("button"); btn.disabled = true; const old = btn.textContent; btn.textContent = "判别中…";
  try {
    const r = await api("/api/proxies/detect", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: raw }) });
    if (!r.ok) { toast("判别失败:" + (r.error || ""), "err"); return; }
    if ($("px-proto") && (r.scheme === "http" || r.scheme === "socks5")) $("px-proto").value = r.scheme;
    $("px-url").value = r.recommend;        // 回填带协议的规范地址
    LAST_DETECT = { url: r.recommend, geo: r.geo || null };
    // 归属地写进备注(若备注为空),方便核对 IP 地区与账号是否一致
    if (r.geo_text && $("px-label") && !$("px-label").value.trim()) {
      const g = r.geo || {};
      $("px-label").value = [g.country, g.region, g.city].filter(Boolean).join("·") || "已判别";
    }
    const tag = r.scheme.toUpperCase() + (r.auth === "required" ? " · 需账密" : " · 免密");
    toast("判别:" + tag + (r.geo_text ? "  |  " + r.geo_text : "  |  归属地未取到"), r.browser_ok ? "ok" : "info");
    if (!r.browser_ok) toast("⚠️ " + r.note, "err", 8000);
  } catch (e) { toast("判别失败:" + e.message, "err"); }
  finally { btn.disabled = false; btn.textContent = old; }
}
async function addProxy() {
  let url = $("px-url").value.trim();
  if (!url) { toast("请填代理地址", "err"); return; }
  // 裸 ip:port 按所选协议补全;已带协议头则尊重原值
  if (!/:\/\//.test(url)) url = ($("px-proto") ? $("px-proto").value : "http") + "://" + url;
  const geo = (LAST_DETECT && LAST_DETECT.url === url) ? LAST_DETECT.geo : null;
  try {
    await api("/api/proxies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, label: $("px-label").value.trim(), geo }) });
    $("px-url").value = ""; $("px-label").value = "";
    toast("已加入代理池", "ok"); refreshProxies();
  } catch (e) { toast("添加失败:" + e.message, "err"); }
}
async function delPoolProxy(id, used) {
  if (!await uiConfirm({ title: "删除代理", okText: "删除", danger: true,
    message: "删除该代理?" + (used ? `\n⚠️ 有 ${used} 个账号正在用它,删除后这些账号需另选代理。` : "") })) return;
  try { await api("/api/proxies/" + id, { method: "DELETE" }); toast("已删除", "ok"); refreshProxies(); }
  catch (e) { toast("删除失败:" + e.message, "err"); }
}
async function editPoolProxy(id) {
  const p = PROXIES.find(x => x.id === id);
  if (!p) return;
  const label = await uiPrompt({
    title: "编辑代理备注",
    hint: p.url + (p.geo_loc ? "  ·  " + p.geo_loc : ""),
    value: p.label || "", placeholder: "如 住宅-广东-01" });
  if (label === null) return;
  try {
    await api("/api/proxies/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }) });
    toast("备注已更新", "ok"); refreshProxies();
  } catch (e) { toast("更新失败:" + e.message, "err"); }
}
async function togglePoolProxy(id, enabled) {
  try {
    await api("/api/proxies/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }) });
    refreshProxies();
  } catch (e) { toast("操作失败:" + e.message, "err"); }
}
async function testPoolProxy(id) {
  const btn = event.target.closest("button"); btn.disabled = true; const old = btn.textContent; btn.textContent = "测试中…";
  try { const r = await api("/api/proxies/" + id + "/test", { method: "POST" });
    toast((r.ok ? "可用 ✓ " : "不可用 ✗ ") + (r.detail || "") + (r.geo_text ? "  |  " + r.geo_text : ""), r.ok ? "ok" : "err"); }
  catch (e) { toast("测试失败:" + e.message, "err"); }
  finally { btn.disabled = false; btn.textContent = old; refreshProxies(); }
}
async function testAllProxies() {
  if (!PROXIES.length) { toast("代理池为空", "info"); return; }
  toast("开始逐个测试…", "info");
  for (const p of PROXIES) {
    try { await api("/api/proxies/" + p.id + "/test", { method: "POST" }); } catch (e) { }
  }
  toast("测试完成", "ok"); refreshProxies();
}
async function importProxies() {
  const text = await uiPrompt({
    title: "批量导入代理",
    hint: "每行一个,支持 # 注释、空行;可写「备注,地址」。\n⚠️ 裸 ip:port 默认 HTTP;SOCKS5 需加 socks5:// 前缀。",
    multiline: true, rows: 8,
    placeholder: "住宅-01,1.2.3.4:8080\nsocks5://user:pass@5.6.7.8:1080" });
  if (text === null || !text.trim()) return;
  try {
    const r = await api("/api/proxies/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }) });
    let msg = `导入完成:新增 ${r.added}`;
    if (r.skipped) msg += ` · 重复跳过 ${r.skipped}`;
    if (r.invalid) msg += ` · 格式无效 ${r.invalid}`;
    toast(msg, r.added ? "ok" : "info");
    refreshProxies();
  } catch (e) { toast("导入失败:" + e.message, "err"); }
}
async function assignAllProxies() {
  const noProxy = ACCOUNTS.filter(a => !a.has_proxy).length;
  if (!noProxy) { toast("所有账号都已配置代理", "info"); return; }
  if (!await uiConfirm({ title: "批量分配代理", message: `给 ${noProxy} 个未配代理的账号从池里自动分配(均衡,占用最少优先)?` })) return;
  const btn = event.target.closest("button"); if (btn) { btn.disabled = true; btn.textContent = "分配中…"; }
  try {
    const r = await api("/api/accounts/assign-proxies-all", { method: "POST" });
    let msg = `已分配 ${r.assigned} 个账号`;
    if (r.unassigned) msg += `,还有 ${r.unassigned} 个没分到(代理池不够,请再加代理)`;
    toast(msg, r.unassigned ? "info" : "ok");
    refreshAccounts(); refreshProxies();
  } catch (e) { toast("分配失败:" + e.message, "err"); }
  finally { if (btn) { btn.disabled = false; btn.textContent = "给账号批量分配"; } }
}
async function testProxy(id) {
  const btn = event.target.closest("button"); btn.disabled = true; const old = btn.textContent; btn.textContent = "测试中…";
  try {
    const r = await api("/api/accounts/" + id + "/test-proxy", { method: "POST" });
    toast((r.ok ? "代理可用 ✓ " : "代理不可用 ✗ ") + (r.detail || ""), r.ok ? "ok" : "err");
  } catch (e) { toast("测试失败:" + e.message, "err"); }
  finally { btn.disabled = false; btn.textContent = old; refreshAccounts(); }
}
async function relogin(id) {
  const btn = evtBtn();
  await withBusy(btn, "启动中", async () => {
    try {
      const res = await api("/api/accounts/" + id + "/relogin/start", { method: "POST" });
      toast("已打开浏览器窗口,请扫码重新登录该账号", "info");
      pollReloginTask(res.task_id);
    } catch (e) { toast("启动失败:" + e.message, "err"); }
  });
}
function pollReloginTask(tid) {
  let t = null;
  let persistedShown = false;
  const tick = async () => {
    try {
      const r = await api("/api/login/browser/poll?task_id=" + tid);
      if (r.status === "persisted" && !persistedShown) {
        persistedShown = true;
        toast("扫码已确认，正在校验登录态", "info");
        refreshAccounts();
      } else if (r.status === "confirmed") {
        clearTimeout(t);
        if (r.profile_status === "invalid") {
          toast("登录校验未通过，请重新扫码", "err");
        } else {
          const suffix = r.profile_status === "error" ? "（资料稍后同步）" : "";
          toast("重新登录成功 " + (r.nickname || "") + suffix, r.profile_status === "error" ? "info" : "ok");
        }
        refreshAccounts(); return;
      } else if (r.status === "expired") {
        clearTimeout(t); toast("超时未登录,请重试", "err"); return;
      } else if (r.status === "error") {
        clearTimeout(t); toast("出错:" + (r.error || ""), "err"); return;
      }
      t = setTimeout(tick, 600);
    } catch (e) { clearTimeout(t); }
  };
  tick();
}
async function delAccount(id) {
  const a = ACCOUNTS.find(x => x.id === id);
  const warn = a && a.monitor_count > 0 ? `\n⚠️ 有 ${a.monitor_count} 个监控正在用它,删除后这些监控将无登录态(需改用其它账号)。` : "";
  if (!await uiConfirm({ title: "删除账号", message: "删除该账号?" + warn, okText: "删除", danger: true })) return;
  try { await api("/api/accounts/" + id, { method: "DELETE" }); toast("账号已删除", "ok"); refreshAccounts(); }
  catch (e) { toast("删除失败:" + e.message, "err"); }
}

