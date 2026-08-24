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
import { Plus, RefreshCw, Trash2, Hash } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function MonitorsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { targets, collectionJobs, createModal, createCollectionModal } = useAppSelector(
    (state) => state.monitors
  );
  const { t } = useTranslation();

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
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadMonitors();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
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
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadCollections();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleDeleteMonitor = async (id: number) => {
    if (!confirm(t("common.confirm") + "?")) return;
    try {
      await api(`/api/monitors/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadMonitors();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    }
  };

  const handleSyncMonitor = async (id: number) => {
    dispatch(incrementBusy("正在抓取最新作品..."));
    try {
      await api(`/api/monitors/${id}/sync`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadMonitors();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
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
            <h2 className="text-xl font-bold text-[#f6f8fb]">{t("monitors.title")}</h2>
            <p className="text-sm text-[#778094] mt-0.5">{t("monitors.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button onClick={() => dispatch(openCreateModal())} className="gap-2 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
              <Plus className="w-4 h-4" />
              <span>{t("monitors.addMonitor")}</span>
            </Button>
            <Button variant="secondary" onClick={() => dispatch(openCreateCollectionModal())} className="gap-2 border-[#2a3341] bg-[#181d27] text-[#e7eaf0]">
              <Hash className="w-4 h-4" />
              <span>{t("pageContext.collections.title")}</span>
            </Button>
          </div>
        </div>

        {targets.length === 0 ? (
          <Card className="p-10 text-center text-[#778094] border-dashed border-[#2a3341] bg-[#12161e]">
            {t("common.empty")}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targets.map((tgt) => (
              <Card key={tgt.id} className="p-4 space-y-4 border-[#2a3341] bg-[#12161e] hover:border-[#fe2c55]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#181d27] border border-[#2a3341] flex items-center justify-center font-bold text-[#f6f8fb]">
                      {tgt.nickname?.slice(0, 1) || "T"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#f6f8fb]">{tgt.nickname || tgt.target_id}</div>
                      <div className="text-xs text-[#778094] font-mono">ID: {tgt.target_id}</div>
                    </div>
                  </div>
                  <Badge variant="default">{tgt.platform}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-[#778094] border-t border-[#1d2530] pt-3">
                  <span>{t("contents.title")}: {tgt.works_count ?? 0}</span>
                  <span>{t("monitors.lastChecked")}: {timeAgo(tgt.last_sync_at)}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => handleSyncMonitor(tgt.id)} className="gap-1 text-xs text-[#38bdf8]">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t("common.runNow")}</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMonitor(tgt.id)} className="h-7 w-7 text-[#778094] hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Keyword Collections Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#f6f8fb]">{t("pageContext.collections.title")}</h3>
        {collectionJobs.length === 0 ? (
          <Card className="p-6 text-center text-[#778094] text-sm border-[#2a3341] bg-[#12161e]">
            {t("common.empty")}
          </Card>
        ) : (
          <div className="space-y-2">
            {collectionJobs.map((job) => (
              <Card key={job.id} className="p-3.5 flex items-center justify-between border-[#2a3341] bg-[#12161e]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#fe2c55]/10 text-[#fe2c55]">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#f6f8fb]">#{job.keyword}</div>
                    <div className="text-xs text-[#778094] mt-0.5">
                      {job.collected_count} / {job.target_count} · {timeAgo(job.created_at)}
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
            <DialogTitle>{t("monitors.addMonitor")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="输入博主主页链接或 SecUID / ID"
              className="bg-[#0b0f16] border-[#2a3341] text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeCreateModal())}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddMonitor} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.confirm")}
              </Button>
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
            <DialogTitle>{t("pageContext.collections.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              placeholder={t("collections.batchPlaceholder")}
              className="bg-[#0b0f16] border-[#2a3341] text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeCreateCollectionModal())}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateCollection} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
