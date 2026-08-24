"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setRules, setTasks } from "@/store/slices/autocommentSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  MessageSquare,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  X,
  Edit,
  Send,
  Sparkles,
  List,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

const AC_MODE_T: Record<string, string> = {
  auto_reply: "自动回复",
  auto_comment: "自动评论",
};

const AC_KIND_T: Record<string, string> = {
  self: "自己近期作品",
  work: "指定作品",
  creator: "指定博主",
  keyword: "关键词",
};

const AC_TASK_ST: Record<string, string> = {
  draft: "草稿待审",
  pending: "排队中",
  doing: "发送中",
  uncertain: "结果待确认",
  done: "已发送",
  failed: "失败",
  canceled: "已取消",
};

export function AutoCommentTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const accounts = useAppSelector((state) => state.accounts.items);
  const { rules, tasks } = useAppSelector((state) => state.autocomment);
  const { t } = useTranslation();

  // Form State: Create Rule
  const [mode, setMode] = useState<"auto_reply" | "auto_comment">("auto_reply");
  const [targetKind, setTargetKind] = useState<string>("self");
  const [accountId, setAccountId] = useState<string>("");
  const [target, setTarget] = useState("");
  const [templates, setTemplates] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [requireReview, setRequireReview] = useState(false);
  const [replyFilter, setReplyFilter] = useState("");
  const [skipKeywords, setSkipKeywords] = useState("");
  const [dailyCap, setDailyCap] = useState(20);
  const [minGapSeconds, setMinGapSeconds] = useState(90);
  const [maxPerRun, setMaxPerRun] = useState(5);
  const [intervalSeconds, setIntervalSeconds] = useState("1800");

  // Task Filter
  const [taskStatusFilter, setTaskStatusFilter] = useState("");

  // Edit Rule Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Edit Task Text Modal State
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskContentInput, setTaskContentInput] = useState("");

  // Populate default account
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(String(accounts[0].id));
    }
  }, [accounts, accountId]);

  // Adjust targetKind options when mode changes
  useEffect(() => {
    if (mode === "auto_reply") {
      setTargetKind("self");
    } else {
      setTargetKind("creator");
    }
  }, [mode]);

  const loadRules = async () => {
    try {
      const data = await api<any[]>(`/api/comment-rules?platform=${currentPlatform}`);
      dispatch(setRules(data || []));
    } catch {}
  };

  const loadTasks = async () => {
    try {
      const qs = taskStatusFilter ? `&status=${taskStatusFilter}` : "";
      const data = await api<any[]>(`/api/comment-tasks?platform=${currentPlatform}${qs}`);
      dispatch(setTasks(data || []));
    } catch {}
  };

  useEffect(() => {
    loadRules();
    loadTasks();
  }, [currentPlatform, taskStatusFilter]);

  // Add Rule
  const handleAddRule = async () => {
    if (!accountId) {
      dispatch(addToast({ type: "err", message: "请选择使用账号" }));
      return;
    }
    const tList = templates
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tList.length === 0) {
      dispatch(addToast({ type: "err", message: "请至少写一条文案模板(AI 失败时回退用)" }));
      return;
    }

    dispatch(incrementBusy("正在创建评论规则..."));
    try {
      await api("/api/comment-rules", {
        method: "POST",
        body: JSON.stringify({
          platform: currentPlatform,
          mode,
          account_id: Number(accountId),
          target_kind: targetKind,
          target: target.trim(),
          templates: tList,
          use_ai: useAi,
          require_review: requireReview,
          reply_filter: replyFilter.trim(),
          skip_keywords: skipKeywords.trim(),
          daily_cap: Number(dailyCap) || 20,
          min_gap_seconds: Number(minGapSeconds) || 90,
          max_per_run: Number(maxPerRun) || 5,
          interval_seconds: Number(intervalSeconds) || 1800,
          enabled: false,
        }),
      });

      dispatch(addToast({ type: "ok", message: "规则已创建(默认关闭)，可在下方「试跑」预览" }));
      setTarget("");
      setTemplates("");
      loadRules();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "创建规则失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Toggle Rule Enabled
  const handleToggleRule = async (id: number, enabled: boolean) => {
    try {
      await api(`/api/comment-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
      dispatch(addToast({ type: "ok", message: enabled ? "已启用" : "已停用" }));
      loadRules();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "操作失败" }));
    }
  };

  // Run Rule Now (Test Run)
  const handleRunRule = async (id: number) => {
    dispatch(incrementBusy("正在试跑抓取目标并生成文案..."));
    try {
      const res = await api<{
        ok: boolean;
        created?: number;
        candidates?: number;
        manual_only?: boolean;
        review?: boolean;
        error?: string;
        note?: string;
      }>(`/api/comment-rules/${id}/run-now`, { method: "POST" });

      if (!res.ok) {
        dispatch(addToast({ type: "err", message: `未生成: ${res.error || ""}` }));
      } else if ((res.created ?? 0) > 0) {
        dispatch(
          addToast({
            type: "ok",
            message: `生成 ${res.created} 条${
              res.manual_only ? "人工草稿" : res.review ? "草稿(待人工审核)" : "任务"
            } (发现 ${res.candidates} 个目标)`,
          })
        );
      } else {
        dispatch(
          addToast({
            type: "info",
            message: `发现 ${res.candidates} 个目标，生成 0 条${res.note ? `: ${res.note}` : ""}`,
          })
        );
      }
      loadRules();
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "试跑失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Delete Rule
  const handleDeleteRule = async (id: number) => {
    if (!confirm("确定删除该规则及其未发送任务？")) return;
    try {
      await api(`/api/comment-rules/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: "规则已删除" }));
      loadRules();
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "删除失败" }));
    }
  };

  // Open Edit Rule Modal
  const openEditModal = (rule: any) => {
    setEditingRule({
      ...rule,
      templatesText: (rule.templates || []).join("\n"),
    });
    setEditModalOpen(true);
  };

  // Save Edit Rule
  const handleSaveEditedRule = async () => {
    if (!editingRule) return;
    const tList = (editingRule.templatesText || "")
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (tList.length === 0) {
      dispatch(addToast({ type: "err", message: "请至少写一条文案模板" }));
      return;
    }

    dispatch(incrementBusy("正在更新规则..."));
    try {
      await api(`/api/comment-rules/${editingRule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingRule.name,
          mode: editingRule.mode,
          target_kind: editingRule.target_kind,
          target: editingRule.target,
          account_id: Number(editingRule.account_id),
          templates: tList,
          use_ai: !!editingRule.use_ai,
          require_review: !!editingRule.require_review,
          reply_filter: editingRule.reply_filter,
          skip_keywords: editingRule.skip_keywords,
          daily_cap: Number(editingRule.daily_cap),
          min_gap_seconds: Number(editingRule.min_gap_seconds),
          max_per_run: Number(editingRule.max_per_run),
          interval_seconds: Number(editingRule.interval_seconds),
        }),
      });
      setEditModalOpen(false);
      dispatch(addToast({ type: "ok", message: "规则已更新 ✓" }));
      loadRules();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "更新失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Task Actions
  const handleApproveTask = async (id: number) => {
    try {
      await api(`/api/comment-tasks/${id}/approve`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: "已通过，转入待发队列" }));
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "操作失败" }));
    }
  };

  const handleApproveAllDrafts = async () => {
    const draftIds = tasks.filter((t) => t.status === "draft").map((t) => t.id);
    if (draftIds.length === 0) return;
    if (!confirm(`通过 ${draftIds.length} 条草稿？通过后引擎按节流陆续发出。`)) return;

    dispatch(incrementBusy("正在批量批准草稿..."));
    try {
      const res = await api<{ approved: number }>("/api/comment-tasks/batch-approve", {
        method: "POST",
        body: JSON.stringify({ ids: draftIds }),
      });
      dispatch(addToast({ type: "ok", message: `已通过 ${res.approved} 条草稿` }));
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "操作失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleRunTask = async (id: number) => {
    dispatch(incrementBusy("正在启动浏览器发送评论..."));
    try {
      const res = await api<{ ok: boolean; error?: string }>(`/api/comment-tasks/${id}/run-now`, {
        method: "POST",
      });
      if (res.ok) {
        dispatch(addToast({ type: "ok", message: "已发送 ✓" }));
      } else {
        dispatch(addToast({ type: "err", message: `未成功: ${res.error || ""}` }));
      }
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "发送失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleCancelTask = async (id: number) => {
    try {
      await api(`/api/comment-tasks/${id}/cancel`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: "已取消任务" }));
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "操作失败" }));
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await api(`/api/comment-tasks/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: "已删除" }));
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "删除失败" }));
    }
  };

  const openEditTaskModal = (task: any) => {
    setEditingTask(task);
    setTaskContentInput(task.content || "");
    setEditTaskOpen(true);
  };

  const handleSaveTaskContent = async () => {
    if (!editingTask || !taskContentInput.trim()) return;
    try {
      await api(`/api/comment-tasks/${editingTask.id}`, {
        method: "PUT",
        body: JSON.stringify({ content: taskContentInput.trim() }),
      });
      setEditTaskOpen(false);
      dispatch(addToast({ type: "ok", message: "评论文案已更新" }));
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "更新失败" }));
    }
  };

  const drafts = tasks.filter((t) => t.status === "draft");

  return (
    <div className="space-y-6">
      {/* 1. New Rule Form Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#1d2530]">
          <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
            <Plus className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">
            {t("autocomment.cardCreateTitle")}{" "}
            <span className="text-xs text-[#778094] font-normal">{t("autocomment.cardCreateSub")}</span>
          </h3>
        </div>

        <div className="space-y-3.5">
          {/* Row 1: Mode, Kind, Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.modeLabel")}</label>
              <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  <SelectItem value="auto_reply">{t("autocomment.modeAutoReply")}</SelectItem>
                  <SelectItem value="auto_comment">{t("autocomment.modeAutoComment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.targetKindLabel")}</label>
              <Select value={targetKind} onValueChange={setTargetKind}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  {mode === "auto_reply" ? (
                    <>
                      <SelectItem value="self">{t("autocomment.kindSelf")}</SelectItem>
                      <SelectItem value="work">{t("autocomment.kindWork")}</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="creator">{t("autocomment.kindCreator")}</SelectItem>
                      {currentPlatform === "xhs" && <SelectItem value="keyword">{t("autocomment.kindKeyword")}</SelectItem>}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.accountLabel")}</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue placeholder={t("autocomment.accountPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nickname} ({a.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Target Input (if not self) */}
          {targetKind !== "self" && (
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">
                {targetKind === "keyword"
                  ? t("autocomment.targetInputLabel.keyword")
                  : targetKind === "work"
                  ? t("autocomment.targetInputLabel.work")
                  : t("autocomment.targetInputLabel.creator")}
              </label>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={
                  targetKind === "keyword"
                    ? t("autocomment.targetInputPlaceholder.keyword")
                    : targetKind === "work"
                    ? t("autocomment.targetInputPlaceholder.work")
                    : t("autocomment.targetInputPlaceholder.creator")
                }
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
              />
            </div>
          )}

          {/* Row 3: Templates */}
          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">
              {t("autocomment.templateLabel")}
            </label>
            <Textarea
              value={templates}
              onChange={(e) => setTemplates(e.target.value)}
              placeholder={t("autocomment.templatePlaceholder")}
              rows={3}
              className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
          </div>

          {/* Row 4: Checkboxes */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-[#8b94a3] py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55] focus:ring-[#fe2c55]"
              />
              <span>{t("autocomment.useAiLabel")}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requireReview}
                onChange={(e) => setRequireReview(e.target.checked)}
                className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55] focus:ring-[#fe2c55]"
              />
              <span>{t("autocomment.reviewLabel")}</span>
            </label>
          </div>

          {/* Row 5: Filter Keywords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value)}
              placeholder={t("autocomment.kwFilterPlaceholder")}
              className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
            />
            <Input
              value={skipKeywords}
              onChange={(e) => setSkipKeywords(e.target.value)}
              placeholder={t("autocomment.skipKwPlaceholder")}
              className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
            />
          </div>

          {/* Row 6: Limits and Frequency */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#8b94a3] pt-1">
            <label className="flex items-center gap-1.5">
              <span>{t("autocomment.dailyCap")}</span>
              <Input
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                min={0}
                className="w-16 h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono text-center"
              />
            </label>

            <label className="flex items-center gap-1.5">
              <span>{t("autocomment.minGapSec")}</span>
              <Input
                type="number"
                value={minGapSeconds}
                onChange={(e) => setMinGapSeconds(Number(e.target.value))}
                min={1}
                className="w-20 h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono text-center"
              />
            </label>

            <label className="flex items-center gap-1.5">
              <span>{t("autocomment.batchMax")}</span>
              <Input
                type="number"
                value={maxPerRun}
                onChange={(e) => setMaxPerRun(Number(e.target.value))}
                min={1}
                className="w-16 h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono text-center"
              />
            </label>

            <Select value={intervalSeconds} onValueChange={setIntervalSeconds}>
              <SelectTrigger className="w-44 h-8 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="900">{t("autocomment.interval.m15")}</SelectItem>
                <SelectItem value="1800">{t("autocomment.interval.m30")}</SelectItem>
                <SelectItem value="3600">{t("autocomment.interval.h1")}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAddRule} className="gap-1.5 h-8 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-xs ml-auto">
              <Plus className="w-3.5 h-3.5" />
              <span>{t("autocomment.createRuleBtn")}</span>
            </Button>
          </div>

          {/* Warning Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-xs text-[#fbbf24]/90">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t("autocomment.tipNote")}</span>
          </div>
        </div>
      </div>

      {/* 2. Rules List Table Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1d2530]">
          <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
            <List className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("autocomment.rulesTitle")}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1d2530] text-[#778094]">
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.name")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.mode")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.target")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.account")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.capGap")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.lastRun")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.rulesCols.status")}</th>
                <th className="py-2.5 px-3 font-medium text-right">{t("autocomment.rulesCols.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d2530]">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#778094]">
                    {t("autocomment.emptyRules")}
                  </td>
                </tr>
              ) : (
                rules.map((r) => {
                  const targetStr =
                    r.mode === "auto_comment"
                      ? r.target_kind === "keyword"
                        ? `#${r.keyword}`
                        : (r.sec_uid || "").slice(0, 14)
                      : r.target_kind === "work"
                      ? r.aweme_id
                      : t("autocomment.kindSelf");

                  const accNick =
                    (accounts.find((a) => a.id === r.account_id) || {}).nickname || `#${r.account_id}`;

                  return (
                    <tr key={r.id} className="hover:bg-[#181d27]/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#f6f8fb]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.name || `规则 #${r.id}`}</span>
                          {r.use_ai && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#38bdf8]/15 text-[#38bdf8]">
                              {t("autocomment.tagAi")}
                            </span>
                          )}
                          {r.require_review && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#fbbf24]/15 text-[#fbbf24]">
                              {t("autocomment.tagReview")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#8b94a3]">
                        {r.mode === "auto_reply" ? t("autocomment.kindSelf") : t("autocomment.modeAutoComment")}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[#f6f8fb]">
                          {r.target_kind === "self"
                            ? t("autocomment.kindSelf")
                            : r.target_kind === "work"
                            ? t("autocomment.kindWork")
                            : r.target_kind === "creator"
                            ? t("autocomment.kindCreator")
                            : t("autocomment.kindKeyword")}
                        </div>
                        <div className="text-[11px] text-[#778094] truncate max-w-[140px] font-mono">
                          {targetStr}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#e7eaf0]">{accNick}</td>
                      <td className="py-3 px-3 text-[#8b94a3] font-mono">
                        {r.daily_cap}/d · {Math.round(r.interval_seconds / 60)}m
                      </td>
                      <td className="py-3 px-3 text-[#8b94a3]">
                        {r.last_run_at ? timeAgo(r.last_run_at) : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={r.enabled ? "success" : "secondary"}>
                          {r.enabled ? t("autocomment.ruleActive") : t("autocomment.rulePaused")}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRule(r.id, !r.enabled)}
                            className="h-7 text-xs"
                          >
                            {r.enabled ? t("autocomment.rulePaused") : t("autocomment.ruleActive")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(r)}
                            className="h-7 text-xs"
                          >
                            {t("autocomment.btnEdit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunRule(r.id)}
                            className="h-7 text-xs text-[#fe2c55]"
                          >
                            {t("autocomment.btnDryRun")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(r.id)}
                            className="h-7 w-7 text-[#778094] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Tasks & Queue List Table Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1d2530]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("autocomment.tasksTitle")}</h3>
          </div>

          <div className="w-44">
            <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
              <SelectTrigger className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("autocomment.tasksFilter")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="all">{t("autocomment.tasksFilter")}</SelectItem>
                <SelectItem value="draft">{t("autocomment.taskStatuses.draft")}</SelectItem>
                <SelectItem value="pending">{t("autocomment.taskStatuses.pending")}</SelectItem>
                <SelectItem value="uncertain">{t("autocomment.taskStatuses.uncertain")}</SelectItem>
                <SelectItem value="done">{t("autocomment.taskStatuses.done")}</SelectItem>
                <SelectItem value="failed">{t("autocomment.taskStatuses.failed")}</SelectItem>
                <SelectItem value="canceled">{t("autocomment.taskStatuses.canceled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Drafts Alert Bar */}
        {drafts.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-[10px] bg-[#38bdf8]/10 border-l-4 border-[#38bdf8] text-xs text-[#38bdf8]">
            <span>
              {t("autocomment.reviewBanner", { count: drafts.length })}
            </span>
            <Button
              size="sm"
              onClick={handleApproveAllDrafts}
              className="gap-1.5 h-7 text-xs bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-slate-950 font-semibold shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t("autocomment.approveAll")}</span>
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1d2530] text-[#778094]">
                <th className="py-2.5 px-3 font-medium">{t("autocomment.tasksCols.content")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.tasksCols.targetWork")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.tasksCols.targetUser")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.tasksCols.planTime")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.tasksCols.channel")}</th>
                <th className="py-2.5 px-3 font-medium">{t("autocomment.tasksCols.status")}</th>
                <th className="py-2.5 px-3 font-medium text-right">{t("autocomment.tasksCols.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d2530]">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#778094]">
                    {t("autocomment.emptyTasks")}
                  </td>
                </tr>
              ) : (
                tasks.map((tsk) => {
                  const isDraft = tsk.status === "draft";
                  const canSend = tsk.status === "pending" || tsk.status === "failed";

                  return (
                    <tr key={tsk.id} className="hover:bg-[#181d27]/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#f6f8fb] max-w-[240px]">
                        <div className="line-clamp-2">{tsk.content}</div>
                      </td>
                      <td className="py-3 px-3 text-[#778094] font-mono">
                        {(tsk.aweme_id || "").slice(0, 16) || "—"}
                      </td>
                      <td className="py-3 px-3 text-[#8b94a3]">
                        {tsk.target_comment_id ? `回复 @${tsk.target_nick || ""}` : "顶层评论"}
                      </td>
                      <td className="py-3 px-3 text-[#8b94a3] font-mono">
                        {tsk.scheduled_at ? timeAgo(tsk.scheduled_at) : "尽快"}
                      </td>
                      <td className="py-3 px-3 text-[#8b94a3]">
                        {tsk.method === "browser"
                          ? t("autocomment.methods.browser")
                          : tsk.method === "api"
                          ? t("autocomment.methods.api")
                          : tsk.method === "manual"
                          ? t("autocomment.methods.manual")
                          : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            tsk.status === "done"
                              ? "success"
                              : tsk.status === "failed"
                              ? "danger"
                              : tsk.status === "draft"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {tsk.status === "draft"
                            ? t("autocomment.taskStatuses.draft")
                            : tsk.status === "pending"
                            ? t("autocomment.taskStatuses.pending")
                            : tsk.status === "doing"
                            ? t("autocomment.taskStatuses.doing")
                            : tsk.status === "uncertain"
                            ? t("autocomment.taskStatuses.uncertain")
                            : tsk.status === "done"
                            ? t("autocomment.taskStatuses.done")
                            : tsk.status === "failed"
                            ? t("autocomment.taskStatuses.failed")
                            : tsk.status === "canceled"
                            ? t("autocomment.taskStatuses.canceled")
                            : tsk.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDraft && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveTask(tsk.id)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {t("autocomment.btnApprove")}
                            </Button>
                          )}
                          {(isDraft || canSend) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditTaskModal(tsk)}
                              className="h-7 text-xs"
                            >
                              {t("autocomment.btnEdit")}
                            </Button>
                          )}
                          {canSend && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunTask(tsk.id)}
                              className="h-7 text-xs text-[#fe2c55]"
                            >
                              {t("autocomment.btnSendNow")}
                            </Button>
                          )}
                          {(isDraft || canSend) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelTask(tsk.id)}
                              className="h-7 text-xs text-[#778094]"
                            >
                              {t("autocomment.btnCancel")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTask(tsk.id)}
                            className="h-7 w-7 text-[#778094] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("autocomment.editRuleModal")} #{editingRule?.id}</DialogTitle>
            <DialogDescription>
              {t("pageContext.autocomment.desc")}
            </DialogDescription>
          </DialogHeader>

          {editingRule && (
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.rulesCols.name")}</label>
                <Input
                  value={editingRule.name || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.modeLabel")}</label>
                  <Select
                    value={editingRule.mode}
                    onValueChange={(val) => setEditingRule({ ...editingRule, mode: val })}
                  >
                    <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12161e] border-[#2a3341]">
                      <SelectItem value="auto_reply">{t("autocomment.modeAutoReply")}</SelectItem>
                      <SelectItem value="auto_comment">{t("autocomment.modeAutoComment")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.targetKindLabel")}</label>
                  <Select
                    value={editingRule.target_kind}
                    onValueChange={(val) => setEditingRule({ ...editingRule, target_kind: val })}
                  >
                    <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12161e] border-[#2a3341]">
                      <SelectItem value="self">{t("autocomment.kindSelf")}</SelectItem>
                      <SelectItem value="work">{t("autocomment.kindWork")}</SelectItem>
                      <SelectItem value="creator">{t("autocomment.kindCreator")}</SelectItem>
                      <SelectItem value="keyword">{t("autocomment.kindKeyword")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.rulesCols.target")}</label>
                <Input
                  value={editingRule.target || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, target: e.target.value })}
                  className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("autocomment.templateLabel")}</label>
                <Textarea
                  value={editingRule.templatesText || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, templatesText: e.target.value })}
                  rows={3}
                  className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-[#8b94a3]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingRule.use_ai}
                    onChange={(e) => setEditingRule({ ...editingRule, use_ai: e.target.checked })}
                    className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
                  />
                  <span>{t("autocomment.useAiLabel")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingRule.require_review}
                    onChange={(e) => setEditingRule({ ...editingRule, require_review: e.target.checked })}
                    className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
                  />
                  <span>{t("autocomment.reviewLabel")}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1d2530]">
                <Button variant="ghost" onClick={() => setEditModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSaveEditedRule} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                  {t("common.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Content Dialog */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("autocomment.editTaskModal")}</DialogTitle>
            <DialogDescription>{t("pageContext.autocomment.desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Textarea
              value={taskContentInput}
              onChange={(e) => setTaskContentInput(e.target.value)}
              rows={4}
              placeholder="输入评论文案..."
              className="bg-[#0b0f16] border-[#2a3341] text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditTaskOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSaveTaskContent} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
