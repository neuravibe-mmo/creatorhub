// ─── 扫码登录(真实浏览器窗口) ───
let qrTimer = null;
// 登录前选代理:返回 "" (不用) | "auto" | 具体url | null(取消)
async function choosePreLoginProxy() {
  let opts = [];
  try { opts = await api("/api/proxies/options"); } catch (e) { }
  const options = [
    { value: "auto", label: opts.length ? "自动分配（占用最少）" : "自动分配（池为空时不用代理）" },
    ...opts.map(p => ({ value: p.url, label: `${p.label} · ${p.status} · 占用${p.used_by} · ${p.masked}${p.enabled ? "" : " · 已停用"}` })),
    { value: "__custom__", label: "✎ 手动输入指定代理…" },
    { value: "", label: "不用代理（使用本机网络）" },
  ];
  const v = await uiSelect({
    title: "选择本次登录使用的代理",
    hint: "整个登录/扫码过程都走它,从一开始就绑定这条 IP(最稳)。",
    options, value: "auto",
  });
  if (v === null) return null;
  if (v === "__custom__") {
    const url = await uiPrompt({
      title: "手动输入指定代理",
      hint: "http://user:pass@host:port 或 socks5://host:port;裸 ip:port 默认 HTTP",
      placeholder: "http://user:pass@host:port" });
    if (url === null || !url.trim()) return null;
    return url.trim();
  }
  return v;
}
function loginStartUrl(path, proxy) {
  return path + "?proxy=" + encodeURIComponent(proxy);
}
async function startLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开浏览器窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/browser/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>浏览器窗口已打开</b>，请在该窗口点击「登录」并使用抖音 App 扫码。<br>完成后这里会自动刷新。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("登录启动失败:" + e.message, "err"); }
}
function loginEnvironmentText(env) {
  if (!env || !env.backend_label) return "";
  let text = env.backend_label;
  if (env.has_proxy) text += " · 账号代理";
  if (env.fallback_reason) text += "（" + env.fallback_reason + "）";
  return text;
}
function pollLogin(tid) {
  clearInterval(qrTimer);
  clearTimeout(qrTimer);
  let accountShown = false;
  const tick = async () => {
    try {
      const res = await api("/api/login/browser/poll?task_id=" + tid);
      const envText = loginEnvironmentText(res.environment);
      if (["opening", "waiting"].includes(res.status) && envText) {
        $("qrstatus").innerHTML = `${ic("i-eye")} 浏览器已打开 · <b>${esc(envText)}</b><br>请在可见窗口完成登录。`;
      }
      if (res.status === "persisted") {
        $("qrstatus").textContent = "扫码已确认，正在校验登录态并同步账号资料…";
        if (!accountShown) {
          accountShown = true;
          toast("扫码已确认，正在校验登录态", "info");
          refreshAccounts();
        }
      } else if (res.status === "confirmed") {
        clearTimeout(qrTimer);
        if (res.profile_status === "invalid") {
          $("qrstatus").textContent = "登录校验未通过，请重新扫码";
          toast((PF_NAME[PLATFORM] || "账号") + "登录校验未通过，请重新扫码", "err");
        } else {
          const suffix = res.profile_status === "error" ? "（资料稍后同步）" : "";
          $("qrstatus").textContent = "登录成功 ✓ " + (res.nickname || "") + suffix;
          toast("登录成功 " + (res.nickname || "") + suffix, res.profile_status === "error" ? "info" : "ok");
          setTimeout(() => { $("qrbox").style.display = "none"; }, 650);
        }
        refreshAccounts();
        return;
      } else if (res.status === "expired") {
        clearTimeout(qrTimer); $("qrstatus").textContent = "超时未登录,请重试"; toast("二维码超时,请重试", "err");
        return;
      } else if (res.status === "error") {
        clearTimeout(qrTimer); $("qrstatus").textContent = "出错: " + (res.error || ""); toast("登录出错:" + (res.error || ""), "err");
        return;
      }
      qrTimer = setTimeout(tick, 600);
    } catch (e) { clearTimeout(qrTimer); $("qrstatus").textContent = e.message; }
  };
  tick();
}

// ─── 创作者登录(自有账号评论模式用) ───
async function startCreatorLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开创作中心窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/creator/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>创作中心窗口已打开</b>，请在该窗口扫码登录抖音账号。<br>此登录态也可用于公开抓取。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("创作者登录启动失败:" + e.message, "err"); }
}

// ─── 小红书扫码登录 ───
async function startXhsLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开小红书窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/xhs/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>小红书官网首页已打开</b>，请在窗口中点击「登录」并使用小红书 App 扫码。<br>主站登录成功后会保存读取登录态并自动关闭窗口。<br>如需发布，请随后单独点击「创作者登录」。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("小红书登录启动失败:" + e.message, "err"); }
}

// ─── 小红书创作者登录(发布用) ───
async function startXhsCreatorLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开小红书创作平台窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/xhs-creator/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>小红书创作平台窗口已打开</b>，请扫码登录，此登录态用于发布。<br>登录成功后请稍等片刻再关闭窗口。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("创作者登录启动失败:" + e.message, "err"); }
}

// ─── 快手扫码登录 ───
async function startKsLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开快手窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/kuaishou/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>快手窗口已打开</b>，请在该窗口点击「登录」并使用快手 App 扫码。<br>完成后这里会自动刷新。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("快手登录启动失败:" + e.message, "err"); }
}

// ─── 快手创作者登录(发布用) ───
async function startKsCreatorLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开快手创作平台窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/kuaishou-creator/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>快手创作平台窗口已打开</b>，请扫码登录，此登录态用于发布。<br>登录成功后请稍等片刻再关闭窗口。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("创作者登录启动失败:" + e.message, "err"); }
}

// ─── 视频号扫码登录(读取/发布共用,微信扫码) ───
async function startChannelsLogin() {
  const proxy = await choosePreLoginProxy();
  if (proxy === null) return;
  $("cookiebox").style.display = "none";
  $("qrbox").style.display = "block";
  $("qrstatus").textContent = "正在打开视频号助手窗口…";
  try {
    const res = await api(loginStartUrl("/api/login/shipinhao/start", proxy), { method: "POST" });
    $("qrstatus").innerHTML = `${ic("i-eye")} <b>视频号助手窗口已打开</b>，请使用微信扫码登录，读取和发布共用此登录态。<br>登录成功后请稍等片刻再关闭窗口。`;
    pollLogin(res.task_id);
  } catch (e) { $("qrstatus").textContent = "启动失败: " + e.message; toast("视频号登录启动失败:" + e.message, "err"); }
}

// ─── Cookie 登录 ───
function toggleCookie() {
  $("qrbox").style.display = "none";
  clearInterval(qrTimer);
  const b = $("cookiebox");
  b.style.display = b.style.display === "none" ? "block" : "none";
}
async function saveCookie() {
  const cookie = $("ck-val").value.trim();
  if (!cookie) { toast("请先粘贴 Cookie", "err"); return; }
  try {
    await api("/api/login/cookie", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookie, nickname: $("ck-nick").value.trim(), platform: PLATFORM }),
    });
    $("ck-val").value = ""; $("cookiebox").style.display = "none";
    toast("Cookie 已保存", "ok"); refreshAccounts();
  } catch (e) { toast("保存失败:" + e.message, "err"); }
}

