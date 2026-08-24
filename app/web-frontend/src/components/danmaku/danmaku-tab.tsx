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
import { Tv, Plus, Download, BarChart2 } from "lucide-react";
import { formatSec, timeAgo } from "@/lib/utils";

export function DanmakuTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { watches, activeWatchId, danmakus, addWatchModal } = useAppSelector(
    (state) => state.danmaku
  );

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
    dispatch(incrementBusy("正在添加弹幕监控..."));
    try {
      await api("/api/danmaku-watches", {
        method: "POST",
        body: JSON.stringify({ platform: currentPlatform, url: danmakuUrl.trim() }),
      });
      dispatch(closeAddWatchModal());
      setDanmakuUrl("");
      dispatch(addToast({ type: "ok", message: "弹幕监控已添加" }));
      loadWatches();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "添加失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">短视频弹幕监控</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            抓取短视频全量弹幕，生成时间轴密度图并支持 Excel 导出
          </p>
        </div>

        <Button onClick={() => dispatch(openAddWatchModal())} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>添加弹幕监控</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Watches List */}
        <Card className="p-3 space-y-2 max-h-[650px] overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-400 px-2 py-1 uppercase">视频列表</h3>
          {watches.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">暂无监控视频</div>
          ) : (
            watches.map((w) => (
              <div
                key={w.id}
                onClick={() => dispatch(setActiveWatchId(w.id))}
                className={`p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  activeWatchId === w.id
                    ? "bg-blue-600/20 border border-blue-500/30 text-slate-100"
                    : "hover:bg-slate-800/60 text-slate-300"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{w.title || `视频 ${w.video_id}`}</div>
                  <div className="text-xs text-slate-500 mt-0.5">弹幕: {w.danmaku_count ?? 0} 条</div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Danmaku Feed */}
        <Card className="md:col-span-2 p-4 flex flex-col min-h-[500px]">
          {danmakus.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              <Tv className="w-8 h-8 mb-2 opacity-50" />
              暂无弹幕数据
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {danmakus.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-850 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-xs">
                      {formatSec(Math.floor(d.video_time_ms / 1000))}
                    </span>
                    <span className="text-slate-200">{d.text}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{timeAgo(d.send_time)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Danmaku Watch Modal */}
      <Dialog open={addWatchModal.isOpen} onOpenChange={(open) => !open && dispatch(closeAddWatchModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加视频弹幕监控</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={danmakuUrl}
              onChange={(e) => setDanmakuUrl(e.target.value)}
              placeholder="输入短视频分享链接或 ID"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeAddWatchModal())}>
                取消
              </Button>
              <Button onClick={handleAddWatch}>开始抓取</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
