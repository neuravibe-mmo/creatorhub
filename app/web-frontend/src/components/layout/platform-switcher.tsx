"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPlatform } from "@/store/slices/platformSlice";
import { PLATFORMS } from "@/lib/constants";
import { Platform } from "@/types";
import { cn } from "@/lib/utils";

export function PlatformSwitcher() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-[#12161e] border border-[#2a3341] rounded-full">
      {PLATFORMS.map((p) => {
        const isActive = currentPlatform === p.id;
        return (
          <button
            key={p.id}
            onClick={() => dispatch(setPlatform(p.id))}
            className={cn(
              "px-3.5 py-1 rounded-full text-[12.5px] font-semibold transition-all duration-150 flex items-center gap-1.5 select-none",
              isActive
                ? p.id === "douyin"
                  ? "bg-[#fe2c55]/15 text-[#fe2c55] border border-[#fe2c55]/40 shadow-sm"
                  : p.id === "xhs"
                  ? "bg-[#ff2442]/15 text-[#ff2442] border border-[#ff2442]/40 shadow-sm"
                  : p.id === "kuaishou"
                  ? "bg-[#ff7902]/15 text-[#ff7902] border border-[#ff7902]/40 shadow-sm"
                  : "bg-[#07c160]/15 text-[#07c160] border border-[#07c160]/40 shadow-sm"
                : "text-[#8b94a3] hover:text-[#e7eaf0] hover:bg-[#181d27] border border-transparent"
            )}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            <span>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
