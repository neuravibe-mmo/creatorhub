"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setTab } from "@/store/slices/platformSlice";
import { api } from "@/lib/api";
import { User, Target, Download, MessageSquare, ChevronRight, Zap } from "lucide-react";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { useTranslation } from "@/i18n";

export function OverviewTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { t } = useTranslation();

  const [stats, setStats] = useState({
    accountsCount: 0,
    monitorsCount: 0,
    contentsCount: 0,
    commentsCount: 0,
  });

  const chartData = [
    { day: "Day 1", works: 12, comments: 45 },
    { day: "Day 2", works: 18, comments: 62 },
    { day: "Day 3", works: 9, comments: 38 },
    { day: "Day 4", works: 24, comments: 85 },
    { day: "Day 5", works: 30, comments: 94 },
    { day: "Day 6", works: 42, comments: 120 },
    { day: "Day 7", works: 35, comments: 110 },
  ];

  useEffect(() => {
    async function loadOverview() {
      try {
        const [accs, mons, conts] = await Promise.all([
          api<any[]>(`/api/accounts?platform=${currentPlatform}`).catch(() => []),
          api<any[]>(`/api/monitors?platform=${currentPlatform}`).catch(() => []),
          api<any>(`/api/contents?platform=${currentPlatform}&limit=1`).catch(() => ({ total: 0 })),
        ]);
        setStats({
          accountsCount: accs?.length || 0,
          monitorsCount: mons?.length || 0,
          contentsCount: conts?.total || conts?.items?.length || 0,
          commentsCount: 0,
        });
      } catch {}
    }
    loadOverview();
  }, [currentPlatform]);

  const handleExportReport = async () => {
    dispatch(incrementBusy("正在导出 Excel 报告..."));
    try {
      const response = await fetch(`/api/reports/monitor.xlsx?platform=${currentPlatform}`);
      if (!response.ok) throw new Error("导出失败");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `creatorhub_${currentPlatform}_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      dispatch(addToast({ type: "ok", message: "Excel 监控报告已导出" }));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "导出失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const kpis = [
    {
      title: t("overview.stats.accounts"),
      value: stats.accountsCount,
      icon: User,
      color: "bg-[#38bdf8]/15 text-[#38bdf8]",
    },
    {
      title: t("overview.stats.monitors"),
      value: stats.monitorsCount,
      icon: Target,
      color: "bg-[#fe2c55]/15 text-[#fe2c55]",
    },
    {
      title: t("overview.stats.contents"),
      value: stats.contentsCount,
      icon: Download,
      color: "bg-[#34d399]/15 text-[#34d399]",
    },
    {
      title: t("overview.stats.comments"),
      value: stats.commentsCount,
      icon: MessageSquare,
      color: "bg-[#fbbf24]/15 text-[#fbbf24]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={i}
              className="rounded-[14px] border border-[#2a3341] bg-[#12161e] p-4 flex items-center gap-4 shadow-sm"
            >
              <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#f6f8fb] font-mono leading-none">
                  {k.value}
                </div>
                <div className="text-xs text-[#8b94a3] mt-1">{k.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: 7-Day Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="lg:col-span-2 rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1d2530]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#fe2c55]" />
              <h3 className="text-sm font-semibold text-[#f6f8fb]">
                {t("overview.recentWorks")} <span className="text-xs text-[#778094] font-normal">7-Day Activity</span>
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#8b94a3]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#fe2c55]" /> {t("nav.contents")}
              </span>
              <span className="flex items-center gap-1.5 text-[#8b94a3]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" /> {t("nav.comments")}
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1 h-40">
                  <div
                    className="w-3 bg-[#fe2c55] rounded-t transition-all duration-300"
                    style={{ height: `${(d.works / 50) * 100}%` }}
                    title={`Works: ${d.works}`}
                  />
                  <div
                    className="w-3 bg-[#38bdf8] rounded-t transition-all duration-300"
                    style={{ height: `${(d.comments / 150) * 100}%` }}
                    title={`Comments: ${d.comments}`}
                  />
                </div>
                <span className="text-[11px] text-[#778094] font-mono">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-3 border-b border-[#1d2530]">
            <Zap className="w-4 h-4 text-[#fe2c55]" />
            <h3 className="text-sm font-semibold text-[#f6f8fb]">
              {t("overview.quickActions")}
            </h3>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => dispatch(setTab("accounts"))}
              className="w-full p-3 rounded-[10px] bg-[#181d27] hover:bg-[#202632] border border-[#1d2530] flex items-center justify-between text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#12161e] flex items-center justify-center text-[#38bdf8]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#f6f8fb]">{t("accounts.title")}</div>
                  <div className="text-[11px] text-[#778094]">{t("accounts.subtitle")}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#778094] group-hover:text-[#f6f8fb] transition-colors" />
            </button>

            <button
              onClick={() => dispatch(setTab("monitors"))}
              className="w-full p-3 rounded-[10px] bg-[#181d27] hover:bg-[#202632] border border-[#1d2530] flex items-center justify-between text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#12161e] flex items-center justify-center text-[#fe2c55]">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#f6f8fb]">{t("monitors.addMonitor")}</div>
                  <div className="text-[11px] text-[#778094]">{t("monitors.subtitle")}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#778094] group-hover:text-[#f6f8fb] transition-colors" />
            </button>

            <button
              onClick={() => dispatch(setTab("share-download"))}
              className="w-full p-3 rounded-[10px] bg-[#181d27] hover:bg-[#202632] border border-[#1d2530] flex items-center justify-between text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#12161e] flex items-center justify-center text-[#34d399]">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#f6f8fb]">{t("shareDownload.cardTitle")}</div>
                  <div className="text-[11px] text-[#778094]">{t("shareDownload.cardSub")}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#778094] group-hover:text-[#f6f8fb] transition-colors" />
            </button>

            <button
              onClick={handleExportReport}
              className="w-full p-3 rounded-[10px] bg-[#181d27] hover:bg-[#202632] border border-[#1d2530] flex items-center justify-between text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#12161e] flex items-center justify-center text-[#fbbf24]">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#f6f8fb]">{t("header.exportMonitorReport")}</div>
                  <div className="text-[11px] text-[#778094]">Excel (.xlsx)</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#778094] group-hover:text-[#f6f8fb] transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
