"use client";

import React from "react";
import { PlatformSwitcher } from "./platform-switcher";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Activity } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";

export function Header() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);

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

  return (
    <header className="h-[68px] border-b border-[#1d2530] bg-[#090b10]/90 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#fe2c55] to-[#ff6a85] flex items-center justify-center text-white font-bold shadow-md shadow-[#fe2c55]/20 shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[16px] text-[#f6f8fb] tracking-tight">CreatorHub</span>
              <span className="text-[10px] font-bold text-[#fe2c55] bg-[#fe2c55]/15 px-1.5 py-0.5 rounded-[5px]">
                LITE
              </span>
            </div>
            <span className="text-[10.5px] text-[#778094] leading-tight">多平台内容工作台</span>
          </div>
        </div>

        {/* Platform Switcher */}
        <PlatformSwitcher />
      </div>

      <div className="flex items-center gap-3.5">
        {/* Engine status */}
        <div className="inline-flex items-center gap-2 text-xs text-[#8b94a3] px-3 py-1.5 rounded-full border border-[#2a3341] bg-[#12161e]">
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
          <span className="font-medium">引擎运行中</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportReport}
          className="gap-1.5 text-xs text-[#8b94a3] hover:text-[#f6f8fb] border-[#2a3341] bg-[#12161e] rounded-full h-8"
        >
          <Download className="w-3.5 h-3.5" />
          <span>导出监控报告</span>
        </Button>
      </div>
    </header>
  );
}
