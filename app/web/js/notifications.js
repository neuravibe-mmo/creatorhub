// ─── 通知渠道 ───
const N_TEMPLATES = {
  bark: '{\n  "key": "你的Bark设备key",\n  "server": "https://api.day.app"\n}',
  dingtalk: '{\n  "webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxx",\n  "secret": "加签密钥(可选)",\n  "keyword": "关键词(可选)"\n}',
  telegram: '{\n  "bot_token": "123:abc",\n  "chat_id": "你的chat_id"\n}',
};
function onTypeChange() {
  $("n-config").value = N_TEMPLATES[$("n-type").value] || "";
  setFieldError($("n-config"), "");
}
async function addChannel() {
  if (!validateNotificationConfig()) { $("n-msg").textContent = "请先修正渠道配置"; return; }
  let config;
  try { config = JSON.parse($("n-config").value || "{}"); }
  catch (e) { $("n-msg").textContent = "配置不是合法 JSON"; toast("配置不是合法 JSON", "err"); return; }
  $("n-msg").textContent = "添加中…";
  try {
    await api("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("n-name").value.trim(), type: $("n-type").value, config }),
    });
    $("n-name").value = ""; $("n-msg").textContent = "已添加 ✓"; toast("通知渠道已添加", "ok");
    refreshChannels();
  } catch (e) { $("n-msg").textContent = "失败: " + e.message; toast("添加失败:" + e.message, "err"); }
}
async function refreshChannels() {
  const cs = await api("/api/notifications");
  CHANNELS = cs;
  $("n-table").querySelector("tbody").innerHTML = cs.map(c => `<tr>
    <td>${esc(c.name)} <span class="mut">${c.type}</span></td>
    <td><span class="pill ${c.enabled ? "active" : "invalid"}">${c.enabled ? "启用" : "停用"}</span></td>
    <td class="acttd">
      <button class="ghost sm" onclick="editChannel(${c.id})">编辑</button>
      <button class="ghost sm" onclick="testChannel(${c.id})">测试</button>
      <button class="ghost sm" onclick="toggleChannel(${c.id}, ${!c.enabled})">${c.enabled ? "停用" : "启用"}</button>
      <button class="ghost sm danger" onclick="delChannel(${c.id})">${ic("i-trash")}删除</button>
    </td></tr>`).join("") || empty(3, "还没有通知渠道", "i-bell", "添加 Bark / 钉钉 / Telegram 渠道，有新作品或新评论时推送给你");
}
async function editChannel(id, draft = null) {
  const c = CHANNELS.find(x => x.id === id); if (!c) return;
  const initial = draft || { name: c.name || "", raw: JSON.stringify(c.config || {}, null, 2) };
  const value = await new Promise(res => {
    _uiResolve = res; _uiCancelVal = null;
    _uiGetVal = () => ({
      name: $("ec-name").value.trim(),
      raw: $("ec-config").value.trim(),
    });
    $("ui-body").innerHTML = `
      <div><label class="field" for="ec-name">渠道名称</label>
        <input id="ec-name" value="${esc(initial.name)}" maxlength="60"></div>
      <div><label class="field" for="ec-config">配置 JSON</label>
        <textarea id="ec-config" rows="9" spellcheck="false">${esc(initial.raw)}</textarea></div>`;
    _uiOpen("编辑通知渠道", `类型：${c.type} · 修改密钥或地址后建议立即发送测试通知。`, { okText: "保存修改", wide: true });
  });
  if (value === null) return;
  let config;
  try { config = JSON.parse(value.raw || "{}"); }
  catch (e) {
    toast("配置不是合法 JSON，请修正后再保存", "err");
    return editChannel(id, value);
  }
  try {
    await api("/api/notifications/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.name || c.type, config }),
    });
    toast("通知渠道已更新", "ok"); refreshChannels();
  } catch (e) { toast("更新失败:" + e.message, "err"); }
}
async function testChannel(id) {
  const btn = event.target.closest("button"); btn.disabled = true; btn.textContent = "发送中…";
  try { const r = await api("/api/notifications/" + id + "/test", { method: "POST" }); btn.textContent = r.ok ? "成功 ✓" : "失败"; toast(r.ok ? "测试推送已发送" : "发送失败:" + (r.detail || ""), r.ok ? "ok" : "err"); }
  catch (e) { btn.textContent = "失败"; toast("发送失败:" + e.message, "err"); }
  setTimeout(() => { btn.disabled = false; btn.textContent = "测试"; }, 1500);
}
async function toggleChannel(id, enabled) { try { await api("/api/notifications/" + id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }); refreshChannels(); } catch (e) { toast("操作失败:" + e.message, "err"); } }
async function delChannel(id) { if (await uiConfirm({ title: "删除渠道", message: "删除该通知渠道?", okText: "删除", danger: true })) { try { await api("/api/notifications/" + id, { method: "DELETE" }); toast("渠道已删除", "ok"); refreshChannels(); } catch (e) { toast("删除失败:" + e.message, "err"); } } }

