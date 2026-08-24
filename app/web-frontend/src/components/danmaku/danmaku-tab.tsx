"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setWatches,
  setActiveWatchId,
  setDanmakus,
  openAddWatchModal,
  closeAddWatchModal,
} from "@/store/slices/danmakuSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { DanmakuWatch, DanmakuItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tv, Plus, BarChart2 } from "lucide-react";
import { formatSec, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function DanmakuTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { watches, activeWatchId, danmakus, total, addWatchModal } = useAppSelector(
    (state) => state.danmaku
  );
  const { t } = useTranslation();

  const [danmakuUrl, setDanmakuUrl] = useState("");

  const loadWatches = async () => {
    try {
      const data = await api<DanmakuWatch[]>(`/api/danmaku-watches?platform=${currentPlatform}`);
      dispatch(setWatches(data || []));
      if (data && data.length > 0 && !activeWatchId) {
        dispatch(setActiveWatchId(data[0].id));
      }
    } catch {}
  };

  const loadDanmakus = async () => {
    if (!activeWatchId) return;
    try {
      const data = await api<{ items: DanmakuItem[]; total: number }>(
        `/api/danmaku?watch_id=${activeWatchId}`
      );
      dispatch(setDanmakus({ items: data.items || [], total: data.total || 0 }));
    } catch {}
  };

  useEffect(() => {
    loadWatches();
  }, [currentPlatform]);

  useEffect(() => {
    loadDanmakus();
  }, [activeWatchId]);

  const handleAddWatch = async () => {
    if (!danmakuUrl.trim()) return;
    dispatch(incrementBusy());
    try {
      await api("/api/danmaku-watches", {
        method: "POST",
        body: JSON.stringify({ platform: currentPlatform, url: danmakuUrl.trim() }),
      });
      dispatch(closeAddWatchModal());
      setDanmakuUrl("");
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadWatches();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#f6f8fb]">{t("danmaku.title")}</h2>
          <p className="text-sm text-[#778094] mt-0.5">
            {t("pageContext.danmaku.desc")}
          </p>
        </div>

        <Button onClick={() => dispatch(openAddWatchModal())} className="gap-2 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
          <Plus className="w-4 h-4" />
          <span>{t("common.add")}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Watches List */}
        <Card className="p-3 space-y-2 max-h-[650px] overflow-y-auto border-[#2a3341] bg-[#12161e]">
          <h3 className="text-xs font-semibold text-[#778094] px-2 py-1 uppercase">{t("contents.title")}</h3>
          {watches.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#778094]">{t("common.empty")}</div>
          ) : (
            watches.map((w) => (
              <button
                key={w.id}
                onClick={() => dispatch(setActiveWatchId(w.id))}
                className={`w-full p-2.5 rounded-[8px] text-left transition-colors flex items-center gap-2.5 ${
                  activeWatchId === w.id
                    ? "bg-[#181d27] border border-[#fe2c55]/40 text-[#fe2c55]"
                    : "text-[#8b94a3] hover:bg-[#181d27]/50"
                }`}
              >
                <div className="w-9 h-9 rounded-[8px] bg-[#0b0f16] flex items-center justify-center shrink-0">
                  <Tv className="w-4 h-4 text-[#778094]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-[#f6f8fb] truncate">{w.title}</div>
                  <div className="text-[11px] text-[#778094] mt-0.5">
                    {t("danmaku.countText", { count: w.danmaku_count ?? 0 })} · {timeAgo(w.last_sync_at)}
                  </div>
                </div>
              </button>
            ))
          )}
        </Card>

        {/* Danmaku Items Stream */}
        <Card className="md:col-span-2 p-5 space-y-4 max-h-[650px] flex flex-col justify-between border-[#2a3341] bg-[#12161e]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1d2530]">
            <h3 className="text-sm font-semibold text-[#f6f8fb] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#fe2c55]" />
              <span>{t("danmaku.timeline")} ({total})</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {danmakus.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-[#778094]">
                {t("common.empty")}
              </div>
            ) : (
              danmakus.map((dm) => (
                <div
                  key={dm.id}
                  className="p-2.5 rounded-[8px] bg-[#181d27]/60 border border-[#1d2530] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#fe2c55] font-semibold">
                      {formatSec(dm.video_time_ms / 1000)}
                    </span>
                    <span className="text-[#f6f8fb]">{dm.text}</span>
                  </div>
                  <span className="text-[10px] text-[#778094]">{timeAgo(dm.send_time)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add Watch Modal */}
      <Dialog open={addWatchModal.isOpen} onOpenChange={(open) => !open && dispatch(closeAddWatchModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("danmaku.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={danmakuUrl}
              onChange={(e) => setDanmakuUrl(e.target.value)}
              placeholder={t("danmaku.urlPlaceholder")}
              className="bg-[#0b0f16] border-[#2a3341] text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeAddWatchModal())}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddWatch} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
