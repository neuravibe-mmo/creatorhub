"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setRiskSummary, setRiskAccounts, setRiskConfig } from "@/store/slices/riskSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield,
  RefreshCw,
  Zap,
  Check,
  AlertTriangle,
  History,
  Info,
  ExternalLink,
  Lock,
  Radio,
  Sliders,
  Clock,
  Activity,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { RiskAccountItem } from "@/types";
import { useTranslation } from "@/i18n";

const STATUS_MAP: Record<string, { label: string; tone: "success" | "danger" | "warning" | "secondary" }> = {
  normal: { label: "正常", tone: "success" },
  cooldown: { label: "风险冷却", tone: "danger" },
  recovering: { label: "渐进恢复", tone: "warning" },
  auth_invalid: { label: "登录失效", tone: "danger" },
  proxy_error: { label: "代理异常", tone: "danger" },
  network_circuit: { label: "网络熔断", tone: "danger" },
  write_paused: { label: "写入暂停", tone: "danger" },
};

export function RiskControlTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { summary, accounts, config } = useAppSelector((state) => state.risk);
  const { t } = useTranslation();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Config Form State
  const [riskEnabled, setRiskEnabled] = useState(true);
  const [riskMode, setRiskMode] = useState("conservative");
  const [retentionDays, setRetentionDays] = useState(30);

  // Read & Recovery
  const [readLightGap, setReadLightGap] = useState(3);
  const [readHeavyGap, setReadHeavyGap] = useState(10);
  const [recoveryCount, setRecoveryCount] = useState(3);
  const [probeGapMin, setProbeGapMin] = useState(15);
  const [cooldownSteps, setCooldownSteps] = useState("30, 120, 360, 1440");

  // Network & Time
  const [networkConcurrency, setNetworkConcurrency] = useState(2);
  const [networkRiskAccounts, setNetworkRiskAccounts] = useState(2);
  const [networkWindowMin, setNetworkWindowMin] = useState(30);
  const [networkCooldownMin, setNetworkCooldownMin] = useState(60);
  const [accountCheckMin, setAccountCheckMin] = useState(30);
  const [captchaWaitMin, setCaptchaWaitMin] = useState(15);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [activeHoursStart, setActiveHoursStart] = useState(8);
  const [activeHoursEnd, setActiveHoursEnd] = useState(23);

  // Write limits
  const [commentGapMin, setCommentGapMin] = useState(2);
  const [commentHourly, setCommentHourly] = useState(15);
  const [commentDaily, setCommentDaily] = useState(60);

  const [socialGapMin, setSocialGapMin] = useState(5);
  const [socialHourly, setSocialHourly] = useState(10);
  const [socialDaily, setSocialDaily] = useState(40);

  const [dmGapMin, setDmGapMin] = useState(3);
  const [dmHourly, setDmHourly] = useState(12);
  const [dmDaily, setDmDaily] = useState(50);

  const [publishGapMin, setPublishGapMin] = useState(30);
  const [publishHourly, setPublishHourly] = useState(3);
  const [publishDaily, setPublishDaily] = useState(10);

  const [sharedWriteMin, setSharedWriteMin] = useState(2);
  const [combinedHourly, setCombinedHourly] = useState(25);
  const [combinedDaily, setCombinedDaily] = useState(100);

  // Events modal
  const [eventsModalOpen, setEventsModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [accountEvents, setAccountEvents] = useState<any[]>([]);

  // Clear modal
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearingAccountId, setClearingAccountId] = useState<number | null>(null);
  const [clearReason, setClearReason] = useState("");

  const loadRiskData = async () => {
    try {
      const qs = `?platform=${currentPlatform}`;
      const [sum, accs, cfg] = await Promise.all([
        api<any>(`/api/risk-control/summary${qs}`).catch(() => null),
        api<RiskAccountItem[]>(`/api/risk-control/accounts${qs}`).catch(() => []),
        api<any>("/api/risk-control/config").catch(() => null),
      ]);

      if (sum) dispatch(setRiskSummary(sum));
      if (accs) dispatch(setRiskAccounts(accs));
      if (cfg) {
        dispatch(setRiskConfig(cfg));
        fillConfigState(cfg);
      }
    } catch {}
  };

  const fillConfigState = (cfg: any) => {
    const r = cfg.risk_control || {};
    const s = cfg.schedule || {};
    setRiskEnabled(!!r.enabled);
    setRiskMode(r.mode || "conservative");
    setRetentionDays(r.event_retention_days ?? 30);

    setReadLightGap(r.read_light_gap_seconds ?? 3);
    setReadHeavyGap(r.read_heavy_gap_seconds ?? 10);
    setRecoveryCount(r.recovery_successes ?? 3);
    setProbeGapMin(Math.round((r.recovery_probe_gap_seconds || 900) / 60));
    setCooldownSteps(
      (r.cooldown_steps_seconds || [1800, 7200, 21600, 86400]).map((v: number) => v / 60).join(", ")
    );

    setNetworkConcurrency(r.network_group_concurrency ?? 2);
    setNetworkRiskAccounts(r.network_group_risk_accounts ?? 2);
    setNetworkWindowMin(Math.round((r.network_group_risk_window_seconds || 1800) / 60));
    setNetworkCooldownMin(Math.round((r.network_group_cooldown_seconds || 3600) / 60));
    setAccountCheckMin(Math.round((s.account_check_interval_seconds || 1800) / 60));
    setCaptchaWaitMin(Math.round((s.douyin_captcha_wait_seconds || 900) / 60));
    setQuietHoursEnabled(!!s.quiet_hours_enabled);
    setActiveHoursStart(s.active_hours_start ?? 8);
    setActiveHoursEnd(s.active_hours_end ?? 23);

    setCommentGapMin(Math.round((r.comment_min_gap_seconds || 120) / 60));
    setCommentHourly(r.comment_hourly_cap ?? 15);
    setCommentDaily(r.comment_daily_cap ?? 60);

    setSocialGapMin(Math.round((r.social_min_gap_seconds || 300) / 60));
    setSocialHourly(r.social_hourly_cap ?? 10);
    setSocialDaily(r.social_daily_cap ?? 40);

    setDmGapMin(Math.round((r.dm_min_gap_seconds || 180) / 60));
    setDmHourly(r.dm_hourly_cap ?? 12);
    setDmDaily(r.dm_daily_cap ?? 50);

    setPublishGapMin(Math.round((r.publish_min_gap_seconds || 1800) / 60));
    setPublishHourly(r.publish_hourly_cap ?? 3);
    setPublishDaily(r.publish_daily_cap ?? 10);

    setSharedWriteMin(Math.round((r.shared_write_gap_seconds || 120) / 60));
    setCombinedHourly(r.combined_action_hourly_cap ?? 25);
    setCombinedDaily(r.combined_action_daily_cap ?? 100);
  };

  useEffect(() => {
    loadRiskData();
  }, [currentPlatform]);

  // Save Risk Config
  const handleSaveConfig = async () => {
    dispatch(incrementBusy("正在保存风控规则并立即生效..."));
    try {
      const steps = cooldownSteps
        .split(/[,，\s]+/)
        .filter(Boolean)
        .map((v) => Number(v) * 60);

      const payload = {
        risk_control: {
          enabled: riskEnabled,
          mode: riskMode,
          event_retention_days: Number(retentionDays),
          read_light_gap_seconds: Number(readLightGap),
          read_heavy_gap_seconds: Number(readHeavyGap),
          recovery_successes: Number(recoveryCount),
          recovery_probe_gap_seconds: Number(probeGapMin) * 60,
          cooldown_steps_seconds: steps,
          network_group_concurrency: Number(networkConcurrency),
          network_group_risk_accounts: Number(networkRiskAccounts),
          network_group_risk_window_seconds: Number(networkWindowMin) * 60,
          network_group_cooldown_seconds: Number(networkCooldownMin) * 60,
          comment_min_gap_seconds: Number(commentGapMin) * 60,
          comment_hourly_cap: Number(commentHourly),
          comment_daily_cap: Number(commentDaily),
          social_min_gap_seconds: Number(socialGapMin) * 60,
          social_hourly_cap: Number(socialHourly),
          social_daily_cap: Number(socialDaily),
          dm_min_gap_seconds: Number(dmGapMin) * 60,
          dm_hourly_cap: Number(dmHourly),
          dm_daily_cap: Number(dmDaily),
          publish_min_gap_seconds: Number(publishGapMin) * 60,
          publish_hourly_cap: Number(publishHourly),
          publish_daily_cap: Number(publishDaily),
          shared_write_gap_seconds: Number(sharedWriteMin) * 60,
          combined_action_hourly_cap: Number(combinedHourly),
          combined_action_daily_cap: Number(combinedDaily),
        },
        schedule: {
          quiet_hours_enabled: quietHoursEnabled,
          active_hours_start: Number(activeHoursStart),
          active_hours_end: Number(activeHoursEnd),
          account_check_interval_seconds: Number(accountCheckMin) * 60,
          douyin_captcha_wait_seconds: Number(captchaWaitMin) * 60,
        },
      };

      const res = await api<any>("/api/risk-control/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      dispatch(setRiskConfig(res));
      dispatch(addToast({ type: "ok", message: "风控规则已保存并立即生效 ✓" }));
      loadRiskData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "保存失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Probe Account
  const handleProbeAccount = async (id: number) => {
    dispatch(incrementBusy("正在执行轻量探测..."));
    try {
      const res = await api<{ result?: { skipped?: boolean; reason?: string }; woken_tasks?: number }>(
        `/api/risk-control/accounts/${id}/probe`,
        { method: "POST" }
      );
      if (res.result?.skipped) {
        dispatch(addToast({ type: "info", message: `当前尚未放行探测: ${res.result.reason || "处于冷却期"}` }));
      } else {
        dispatch(
          addToast({
            type: "ok",
            message: `探测成功，恢复进度已更新${res.woken_tasks ? `，唤醒 ${res.woken_tasks} 条任务` : ""}`,
          })
        );
      }
      loadRiskData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "探测失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Show Events Modal
  const handleShowEvents = async (id: number) => {
    setSelectedAccountId(id);
    setEventsModalOpen(true);
    try {
      const data = await api<{ events: any[] }>(`/api/risk-control/accounts/${id}/events?limit=100`);
      setAccountEvents(data.events || []);
    } catch {
      setAccountEvents([]);
    }
  };

  // Open Clear Modal
  const openClearDialog = (id: number) => {
    setClearingAccountId(id);
    setClearReason("");
    setClearModalOpen(true);
  };

  // Confirm Clear
  const handleConfirmClear = async () => {
    if (!clearingAccountId || clearReason.trim().length < 3) {
      dispatch(addToast({ type: "err", message: "请填写至少 3 个字符的解除原因" }));
      return;
    }

    dispatch(incrementBusy("正在解除账号风控状态..."));
    try {
      const res = await api<{ woken_tasks?: number }>(`/api/risk-control/accounts/${clearingAccountId}/clear`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true, reason: clearReason.trim() }),
      });
      setClearModalOpen(false);
      dispatch(
        addToast({
          type: "ok",
          message: `账号风控状态已解除${res.woken_tasks ? `，已唤醒 ${res.woken_tasks} 条任务` : ""}`,
        })
      );
      loadRiskData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "解除失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const match =
        (a.nickname || "").toLowerCase().includes(q) ||
        (a.reason || "").toLowerCase().includes(q) ||
        (a.proxy || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const counts = summary?.counts || {};

  return (
    <div className="space-y-6">
      {/* 1. 6 KPI Risk Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-3 text-center space-y-1 shadow-sm">
          <div className="text-2xl font-bold font-mono text-emerald-400 leading-none">
            {counts.normal ?? "—"}
          </div>
          <div className="text-[11px] text-[#778094]">{t("risk.normalAccounts")}</div>
        </div>

        <div className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-3 text-center space-y-1 shadow-sm">
          <div className="text-2xl font-bold font-mono text-rose-400 leading-none">
            {(counts.cooldown || 0) + (counts.network_circuit || 0) + (counts.write_paused || 0)}
          </div>
          <div className="text-[11px] text-[#778094]">{t("risk.cooldownAccounts")}</div>
        </div>

        <div className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-3 text-center space-y-1 shadow-sm">
          <div className="text-2xl font-bold font-mono text-amber-400 leading-none">
            {counts.recovering ?? "—"}
          </div>
          <div className="text-[11px] text-[#778094]">{t("risk.recoveringAccounts")}</div>
        </div>

        <div className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-3 text-center space-y-1 shadow-sm">
          <div className="text-2xl font-bold font-mono text-rose-400 leading-none">
            {(counts.auth_invalid || 0) + (counts.proxy_error || 0)}
          </div>
          <div className="text-[11px] text-[#778094]">{t("risk.invalidAccounts")}</div>
        </div>

        <div className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-3 text-center space-y-1 shadow-sm">
          <div className="text-2xl font-bold font-mono text-amber-400 leading-none">
            {summary?.blocked_tasks ?? "—"}
          </div>
          <div className="text-[11px] text-[#778094]">{t("risk.blockedTasks")}</div>
        </div>

        <div className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-3 text-center space-y-1 shadow-sm">
          <div className="text-2xl font-bold font-mono text-[#f6f8fb] leading-none">
            {summary?.risk_events_today ?? "—"}
          </div>
          <div className="text-[11px] text-[#778094]">{t("risk.todayEvents")}</div>
        </div>
      </div>

      {/* 2. Account Risk Status Table Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1d2530]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#f6f8fb]">
              {t("risk.postureTitle")}{" "}
              <span className="text-xs text-[#778094] font-normal">{t("risk.postureSub")}</span>
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadRiskData}
            className="gap-1.5 text-xs text-[#778094] hover:text-[#f6f8fb]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("common.refresh")}</span>
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder={t("risk.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 max-w-[200px] bg-[#0b0f16] border-[#2a3341] text-xs"
          />

          <div className="w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="normal">{t("risk.statuses.normal")}</SelectItem>
                <SelectItem value="cooldown">{t("risk.statuses.cooldown")}</SelectItem>
                <SelectItem value="recovering">{t("risk.statuses.recovering")}</SelectItem>
                <SelectItem value="auth_invalid">{t("risk.statuses.auth_invalid")}</SelectItem>
                <SelectItem value="proxy_error">{t("risk.statuses.proxy_error")}</SelectItem>
                <SelectItem value="network_circuit">{t("risk.statuses.network_circuit")}</SelectItem>
                <SelectItem value="write_paused">{t("risk.statuses.write_paused")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-[#778094] ml-auto">
            {t("risk.showingCount", { current: filteredAccounts.length, total: accounts.length })}
          </span>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1d2530] text-[#778094]">
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.account")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.status")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.level")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.reason")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.cooldownProbe")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.recovery")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.tasks")}</th>
                <th className="py-2.5 px-3 font-medium">{t("risk.cols.network")}</th>
                <th className="py-2.5 px-3 font-medium text-right">{t("risk.cols.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d2530]">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#778094]">
                    {t("risk.emptyPosture")}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((a) => {
                  const sInfo = STATUS_MAP[a.status] || { label: a.status, tone: "secondary" };
                  const riskLevelNum = Number(a.risk_level) || 0;
                  const progress =
                    riskLevelNum > 0
                      ? Math.min(
                          100,
                          Math.round(((a.recovery_successes || 0) * 100) / Math.max(1, a.recovery_target || 1))
                        )
                      : 100;

                  return (
                    <tr key={a.account_id} className="hover:bg-[#181d27]/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#f6f8fb]">{a.nickname || `账号 #${a.account_id}`}</div>
                        <div className="text-[11px] text-[#778094]">{a.platform}</div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant={sInfo.tone}>{sInfo.label}</Badge>
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-[#f6f8fb]">L{riskLevelNum}</td>

                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="truncate text-[#e7eaf0]" title={a.reason || "未检测到风险信号"}>
                          {a.reason || "未检测到风险信号"}
                        </div>
                        {a.last_risk_at && (
                          <div className="text-[10px] text-[#778094]">{timeAgo(a.last_risk_at)}</div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {a.cooldown_until ? (
                          <span className="font-mono text-rose-400">{timeAgo(a.cooldown_until)} 到期</span>
                        ) : a.next_probe_at ? (
                          <span className="font-mono text-amber-400">{timeAgo(a.next_probe_at)} 探测</span>
                        ) : (
                          <span className="text-[#778094]">{t("risk.noWait")}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 w-28">
                        <div className="w-full bg-[#0b0f16] rounded-full h-1.5 overflow-hidden border border-[#2a3341]">
                          <div className="bg-[#fe2c55] h-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-[10px] text-[#778094] mt-1 text-center font-mono">
                          {riskLevelNum > 0 ? `${a.recovery_successes || 0}/${a.recovery_target || 3}` : "完成"}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[#8b94a3]">
                        <b>{a.blocked_tasks || 0}</b> / {a.queued_tasks?.total || 0}
                      </td>

                      <td className="py-3 px-3 text-[#8b94a3]">
                        <div>{a.proxy ? a.proxy : t("risk.directConnect")}</div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProbeAccount(a.account_id)}
                            className="h-7 text-xs"
                          >
                            {t("risk.btnProbe")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowEvents(a.account_id)}
                            className="h-7 text-xs"
                          >
                            {t("risk.btnEvents")}
                          </Button>
                          {a.status !== "normal" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openClearDialog(a.account_id)}
                              className="h-7 text-xs text-rose-400"
                            >
                              {t("risk.btnClear")}
                            </Button>
                          )}
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

      {/* 3. Risk Rules Configuration Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#1d2530]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#f6f8fb]">
              {t("risk.rulesTitle")}{" "}
              <span className="text-xs text-[#778094] font-normal">{t("risk.rulesSub")}</span>
            </h3>
          </div>

          <Button
            onClick={handleSaveConfig}
            className="gap-1.5 h-8 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t("risk.saveRules")}</span>
          </Button>
        </div>

        {/* Global toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2.5 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              checked={riskEnabled}
              onChange={(e) => setRiskEnabled(e.target.checked)}
              className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
            />
            <div>
              <div className="font-semibold text-[#f6f8fb]">{t("risk.enableRisk")}</div>
              <div className="text-[10px] text-[#778094]">{t("risk.enableRiskDesc")}</div>
            </div>
          </label>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("risk.mode")}</label>
            <Select value={riskMode} onValueChange={setRiskMode}>
              <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="conservative">{t("risk.conservative")}</SelectItem>
                <SelectItem value="custom">{t("risk.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("risk.retentionDays")}</label>
            <Input
              type="number"
              min={1}
              max={3650}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
          </div>
        </div>

        {/* Fieldsets */}
        <div className="space-y-4">
          {/* Fieldset 1: Read & Recovery */}
          <div className="p-4 rounded-[12px] bg-[#181d27]/60 border border-[#1d2530] space-y-3">
            <div className="text-xs font-semibold text-[#f6f8fb]">{t("risk.sectionRead")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.readLightGap")}</label>
                <Input
                  type="number"
                  min={0}
                  value={readLightGap}
                  onChange={(e) => setReadLightGap(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.readHeavyGap")}</label>
                <Input
                  type="number"
                  min={0}
                  value={readHeavyGap}
                  onChange={(e) => setReadHeavyGap(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.recoveryCount")}</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={recoveryCount}
                  onChange={(e) => setRecoveryCount(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.probeGapMin")}</label>
                <Input
                  type="number"
                  min={1}
                  value={probeGapMin}
                  onChange={(e) => setProbeGapMin(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.cooldownSteps")}</label>
                <Input
                  value={cooldownSteps}
                  onChange={(e) => setCooldownSteps(e.target.value)}
                  placeholder="30, 120, 360, 1440"
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fieldset 2: Network & Timing */}
          <div className="p-4 rounded-[12px] bg-[#181d27]/60 border border-[#1d2530] space-y-3">
            <div className="text-xs font-semibold text-[#f6f8fb]">{t("risk.sectionNetwork")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.networkConcurrency")}</label>
                <Input
                  type="number"
                  min={1}
                  max={32}
                  value={networkConcurrency}
                  onChange={(e) => setNetworkConcurrency(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.networkRiskAccounts")}</label>
                <Input
                  type="number"
                  min={0}
                  value={networkRiskAccounts}
                  onChange={(e) => setNetworkRiskAccounts(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.networkWindowMin")}</label>
                <Input
                  type="number"
                  min={1}
                  value={networkWindowMin}
                  onChange={(e) => setNetworkWindowMin(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.networkCooldownMin")}</label>
                <Input
                  type="number"
                  min={1}
                  value={networkCooldownMin}
                  onChange={(e) => setNetworkCooldownMin(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-[#e7eaf0] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
                />
                <span>{t("risk.quietHoursEnabled")}</span>
              </label>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.activeHoursStart")}</label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={activeHoursStart}
                  onChange={(e) => setActiveHoursStart(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.activeHoursEnd")}</label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={activeHoursEnd}
                  onChange={(e) => setActiveHoursEnd(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fieldset 3: Write Limits Table */}
          <div className="p-4 rounded-[12px] bg-[#181d27]/60 border border-[#1d2530] space-y-3">
            <div className="text-xs font-semibold text-[#f6f8fb]">{t("risk.sectionWrite")}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1d2530] text-[#778094]">
                    <th className="py-2 px-3 font-medium">{t("risk.writeCols.actionType")}</th>
                    <th className="py-2 px-3 font-medium">{t("risk.writeCols.minGapMin")}</th>
                    <th className="py-2 px-3 font-medium">{t("risk.writeCols.hourlyCap")}</th>
                    <th className="py-2 px-3 font-medium">{t("risk.writeCols.dailyCap")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d2530]">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#f6f8fb]">{t("risk.writeActions.comment")}</td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={commentGapMin}
                        onChange={(e) => setCommentGapMin(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={commentHourly}
                        onChange={(e) => setCommentHourly(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={commentDaily}
                        onChange={(e) => setCommentDaily(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#f6f8fb]">{t("risk.writeActions.social")}</td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={socialGapMin}
                        onChange={(e) => setSocialGapMin(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={socialHourly}
                        onChange={(e) => setSocialHourly(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={socialDaily}
                        onChange={(e) => setSocialDaily(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#f6f8fb]">{t("risk.writeActions.dm")}</td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={dmGapMin}
                        onChange={(e) => setDmGapMin(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={dmHourly}
                        onChange={(e) => setDmHourly(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={dmDaily}
                        onChange={(e) => setDmDaily(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#f6f8fb]">{t("risk.writeActions.publish")}</td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={publishGapMin}
                        onChange={(e) => setPublishGapMin(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={publishHourly}
                        onChange={(e) => setPublishHourly(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min={0}
                        value={publishDaily}
                        onChange={(e) => setPublishDaily(Number(e.target.value))}
                        className="w-24 h-7 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.sharedWriteMin")}</label>
                <Input
                  type="number"
                  min={0}
                  value={sharedWriteMin}
                  onChange={(e) => setSharedWriteMin(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.combinedHourly")}</label>
                <Input
                  type="number"
                  min={0}
                  value={combinedHourly}
                  onChange={(e) => setCombinedHourly(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#778094] block mb-1">{t("risk.combinedDaily")}</label>
                <Input
                  type="number"
                  min={0}
                  value={combinedDaily}
                  onChange={(e) => setCombinedDaily(Number(e.target.value))}
                  className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] text-xs text-[#8b94a3]">
          <Info className="w-4 h-4 shrink-0 text-[#38bdf8]" />
          <span>{t("risk.conservativeTip")}</span>
        </div>
      </div>

      {/* Events History Modal */}
      <Dialog open={eventsModalOpen} onOpenChange={setEventsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("risk.eventsModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("risk.eventsModalDesc", { count: accountEvents.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 pt-2">
            {accountEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#778094]">{t("risk.emptyEvents")}</div>
            ) : (
              accountEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-[8px] bg-[#181d27] border border-[#1d2530] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#f6f8fb]">{evt.operation_kind}</span>
                    <Badge variant={evt.outcome === "success" ? "success" : "danger"}>
                      {evt.outcome}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-[#8b94a3]">{evt.detail || evt.signal || t("risk.noDetail")}</div>
                  <div className="text-[10px] text-[#778094] font-mono">{timeAgo(evt.occurred_at)}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Account Risk Modal */}
      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("risk.clearModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("risk.clearModalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("risk.clearReasonLabel")}</label>
              <Input
                value={clearReason}
                onChange={(e) => setClearReason(e.target.value)}
                placeholder={t("risk.clearReasonPlaceholder")}
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setClearModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleConfirmClear} className="bg-rose-600 hover:bg-rose-700 text-white">
                {t("risk.confirmClear")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
