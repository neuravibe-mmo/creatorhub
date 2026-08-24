"use client";

import React from "react";
import { useAppSelector } from "@/store/hooks";
import { PAGE_META, PLATFORM_NAMES } from "@/lib/constants";

export function PageContext() {
  const currentTab = useAppSelector((state) => state.platform.currentTab);
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const meta = PAGE_META[currentTab] || {
    title: "工作台",
    desc: "多平台内容数据管理中心",
    kicker: "多平台工作台",
  };

  return (
    <div className="mb-6 space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <span className="text-[#fe2c55] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fe2c55]" />
          {PLATFORM_NAMES[currentPlatform]}
        </span>
        <span className="text-[#778094]">{meta.kicker}</span>
      </div>
      <h2 className="text-[22px] font-bold text-[#f6f8fb] tracking-tight">{meta.title}</h2>
      <p className="text-[13px] text-[#8b94a3]">{meta.desc}</p>
    </div>
  );
}
