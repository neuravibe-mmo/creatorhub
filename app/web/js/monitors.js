// ─── 监控 ───
// ═══════════ 关键词批量采集（当前版本：抖音）═══════════
function parseCollectionKeywords(raw) {
  const seen = new Set();
  return String(raw || "")
    .split(/[,，、;；\n]+/).map(x => x.trim()).filter(x => {
      const key = x.toLocaleLowerCase();
      if (!x || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 21);
}
function collectionKeywords() {
  return parseCollectionKeywords($("col-keywords") ? $("col-keywords").value : "");
}
function applyCollectionForm() {
  const enabled = !!($("col-download") && $("col-download").checked);
  if ($("col-dir-wrap")) $("col-dir-wrap").style.display = enabled ? "" : "none";
}
function collectionStatus(status) {
  const labels = { pending: "等待中", running: "采集中", done: "已完成", partial: "部分完成", failed: "失败", canceled: "已取消" };
  const classes = { pending: "pending", running: "downloading", done: "done", partial: "pending", failed: "failed", canceled: "skipped" };
  return { label: labels[status] || status, cls: classes[status] || "skipped" };
}
function collectionLastError(job) {
  const lines = String(job && job.error || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}
function collectionDate(value) {
  if (!value) return "—";
  const parsed = new Date(value.endsWith && value.endsWith("Z") ? value : value + "Z");
  return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleString();
}
async function createCollection() {
  const keywords = collectionKeywords();
  const accountId = Number($("col-account").value || 0);
  const contentLimit = Number($("col-content-limit").value || 0);
  const commentLimit = Number($("col-comment-limit").value || 0);
  const pageLimit = Number($("col-page-limit").value || 0);
  const stagnantPages = Number($("col-stagnant-pages").value || 0);
  const minLikes = Number($("col-min-likes").value || 0);
  const minComments = Number($("col-min-comments").value || 0);
  let valid = true;
  valid = setFieldError($("col-keywords"), !keywords.length ? "请至少填写一个关键词" : keywords.length > 20 ? "单个任务最多 20 个关键词" : "") && valid;
  valid = setFieldError($("col-account"), !accountId ? "请选择一个已登录账号" : "") && valid;
  valid = setFieldError($("col-content-limit"), contentLimit < 1 || contentLimit > 100 ? "请输入 1–100" : "") && valid;
  valid = setFieldError($("col-comment-limit"), commentLimit < 0 || commentLimit > 200 ? "请输入 0–200" : "") && valid;
  valid = setFieldError($("col-page-limit"), pageLimit < 1 || pageLimit > 40 ? "请输入 1–40" : "") && valid;
  valid = setFieldError($("col-stagnant-pages"), stagnantPages < 1 || stagnantPages > 8 ? "请输入 1–8" : "") && valid;
  valid = setFieldError($("col-min-likes"), minLikes < 0 ? "请输入非负整数" : "") && valid;
  valid = setFieldError($("col-min-comments"), minComments < 0 ? "请输入非负整数" : "") && valid;
  if (!valid) {
    const first = document.querySelector('[data-panel="collections"] [aria-invalid="true"]');
    if (first) first.focus();
    return;
  }
  const btn = evtBtn();
  await withBusy(btn, "创建中", async () => {
    try {
      const job = await api("/api/collections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "douyin", account_id: accountId, keywords,
          max_contents_per_keyword: contentLimit,
          max_pages_per_keyword: pageLimit,
          stagnant_pages: stagnantPages,
          search_sort: $("col-sort").value || "general",
          publish_time: $("col-publish-time").value || "all",
          content_type: $("col-content-type").value || "all",
          min_likes: minLikes,
          min_comments: minComments,
          max_comments_per_content: commentLimit,
          include_replies: $("col-replies").checked,
          download_media: $("col-download").checked,
          video_quality: $("col-quality").value || "highest",
          download_dir: $("col-download-dir").value.trim(),
        }),
      });
      $("col-create-msg").textContent = `任务 #${job.id} 已进入队列`;
      $("col-keywords").value = "";
      toast("关键词采集任务已创建", "ok");
      await refreshCollections();
    } catch (e) {
      $("col-create-msg").textContent = "创建失败：" + e.message;
      toast("创建失败：" + e.message, "err");
    }
  });
}
function collectionTaskSkeleton(count = 3) {
  return Array.from({ length: count }, () => `<div class="collection-task-skeleton" aria-hidden="true">
    <span class="sk" style="height:28px"></span><span class="sk" style="height:42px"></span>
    <span class="sk" style="height:42px"></span><span class="sk" style="height:52px"></span>
  </div>`).join("");
}
function collectionTaskEmpty() {
  return `<div class="empty collection-task-empty"><div class="empty-ic">${ic("i-hash")}</div>
    <div class="empty-t">还没有关键词采集任务</div><div class="empty-sub">在上方批量输入关键词并开始采集</div></div>`;
}
function renderCollectionJobs() {
  const body = $("collection-job-table"); if (!body) return;
  body.innerHTML = COLLECTION_JOBS.map(job => {
    const status = collectionStatus(job.status);
    const planned = Math.max(1, Number(job.planned_content_count || 0));
    const percent = Math.min(100, Math.round(Number(job.content_count || 0) * 100 / planned));
    const keywords = (job.keywords || []).slice(0, 5).map(k => `<span class="meta-chip">${esc(k)}</span>`).join("") +
      ((job.keywords || []).length > 5 ? `<span class="meta-chip more">+${job.keywords.length - 5}</span>` : "");
    const canCancel = ["pending", "running"].includes(job.status);
    const canRetry = ["done", "partial", "failed", "canceled"].includes(job.status);
    const canEdit = canRetry && job.platform === "douyin";
    const errorText = collectionLastError(job);
    const sortLabel = { general: "综合", latest: "最新", most_liked: "最多点赞" }[job.search_sort] || "综合";
    const timeLabel = { all: "不限时间", day: "一天内", week: "一周内", half_year: "半年内" }[job.publish_time] || "不限时间";
    const typeLabel = { all: "全部类型", video: "视频", images: "图文" }[job.content_type] || "全部类型";
    const threshold = [Number(job.min_likes) > 0 ? `≥${fmtNum(job.min_likes)} 赞` : "", Number(job.min_comments) > 0 ? `≥${fmtNum(job.min_comments)} 评` : ""].filter(Boolean).join(" · ");
    return `<article class="collection-task" role="listitem" aria-label="任务 ${job.id}，${status.label}">
      <div class="collection-task-meta"><div><span class="collection-task-label">任务状态</span><span class="pill ${status.cls}">${status.label}</span></div><time class="collection-task-created" datetime="${esc(job.created_at || "")}">${collectionDate(job.created_at)}</time></div>
      <div class="collection-task-keywords"><span class="collection-task-label">关键词</span><div class="keyword-stack">${keywords}</div>${job.current_keyword ? `<div class="collection-step">当前：${esc(job.current_keyword)}</div>` : ""}</div>
      <div class="collection-task-config"><span class="collection-task-label">采集配置</span><div class="collection-task-config-main">${job.max_contents_per_keyword} 作品/词 · ${job.max_pages_per_keyword || 12} 深度页 · ${sortLabel}</div><div class="collection-task-config-sub">${timeLabel} · ${typeLabel}${threshold ? ` · ${threshold}` : ""} · ${job.max_comments_per_content} 评论/作品<br>${job.include_replies ? "含二级评论 · " : ""}${job.download_media ? "下载媒体" : "仅采数据"} · 连续 ${job.stagnant_pages || 3} 页无新增停止</div></div>
      <div class="collection-task-progress"><span class="collection-task-label">执行进度</span><div class="job-progress"><div class="job-progress-head"><span>${esc(job.current_step || "等待执行")}</span><b>${job.content_count}/${job.planned_content_count}</b></div><div class="progress-track" role="progressbar" aria-label="任务 ${job.id} 进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-fill" style="width:${percent}%"></div></div><div class="collection-step">已采评论 ${fmtNum(job.comment_count)}</div></div></div>
      ${job.error_count ? `<button type="button" class="collection-task-error" onclick="openCollectionResults(${job.id})" title="${esc(errorText)}">${ic("i-info")}<span class="collection-task-error-text">${job.error_count} 条异常 · ${esc(errorText)}</span><span class="collection-task-error-link">查看详情</span></button>` : ""}
      <div class="collection-task-actions" aria-label="任务 ${job.id} 操作">
        <button type="button" class="sm collection-task-primary" onclick="openCollectionResults(${job.id})">${ic("i-eye")}查看结果</button>
        ${canEdit ? `<button type="button" class="ghost sm" onclick="editCollection(${job.id})">${ic("i-settings")}编辑</button>` : ""}
        <button type="button" class="ghost sm" onclick="exportCollection(${job.id})"${job.content_count ? "" : " disabled"}>${ic("i-download")}导出</button>
        ${canCancel ? `<button type="button" class="ghost sm" onclick="cancelCollection(${job.id})">${ic("i-x")}取消任务</button>` : ""}
        ${canRetry ? `<button type="button" class="ghost sm" onclick="retryCollection(${job.id})">${ic("i-play")}续跑</button>` : ""}
        ${job.status !== "running" ? `<button type="button" class="ghost sm danger collection-task-delete" onclick="deleteCollection(${job.id})" aria-label="删除任务 ${job.id}">${ic("i-trash")}删除</button>` : ""}
      </div>
    </article>`;
  }).join("") || collectionTaskEmpty();
}
async function refreshCollections() {
  if (!$("collection-job-table") || PLATFORM !== "douyin") return;
  try {
    COLLECTION_JOBS = await api("/api/collections?platform=douyin");
    const active = COLLECTION_JOBS.filter(j => ["pending", "running"].includes(j.status)).length;
    if ($("tb-col")) $("tb-col").textContent = active || COLLECTION_JOBS.length;
    renderCollectionJobs();
    if (COLLECTION_JOB_ID) {
      const job = COLLECTION_JOBS.find(j => j.id === COLLECTION_JOB_ID);
      if (job) {
        updateCollectionResultStats(job);
        if (CURRENT_TAB === "collections") await loadCollectionContents(COLLECTION_PAGE, true);
      }
      else closeCollectionResults();
    }
  } catch (e) {
    if (CURRENT_TAB === "collections") toast("采集任务刷新失败：" + e.message, "err");
  }
}
async function editCollection(jobId, draft = null) {
  const job = COLLECTION_JOBS.find(item => item.id === Number(jobId));
  if (!job) return;
  const accounts = ACCOUNTS.filter(a => a.platform === "douyin" && a.status !== "invalid" && a.has_storage);
  const initial = draft || {
    account_id: job.account_id,
    keywords: (job.keywords || []).join("\n"),
    max_contents_per_keyword: job.max_contents_per_keyword,
    max_pages_per_keyword: job.max_pages_per_keyword || 12,
    stagnant_pages: job.stagnant_pages || 3,
    search_sort: job.search_sort || "general",
    publish_time: job.publish_time || "all",
    content_type: job.content_type || "all",
    min_likes: Number(job.min_likes || 0),
    min_comments: Number(job.min_comments || 0),
    max_comments_per_content: job.max_comments_per_content,
    include_replies: !!job.include_replies,
    download_media: !!job.download_media,
    video_quality: job.video_quality || "highest",
    download_dir: job.download_dir || "",
  };
  const value = await new Promise(resolve => {
    _uiResolve = resolve; _uiCancelVal = null;
    $("ui-body").innerHTML = `
      <div class="form-field"><label for="ecol-keywords">关键词 <span class="field-scope">最多 20 个</span></label>
        <textarea id="ecol-keywords" rows="5" placeholder="每行一个关键词">${esc(initial.keywords)}</textarea></div>
      <div class="form-grid">
        <div class="form-field"><label for="ecol-account">使用账号</label><select id="ecol-account">${accOptions(accounts, accounts.length ? "请选择抖音账号" : "暂无可用抖音账号")}</select></div>
        <div class="form-field"><label for="ecol-quality">视频画质</label><select id="ecol-quality"><option value="highest">原画 / 最高</option><option value="1080">1080P</option><option value="720">720P</option><option value="540">540P</option><option value="lowest">最低省流</option></select></div>
        <div class="form-field"><label for="ecol-content-limit">每词作品上限</label><input id="ecol-content-limit" type="number" min="1" max="100" value="${Number(initial.max_contents_per_keyword) || 20}"></div>
        <div class="form-field"><label for="ecol-comment-limit">每作品评论上限</label><input id="ecol-comment-limit" type="number" min="0" max="200" value="${Number(initial.max_comments_per_content) || 0}"></div>
      </div>
      <div class="form-grid collection-filter-grid">
        <div class="form-field"><label for="ecol-page-limit">每词采集深度</label><input id="ecol-page-limit" type="number" min="1" max="40" value="${Number(initial.max_pages_per_keyword) || 12}"></div>
        <div class="form-field"><label for="ecol-sort">搜索排序</label><select id="ecol-sort"><option value="general">综合排序</option><option value="latest">最新发布</option><option value="most_liked">最多点赞</option></select></div>
        <div class="form-field"><label for="ecol-publish-time">发布时间</label><select id="ecol-publish-time"><option value="all">不限</option><option value="day">一天内</option><option value="week">一周内</option><option value="half_year">半年内</option></select></div>
        <div class="form-field"><label for="ecol-content-type">内容类型</label><select id="ecol-content-type"><option value="all">全部作品</option><option value="video">视频</option><option value="images">图文 / 图集</option></select></div>
        <div class="form-field"><label for="ecol-min-likes">最低点赞数</label><input id="ecol-min-likes" type="number" min="0" value="${Number(initial.min_likes) || 0}"></div>
        <div class="form-field"><label for="ecol-min-comments">最低评论数</label><input id="ecol-min-comments" type="number" min="0" value="${Number(initial.min_comments) || 0}"></div>
        <div class="form-field"><label for="ecol-stagnant-pages">连续无新增停止</label><input id="ecol-stagnant-pages" type="number" min="1" max="8" value="${Number(initial.stagnant_pages) || 3}"></div>
      </div>
      <div class="option-grid" aria-label="采集选项">
        <label class="switch-row"><input type="checkbox" id="ecol-download"${initial.download_media ? " checked" : ""} onchange="$('ecol-dir-wrap').style.display=this.checked?'':'none'"><span class="switch-copy"><b>下载媒体</b><span>保存视频和封面来源</span></span></label>
        <label class="switch-row"><input type="checkbox" id="ecol-replies"${initial.include_replies ? " checked" : ""}><span class="switch-copy"><b>包含二级评论</b><span>采集抖音当前可返回的回复</span></span></label>
      </div>
      <div class="form-field" id="ecol-dir-wrap" style="display:${initial.download_media ? "" : "none"}"><label for="ecol-download-dir">下载目录（可选）</label><input id="ecol-download-dir" value="${esc(initial.download_dir)}" placeholder="留空使用默认目录"></div>`;
    $("ecol-account").value = String(initial.account_id || "");
    $("ecol-quality").value = initial.video_quality || "highest";
    $("ecol-sort").value = initial.search_sort || "general";
    $("ecol-publish-time").value = initial.publish_time || "all";
    $("ecol-content-type").value = initial.content_type || "all";
    enhanceAllSelects($("ui-body")); csSyncAll();
    _uiGetVal = () => ({
      account_id: Number($("ecol-account").value || 0),
      keywords: $("ecol-keywords").value,
      max_contents_per_keyword: Number($("ecol-content-limit").value || 0),
      max_pages_per_keyword: Number($("ecol-page-limit").value || 0),
      stagnant_pages: Number($("ecol-stagnant-pages").value || 0),
      search_sort: $("ecol-sort").value || "general",
      publish_time: $("ecol-publish-time").value || "all",
      content_type: $("ecol-content-type").value || "all",
      min_likes: Number($("ecol-min-likes").value || 0),
      min_comments: Number($("ecol-min-comments").value || 0),
      max_comments_per_content: Number($("ecol-comment-limit").value || 0),
      include_replies: $("ecol-replies").checked,
      download_media: $("ecol-download").checked,
      video_quality: $("ecol-quality").value || "highest",
      download_dir: $("ecol-download-dir").value.trim(),
    });
    _uiOpen(`编辑采集任务 #${job.id}`, "保存配置不会删除已有作品和评论；修改后点击“续跑”应用新配置，系统会自动去重。", { okText: "保存配置", wide: true });
  });
  if (value === null) return;
  const keywords = parseCollectionKeywords(value.keywords);
  let error = "";
  if (!keywords.length) error = "请至少填写一个关键词";
  else if (keywords.length > 20) error = "单个任务最多 20 个关键词";
  else if (!value.account_id) error = "请选择一个可用抖音账号";
  else if (value.max_contents_per_keyword < 1 || value.max_contents_per_keyword > 100) error = "每词作品上限须为 1–100";
  else if (value.max_pages_per_keyword < 1 || value.max_pages_per_keyword > 40) error = "每词采集深度须为 1–40 页";
  else if (value.stagnant_pages < 1 || value.stagnant_pages > 8) error = "连续无新增停止阈值须为 1–8 页";
  else if (value.min_likes < 0 || value.min_comments < 0) error = "点赞和评论门槛须为非负整数";
  else if (value.max_comments_per_content < 0 || value.max_comments_per_content > 200) error = "每作品评论上限须为 0–200";
  if (error) { toast(error, "err"); return editCollection(jobId, value); }
  try {
    await api(`/api/collections/${job.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...value, platform: "douyin", keywords }),
    });
    toast("任务配置已保存，点击“续跑”后生效", "ok");
    await refreshCollections();
  } catch (e) { toast("编辑失败：" + e.message, "err"); }
}
function updateCollectionResultStats(job) {
  if (!job) return;
  $("col-stat-content").textContent = fmtNum(job.content_count);
  $("col-stat-comments").textContent = fmtNum(job.comment_count);
  $("col-stat-errors").textContent = fmtNum(job.error_count);
  const errorBox = $("collection-results-error");
  const errorText = collectionLastError(job);
  errorBox.style.display = errorText ? "" : "none";
  errorBox.textContent = errorText ? `最近异常：${errorText}` : "";
  $("collection-results-title").childNodes[0].nodeValue = `任务 #${job.id} 采集结果 `;
  $("collection-results-sub").textContent = `${(job.keywords || []).join("、")} · ${collectionStatus(job.status).label}`;
}
async function openCollectionResults(jobId) {
  const btn = evtBtn();
  COLLECTION_JOB_ID = Number(jobId); COLLECTION_PAGE = 1;
  const job = COLLECTION_JOBS.find(j => j.id === COLLECTION_JOB_ID);
  if (job) updateCollectionResultStats(job);
  $("collection-results-card").style.display = "";
  await withBusy(btn, "加载中", async () => {
    await loadCollectionContents(1);
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("collection-results-card").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
}
function closeCollectionResults() {
  COLLECTION_JOB_ID = 0; COLLECTION_PAGE = 1;
  if ($("collection-results-card")) $("collection-results-card").style.display = "none";
}
function collectionResultSkeleton(count = 4) {
  return Array.from({ length: count }, () => `<div class="collection-result-skeleton" aria-hidden="true">
    <span class="sk" style="height:120px"></span><span class="sk" style="width:72%;margin-top:14px"></span>
    <span class="sk" style="width:92%;margin-top:10px"></span><span class="sk" style="height:42px;margin-top:18px"></span>
  </div>`).join("");
}
function collectionEmpty(title, detail = "") {
  return `<div class="empty collection-result-empty"><div class="empty-ic">${ic("i-film")}</div>
    <div class="empty-t">${esc(title)}</div>${detail ? `<div class="empty-sub">${esc(detail)}</div>` : ""}</div>`;
}
function collectionFileDisplay(item) {
  const path = String(item.local_path || "").trim();
  const pathMeta = contentPathMeta(item);
  const count = Number(item.media_count || 0);
  const name = count > 1 ? `${count} 个媒体文件` : (pathMeta ? pathMeta.name + (pathMeta.ext ? `.${pathMeta.ext}` : "") : "本地媒体");
  const bits = [item.file_size ? fmtShareSize(item.file_size) : "", pathMeta && pathMeta.dir ? pathMeta.dir : ""].filter(Boolean);
  return { path, name, meta: bits.join(" · ") || "本地文件可用" };
}
function collectionResultCard(item) {
  const title = item.desc || item.aweme_id || "未命名作品";
  const isGallery = item.media_type === "images";
  const typeLabel = isGallery ? `图集${item.media_count > 1 ? ` · ${item.media_count} 张` : ""}` : "视频";
  const canPreview = Boolean(item.preview_available);
  const file = collectionFileDisplay(item);
  const fileExists = Boolean(item.local_exists);
  const downloadClass = fileExists ? "done" : item.download_status === "failed" ? "failed" : "skipped";
  const downloadLabel = fileExists ? "已下载" : item.download_status === "failed" ? "下载失败" : item.download_status === "done" ? "文件缺失" : "未下载";
  const byline = [item.author_name || "未知作者", item.create_time ? fmtTime(item.create_time) : "", item.aweme_id || ""].filter(Boolean);
  const cover = item.cover_url
    ? `<img src="${esc(item.cover_url)}" alt="${esc(title.slice(0, 60))}封面" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="collection-cover-empty">${ic(isGallery ? "i-image" : "i-film")}</span>`;
  const filePanel = fileExists ? `<div class="collection-file-panel" title="${esc(file.path)}">
    <div class="collection-file-main">${ic("i-folder")}<div class="collection-file-info">
      <div class="collection-file-name">${esc(file.name)}</div><div class="collection-file-meta">${esc(file.meta)}</div>
    </div></div>
    <div class="collection-file-actions">
      <button type="button" class="ghost collection-icon-action" onclick="openCollectionFile(${item.job_id},${item.id},this)" data-tip="用本机默认程序打开" aria-label="用本机默认程序打开">${ic("i-external")}</button>
      <button type="button" class="ghost collection-icon-action" onclick="revealCollectionFile(${item.job_id},${item.id},this)" data-tip="在文件夹中显示" aria-label="在文件夹中显示">${ic("i-folder")}</button>
      <button type="button" class="ghost collection-icon-action" data-path="${esc(file.path)}" onclick="copyCollectionPath(this)" data-tip="复制本地路径" aria-label="复制本地路径">${ic("i-copy")}</button>
    </div>
  </div>` : `<div class="collection-download-note${item.download_status === "failed" ? " failed" : ""}">${item.error ? esc(item.error) : "本地文件尚不可用，可先预览平台媒体或打开原作品"}</div>`;
  return `<article class="collection-result-item">
    <button type="button" class="collection-result-cover" onclick="openCollectionPreview(${item.job_id},${item.id})" aria-label="预览：${esc(title.slice(0, 80))}"${canPreview ? "" : " disabled"}>
      ${cover}<span class="collection-cover-type">${esc(typeLabel)}</span>
      <span class="collection-cover-preview">${ic("i-play")}${canPreview ? "站内预览" : "暂无预览"}</span>
    </button>
    <div class="collection-result-body">
      <div class="collection-result-tags"><span class="meta-chip group">#${esc(item.keyword)}</span><span class="pill ${downloadClass}" title="${esc(item.error || "")}">${downloadLabel}</span></div>
      <a class="collection-result-title" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">${esc(title)}</a>
      <div class="collection-result-byline">${byline.map((part, index) => `<span${index === byline.length - 1 ? ' class="collection-result-id"' : ""}>${esc(part)}</span>`).join("<span>·</span>")}</div>
      <div class="collection-result-metrics" aria-label="作品数据">
        <div class="collection-result-metric"><b>${ic("i-heart")}${fmtNum(item.like_count)}</b><span>点赞</span></div>
        <div class="collection-result-metric"><b>${ic("i-msg")}${fmtNum(item.comment_count)}</b><span>平台评论</span></div>
        <div class="collection-result-metric"><b>${ic("i-inbox")}${fmtNum(item.collected_comment_count)}</b><span>已采评论</span></div>
      </div>
      ${filePanel}
      <div class="collection-result-actions">
        <button type="button" class="sm collection-preview-primary" onclick="openCollectionPreview(${item.job_id},${item.id})"${canPreview ? "" : " disabled"}>${ic("i-eye")}预览</button>
        ${fileExists ? `<button type="button" class="ghost sm" onclick="openCollectionFile(${item.job_id},${item.id},this)">${ic("i-external")}打开文件</button>` : ""}
        <button type="button" class="ghost sm" onclick="showCollectionComments(${item.id})"${item.collected_comment_count ? "" : " disabled"}>${ic("i-msg")}评论 ${item.collected_comment_count}</button>
        <a class="collection-source-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${ic("i-external")}原作品</a>
      </div>
    </div>
  </article>`;
}
function openCollectionPreview(jobId, contentId, startIdx = 0) {
  return _pvOpen(() => api(`/api/collections/${jobId}/contents/${contentId}/media`), startIdx);
}
async function collectionLocalAction(jobId, contentId, action, button) {
  const old = button && button.innerHTML;
  if (button) { button.disabled = true; button.innerHTML = `<span class="spin"></span>`; }
  try {
    await api(`/api/collections/${jobId}/contents/${contentId}/${action}`, {
      method: "POST", headers: { "X-CreatorHub-Local-Action": action },
    });
    toast(action === "open" ? "已调用本机默认程序打开文件" : "已在文件夹中显示", "ok", 1800);
  } catch (e) {
    toast((action === "open" ? "打开文件失败：" : "打开文件夹失败：") + e.message, "err");
  } finally {
    if (button && button.isConnected) { button.disabled = false; button.innerHTML = old; }
  }
}
function openCollectionFile(jobId, contentId, button) { return collectionLocalAction(jobId, contentId, "open", button); }
function revealCollectionFile(jobId, contentId, button) { return collectionLocalAction(jobId, contentId, "reveal", button); }
async function copyCollectionPath(button) {
  const value = String(button && button.dataset.path || "");
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast("本地路径已复制", "ok", 1800);
  } catch (e) {
    const field = document.createElement("textarea");
    field.value = value; field.style.position = "fixed"; field.style.opacity = "0";
    document.body.appendChild(field); field.select();
    const copied = document.execCommand("copy"); field.remove();
    toast(copied ? "本地路径已复制" : "复制失败，请手动复制路径", copied ? "ok" : "err");
  }
}
async function loadCollectionContents(page = COLLECTION_PAGE, quiet = false) {
  if (!COLLECTION_JOB_ID) return;
  COLLECTION_PAGE = Math.max(1, Number(page) || 1);
  const body = $("collection-content-list");
  if (!quiet) body.innerHTML = collectionResultSkeleton(4);
  try {
    const result = await api(`/api/collections/${COLLECTION_JOB_ID}/contents?page=${COLLECTION_PAGE}&page_size=20`);
    COLLECTION_PAGE = result.page;
    body.innerHTML = (result.items || []).map(collectionResultCard).join("") || collectionEmpty("任务暂时没有作品结果", "采集中可稍后刷新；失败任务可查看错误并续跑");
    $("collection-result-count").textContent = `共 ${fmtNum(result.total)} 个作品`;
    const pager = $("collection-pager");
    pager.innerHTML = `<button class="ghost sm" onclick="loadCollectionContents(${result.page - 1})"${result.page <= 1 ? " disabled" : ""}>${ic("i-prev")}上一页</button><span class="mut">第 ${result.page} / ${result.pages} 页 · 共 ${fmtNum(result.total)} 条</span><button class="ghost sm" onclick="loadCollectionContents(${result.page + 1})"${result.page >= result.pages ? " disabled" : ""}>下一页${ic("i-next")}</button>`;
    pager.hidden = result.pages <= 1;
  } catch (e) {
    body.innerHTML = collectionEmpty("结果加载失败", e.message);
    $("collection-result-count").textContent = "";
  }
}
async function showCollectionComments(contentId) {
  const modal = $("collection-comments-modal");
  const list = $("collection-comments-list");
  list.innerHTML = `<div class="empty"><div class="empty-t">加载中…</div></div>`;
  modal.style.display = "flex"; modalOpened(modal);
  setTimeout(() => modal.querySelector(".pv-close").focus(), 0);
  try {
    const comments = await api(`/api/collections/${COLLECTION_JOB_ID}/comments?content_id=${contentId}&limit=500`);
    $("collection-comments-count").textContent = `共 ${comments.length} 条本次采集评论`;
    list.innerHTML = comments.map(comment => `<article class="collection-comment"><div class="collection-comment-head"><b>${esc(comment.user_nickname || "匿名用户")}</b><span>${fmtTime(comment.create_time)} · ${fmtNum(comment.like_count)} 赞${comment.reply_to ? " · 回复" : ""}</span></div><p>${esc(comment.text || "（空评论）")}</p></article>`).join("") || `<div class="empty"><div class="empty-t">没有已采评论</div></div>`;
  } catch (e) {
    list.innerHTML = `<div class="empty"><div class="empty-t">加载失败</div><div class="empty-sub">${esc(e.message)}</div></div>`;
  }
}
function hideCollectionComments() {
  const modal = $("collection-comments-modal");
  modal.style.display = "none"; modalClosed(modal);
}
async function cancelCollection(jobId) {
  const btn = evtBtn();
  if (!await uiConfirm({ title: "取消采集任务", message: "任务会在当前请求完成后安全停止，已经保存的结果会保留。", okText: "取消任务", danger: true })) return;
  await withBusy(btn, "取消中", async () => {
    try { await api(`/api/collections/${jobId}/cancel`, { method: "POST" }); toast("已请求停止任务", "ok"); await refreshCollections(); }
    catch (e) { toast("取消失败：" + e.message, "err"); }
  });
}
async function retryCollection(jobId) {
  const btn = evtBtn();
  await withBusy(btn, "提交中", async () => {
    try { await api(`/api/collections/${jobId}/retry`, { method: "POST" }); toast("任务已重新进入队列，已有结果会自动去重", "ok"); await refreshCollections(); }
    catch (e) { toast("续跑失败：" + e.message, "err"); }
  });
}
async function deleteCollection(jobId) {
  const btn = evtBtn();
  if (!await uiConfirm({ title: "删除采集任务", message: "将删除任务及其作品、评论记录；本地已下载文件不会被删除。", okText: "删除", danger: true })) return;
  await withBusy(btn, "删除中", async () => {
    try { await api(`/api/collections/${jobId}`, { method: "DELETE" }); if (COLLECTION_JOB_ID === jobId) closeCollectionResults(); toast("任务记录已删除，本地文件已保留", "ok"); await refreshCollections(); }
    catch (e) { toast("删除失败：" + e.message, "err"); }
  });
}
function exportCollection(jobId) {
  const link = document.createElement("a");
  link.href = `/api/collections/${jobId}/export.xlsx`;
  link.download = `keyword-collection-${jobId}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove();
}

async function addMonitor() {
  const url_or_secuid = $("t-url").value.trim();
  const target_kind = (PLATFORM === "xhs" && $("t-kind")) ? $("t-kind").value : "creator";
  if (!url_or_secuid) { toast(target_kind === "keyword" ? "请输入搜索关键词" : "请输入主页链接 / 短链 / id", "err"); return; }
  if ((PLATFORM === "xhs" || PLATFORM === "douyin") && !$("t-acc").value) {
    const platformName = PLATFORM === "xhs" ? "小红书" : "抖音";
    if (!ACCOUNTS.length) { toast(`请先在「账号」里完成${platformName}扫码登录`, "err"); switchTab("accounts"); return; }
    toast(`${platformName}监控必须选择一个已登录账号`, "err"); return;
  }
  const btn = evtBtn();
  const downloadMode = $("t-download").value;
  $("add-msg").textContent = "解析中…";
  await withBusy(btn, "解析中", async () => {
    try {
      await api("/api/monitors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_or_secuid, platform: PLATFORM, target_kind,
          account_id: $("t-acc").value ? +$("t-acc").value : null,
          interval_seconds: +$("t-interval").value,
          initial_backfill_count: PLATFORM === "douyin" ? +$("t-backfill").value : 0,
          download_dir: $("t-dir").value.trim(),
          video_quality: PLATFORM === "xhs" ? "" : $("t-quality").value,
          download_enabled: downloadMode !== "none",
          media_filter: downloadMode === "none" ? "all" : downloadMode,
          alias: $("t-alias").value.trim(), group_name: getMetaValue("t-group").trim(),
          tags: parseTags(getMetaValue("t-tags")),
        }),
      });
      ["t-url", "t-dir", "t-alias"].forEach(id => $(id).value = "");
      setMetaValue("t-group", ""); setMetaValue("t-tags", "");
      $("add-msg").textContent = "已添加 ✓";
      toast("已开始监控", "ok");
    } catch (e) { $("add-msg").textContent = "失败: " + e.message; toast("添加失败:" + e.message, "err"); }
  });
  refreshMonitors();
}
function numericSelectOptions(current, choices, unit = "") {
  const values = choices.map(([value]) => String(value));
  const rows = values.includes(String(current)) || current == null
    ? choices : [[current, `${current}${unit}（当前）`], ...choices];
  return rows.map(([value, label]) =>
    `<option value="${value}">${esc(label)}</option>`).join("");
}
async function editMonitor(id) {
  const item = monitorById(id); if (!item) return;
  const accounts = ACCOUNTS.filter(a => a.platform === item.platform && a.status !== "invalid");
  const accountOptions = [
    `<option value="">${item.account_id ? "保持当前绑定" : "不指定账号"}</option>`,
    ...accounts.map(a => `<option value="${a.id}">${esc(a.nickname)}${a.has_creator ? " · 创作号" : ""}</option>`),
  ].join("");
  const intervalOptions = numericSelectOptions(item.interval_seconds || 300, [
    [60, "每 1 分钟"], [300, "每 5 分钟"], [600, "每 10 分钟"],
    [1800, "每 30 分钟"], [3600, "每小时"], [21600, "每 6 小时"], [86400, "每天"],
  ], " 秒");
  const backfillOptions = numericSelectOptions(item.initial_backfill_count ?? 0, [
    [0, "不回填历史"], [5, "最近 5 条"], [20, "最近 20 条"], [-1, "尽可能全量"],
  ], " 条");
  const value = await new Promise(res => {
    _uiResolve = res; _uiCancelVal = null;
    _uiGetVal = () => {
      const downloadMode = $("em-download").value;
      const result = {
        alias: $("em-alias").value.trim(),
        group_name: getMetaValue("em-group").trim(),
        tags: parseTags(getMetaValue("em-tags")),
        interval_seconds: +$("em-interval").value,
        account_id: $("em-account").value ? +$("em-account").value : null,
        download_dir: $("em-dir").value.trim(),
        video_quality: $("em-quality") ? $("em-quality").value : "",
        download_enabled: downloadMode !== "none",
        media_filter: downloadMode === "none" ? "all" : downloadMode,
      };
      if ($("em-backfill")) result.initial_backfill_count = +$("em-backfill").value;
      return result;
    };
    $("ui-body").innerHTML = `
      <fieldset class="monitor-config-group">
        <legend>标识与归类</legend>
        <div><label class="field" for="em-alias">管理别名</label>
          <input id="em-alias" maxlength="60" value="${esc(item.alias || "")}" placeholder="便于快速识别"></div>
        <div class="row">
          <div><label class="field" for="em-group">分组</label><input id="em-group" data-meta-combo="group"></div>
          <div><label class="field" for="em-tags">标签</label><input id="em-tags" data-meta-combo="tags"></div>
        </div>
      </fieldset>
      <fieldset class="monitor-config-group">
        <legend>抓取策略</legend>
        <div class="row">
          <div><label class="field" for="em-interval">抓取频率</label>
            <select id="em-interval">${intervalOptions}</select></div>
          <div><label class="field" for="em-account">抓取账号</label><select id="em-account">${accountOptions}</select></div>
        </div>
        ${item.last_scan_at ? "" : `<div><label class="field" for="em-backfill">首次历史回填</label>
          <select id="em-backfill">${backfillOptions}</select></div>`}
      </fieldset>
      <fieldset class="monitor-config-group">
        <legend>记录与下载</legend>
        <div class="row">
          <div><label class="field" for="em-download">自动下载范围</label>
            <select id="em-download"><option value="all">全部作品</option><option value="video">仅视频</option><option value="images">仅图集</option><option value="none">仅记录，不下载</option></select></div>
          ${item.platform === "xhs" ? "" : `<div><label class="field" for="em-quality">视频画质</label>
            <select id="em-quality"><option value="">跟随全局默认</option><option value="highest">原画/最高</option><option value="1080">1080P</option><option value="720">720P</option><option value="540">540P</option><option value="lowest">最低省流</option></select></div>`}
        </div>
        <div><label class="field" for="em-dir">下载目录</label>
          <input id="em-dir" value="${esc(item.download_dir || "")}" placeholder="留空跟随全局默认"></div>
      </fieldset>`;
    enhanceMetaControl($("em-group"), "group"); enhanceMetaControl($("em-tags"), "tags");
    setMetaValue("em-group", item.group_name || ""); setMetaValue("em-tags", itemTags(item).join(","));
    $("em-interval").value = String(item.interval_seconds || 300);
    $("em-account").value = item.account_id ? String(item.account_id) : "";
    if ($("em-backfill")) $("em-backfill").value = String(item.initial_backfill_count ?? 0);
    if ($("em-quality")) $("em-quality").value = item.video_quality || "";
    $("em-download").value = item.download_enabled === false ? "none" : (item.media_filter || "all");
    ["em-interval", "em-account", "em-backfill", "em-quality", "em-download"]
      .forEach(key => { const el = $(key); if (el) enhanceSelect(el); });
    _uiOpen("编辑作品监控", "监控对象不可修改；需要更换主页、创作者或关键词时，请新建监控。", { okText: "保存修改", wide: true });
  });
  if (value === null) return;
  try {
    await api("/api/monitors/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    toast("作品监控配置已更新", "ok"); refreshMonitors(); refreshContents();
  } catch (e) { toast("更新失败:" + e.message, "err"); }
}
function monRow(t) {
  const label = t.target_kind === "keyword"
    ? `<span class="ic-text">${ic("i-hash")}${esc(t.keyword)}</span>` : esc(t.nickname || (t.sec_uid || "").slice(0, 12));
  const acc = ACCOUNTS.find(a => a.id === t.account_id);
  // 抖音/小红书都显示绑定账号:抖音未登录抓主页易拿到风控过的旧快照,绑号才稳定
  const accTag = acc
    ? `<div class="mut" style="font-size:11px;margin-top:2px">账号:${esc(acc.nickname)}</div>`
    : `<div class="ic-text" style="font-size:11px;margin-top:2px;color:var(--danger)">${ic("i-info")}未绑定账号</div>`;
  const downloadLabel = t.download_enabled === false ? "仅记录"
    : ({ all: "全部下载", video: "仅视频", images: "仅图集" }[t.media_filter] || "全部下载");
  return `<tr>
    <td><div class="user-cell">${t.avatar ? `<img class="avatar" src="${t.avatar}" alt="" referrerpolicy="no-referrer">` : ""}<div><span>${label}</span>${t.alias ? `<div class="alias-line">${esc(t.alias)}</div>` : ""}${accTag}</div></div></td>
    <td>${metaChips(t)}</td>
    <td class="num">${t.content_count}</td>
    <td class="num">${Math.round(t.interval_seconds / 60)} 分</td>
    <td class="wrap" style="max-width:230px">
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px"><span class="pill q bare">${downloadLabel}</span></div>
      ${t.platform === "xhs" ? "" : `<span class="pill q bare">${QMAP[t.video_quality] || "默认画质"}</span> `}
      <span class="mut" title="${esc(t.download_dir || "默认目录")}" style="display:inline-block;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">${esc(t.download_dir || "默认")}</span></td>
    <td class="mut">${t.last_scan_at ? new Date(t.last_scan_at + "Z").toLocaleString() : "—"}${t.last_error ? ` <span class="warn-ic" title="${esc(t.last_error)}">${ic("i-info")}</span>` : ""}</td>
    <td><span class="pill ${t.enabled ? "active" : "invalid"}">${t.enabled ? "监控中" : "已暂停"}</span></td>
    <td class="acttd">
      <button class="ghost sm" onclick="runNow(${t.id})">立即抓取</button>
      <button class="ghost sm" onclick="editMonitor(${t.id})">编辑</button>
      <button class="ghost sm" onclick="toggleMon(${t.id})">${t.enabled ? "暂停" : "启用"}</button>
      <button class="ghost sm danger" onclick="delMon(${t.id})">${ic("i-trash")}删除</button>
    </td></tr>`;
}
function renderMonitorRows() {
  const groupName = $("mon-group") ? $("mon-group").value : "";
  const tag = $("mon-tag") ? $("mon-tag").value : "";
  const query = (($("mon-search") && $("mon-search").value) || "").trim().toLocaleLowerCase();
  const rows = MONITORS.filter(t => {
    if (!matchesMeta(t, groupName, tag)) return false;
    if (!query) return true;
    return [monitorBaseName(t), t.alias, t.group_name, ...itemTags(t)]
      .join(" ").toLocaleLowerCase().includes(query);
  });
  if ($("mon-filter-count")) $("mon-filter-count").textContent = `显示 ${rows.length} / ${MONITORS.length}`;
  $("mon-table").innerHTML = rows.map(monRow).join("")
    || empty(8, "没有匹配的监控", "i-target", MONITORS.length ? "调整分组、标签或搜索条件" : "在上方添加一个作品监控");
}
async function refreshMonitors() {
  const ts = await api("/api/monitors?platform=" + PLATFORM);
  MONITORS = ts; populateMonitorFacets(); populateContentSrc();
  $("stat-mon").textContent = ts.filter(t => t.enabled).length;
  if ($("tb-mon")) $("tb-mon").textContent = ts.length;
  renderMonitorRows();
}
async function runNow(id) {
  const btn = evtBtn();
  toast("抓取中…正在开浏览器拉取新作品", "info", 7000);
  await withBusy(btn, "抓取中", async () => {
    try {
      const r = await api("/api/monitors/" + id + "/run-now", { method: "POST" });
      if (r.error) toast("抓取未成功:" + r.error, "err", 6000);
      else toast(`抓取完成,新增 ${r.new} 条`, "ok");
    } catch (e) { toast("抓取失败:" + e.message, "err"); }
  });
  refreshMonitors(); refreshContents();
}
async function toggleMon(id) { try { await api("/api/monitors/" + id + "/toggle", { method: "POST" }); refreshMonitors(); } catch (e) { toast("操作失败:" + e.message, "err"); } }
async function delMon(id) { if (await uiConfirm({ title: "删除监控", message: "删除该监控?", okText: "删除", danger: true })) { try { await api("/api/monitors/" + id, { method: "DELETE" }); toast("监控已删除", "ok"); refreshMonitors(); } catch (e) { toast("删除失败:" + e.message, "err"); } } }

