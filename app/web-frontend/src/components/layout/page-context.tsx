"use client";

import React from "react";
import { useAppSelector } from "@/store/hooks";
import { useTranslation, TxKey } from "@/i18n";

const TAB_PAGE_MAP: Record<string, string> = {
  overview: "overview",
  accounts: "accounts",
  hub: "hub",
  monitors: "monitors",
  collections: "collections",
  contents: "contents",
  comments: "comments",
  danmaku: "danmaku",
  publish: "publish",
  autocomment: "autocomment",
  "share-download": "share_download",
  proxies: "proxies",
  "risk-control": "risk_control",
  notifications: "notifications",
  settings: "settings",
};

export function PageContext() {
  const currentTab = useAppSelector((state) => state.platform.currentTab);
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { t } = useTranslation();

  const pageKey = TAB_PAGE_MAP[currentTab] || "overview";
  const kickerKey = `pageContext.${pageKey}.kicker` as TxKey;
  const titleKey = `pageContext.${pageKey}.title` as TxKey;
  const descKey = `pageContext.${pageKey}.desc` as TxKey;
  const platformKey = `platforms.${currentPlatform}` as TxKey;

  const kicker = t(kickerKey);
  const title = t(titleKey);
  const desc = t(descKey);
  const platformName = t(platformKey);

  return (
    <div className="mb-6 space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <span className="text-[#fe2c55] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fe2c55]" />
          {platformName}
        </span>
        <span className="text-[#778094]">· {kicker}</span>
      </div>
      <h2 className="text-[22px] font-bold text-[#f6f8fb] tracking-tight">{title}</h2>
      <p className="text-[13px] text-[#8b94a3]">{desc}</p>
    </div>
  );
}
