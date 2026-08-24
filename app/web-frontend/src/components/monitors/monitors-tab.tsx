"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setTargets,
  setCollectionJobs,
  openCreateModal,
  closeCreateModal,
  openCreateCollectionModal,
  closeCreateCollectionModal,
} from "@/store/slices/monitorsSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { MonitorTarget, CollectionJob } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Plus, Play, RefreshCw, Trash2, Hash } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export function MonitorsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { targets, collectionJobs, createModal, createCollectionModal } = useAppSelector(
    (state) => state.monitors
  );

  const [targetUrl, setTargetUrl] = useState("");
  const [keywordText, setKeywordText] = useState("");

  const loadMonitors = async () => {
    try {
      const data = await api<MonitorTarget[]>(`/api/monitors?platform=${currentPlatform}`);
      dispatch(setTargets(data || []));
    } catch {}
  };

  const loadCollections = async () => {
    try {
      const data = await api<CollectionJob[]>(`/api/collections?platform=${currentPlatform}`);
      dispatch(setCollectionJobs(data || []));
    } catch {}
  };

  useEffect(() => {
    loadMonitors();
    loadCollections();
  }, [currentPlatform]);

  const handleAddMonitor = async () => {
    if (!targetUrl.trim()) return;
    dispatch(incrementBusy("正在添加监控目标..."));
    try {
      await api("/api/monitors", {
        method: "POST",
        body: JSON.stringify({ platform: currentPlatform, url: targetUrl.trim() }),
      });
      dispatch(closeCreateModal());
      setTargetUrl("");
      dispatch(addToast({ type: "ok", message: "监控目标已添加" }));
      loadMonitors();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "添加失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleCreateCollection = async () => {
    if (!keywordText.trim()) return;
    dispatch(incrementBusy("正在发起批量采集任务..."));
    try {
      await api("/api/collections", {
        method: "POST",
        body: JSON.stringify({ platform: currentPlatform, keyword: keywordText.trim(), target_count: 50 }),
      });
      dispatch(closeCreateCollectionModal());
      setKeywordText("");
      dispatch(addToast({ type: "ok", message: "采集任务已开始执行" }));
      loadCollections();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "发起失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleDeleteMonitor = async (id: number) => {
    if (!confirm("确定停止监控并删除该目标吗？")) return;
    try {
      await api(`/api/monitors/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: "已删除监控目标" }));
      loadMonitors();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "删除失败" }));
    }
  };

  const handleSyncMonitor = async (id: number) => {
    dispatch(incrementBusy("正在抓取最新作品..."));
    try {
      await api(`/api/monitors/${id}/sync`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: "抓取任务已下发" }));
      loadMonitors();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "同步失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-8">
      {/* Monitored Authors Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">作品监控</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              持续追踪目标博主或竞品账号，自动抓取并归档最新发布的作品
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button onClick={() => dispatch(openCreateModal())} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>添加监控博主</span>
            </Button>
            <Button variant="secondary" onClick={() => dispatch(openCreateCollectionModal())} className="gap-2">
              <Hash className="w-4 h-4" />
              <span>关键词批量采集</span>
            </Button>
          </div>
        </div>

        {targets.length === 0 ? (
          <Card className="p-10 text-center text-slate-500 border-dashed">
            暂无监控目标，点击右上角添加
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targets.map((t) => (
              <Card key={t.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                      {t.nickname?.slice(0, 1) || "T"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-100">{t.nickname || t.target_id}</div>
                      <div className="text-xs text-slate-500 font-mono">ID: {t.target_id}</div>
                    </div>
                  </div>
                  <Badge variant="default">{t.platform}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <span>作品数: {t.works_count ?? 0}</span>
                  <span>上次同步: {timeAgo(t.last_sync_at)}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => handleSyncMonitor(t.id)} className="gap-1 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>立即抓取</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMonitor(t.id)} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Keyword Collections Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-200">关键词批量采集任务</h3>
        {collectionJobs.length === 0 ? (
          <Card className="p-6 text-center text-slate-500 text-sm">暂无关键词采集任务</Card>
        ) : (
          <div className="space-y-2">
            {collectionJobs.map((job) => (
              <Card key={job.id} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-100">关键词: #{job.keyword}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      进度: {job.collected_count} / {job.target_count} · {timeAgo(job.created_at)}
                    </div>
                  </div>
                </div>
                <Badge variant={job.status === "completed" ? "success" : "warning"}>{job.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Monitor Modal */}
      <Dialog open={createModal.isOpen} onOpenChange={(open) => !open && dispatch(closeCreateModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加监控目标</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="输入博主主页链接或 SecUID / ID"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeCreateModal())}>
                取消
              </Button>
              <Button onClick={handleAddMonitor}>确认添加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Collection Modal */}
      <Dialog
        open={createCollectionModal.isOpen}
        onOpenChange={(open) => !open && dispatch(closeCreateCollectionModal())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建关键词批量采集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              placeholder="输入要采集的话题关键词 (如: 美食探店)"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeCreateCollectionModal())}>
                取消
              </Button>
              <Button onClick={handleCreateCollection}>开始采集</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
