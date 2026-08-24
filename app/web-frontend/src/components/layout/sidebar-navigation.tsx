"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTab } from "@/store/slices/platformSlice";
import { NAV_GROUPS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Zap,
  CreditCard,
  Target,
  Hash,
  MessageSquare,
  MessageCircle,
  User,
  Send,
  Download,
  Network,
  Bell,
  Settings,
  Shield,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Zap,
  CreditCard,
  Target,
  Hash,
  MessageSquare,
  MessageCircle,
  User,
  Send,
  Download,
  Network,
  Bell,
  Settings,
  Shield,
};

export function SidebarNavigation() {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector((state) => state.platform.currentTab);
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const badges = useAppSelector((state) => state.platform.badges);

  return (
    <aside className="w-[232px] shrink-0 border-r border-[#1d2530] bg-[#090b10] p-3 flex flex-col gap-1 min-h-[calc(100vh-68px)] select-none">
      {NAV_GROUPS.map((group, gIdx) => {
        const visibleItems = group.items.filter((item) => {
          if (!item.supportedPlatforms) return true;
          return item.supportedPlatforms.includes(currentPlatform);
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={gIdx} className="space-y-1">
            {group.label && (
              <div className="text-[11px] font-semibold text-[#778094] px-3 pt-3 pb-1 uppercase tracking-wider">
                {group.label}
              </div>
            )}

            {visibleItems.map((item) => {
              const IconComponent = ICON_MAP[item.icon] || Zap;
              const isActive = currentTab === item.tab;
              const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;

              return (
                <button
                  key={item.tab}
                  onClick={() => dispatch(setTab(item.tab))}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-150 text-left group",
                    isActive
                      ? "bg-[#fe2c55]/15 text-[#fe2c55] border border-[#fe2c55]/40 shadow-sm"
                      : "text-[#8b94a3] hover:text-[#e7eaf0] hover:bg-[#12161e] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComponent
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#fe2c55]" : "text-[#778094] group-hover:text-[#e7eaf0]"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10.5px] font-mono font-semibold leading-none shrink-0",
                        isActive
                          ? "bg-[#fe2c55] text-white"
                          : "bg-[#181d27] text-[#8b94a3] border border-[#2a3341]"
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
