"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setProxies,
  setLoading,
  setTestStatus,
  openAddModal,
  closeAddModal,
} from "@/store/slices/proxiesSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { ProxyItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Network, Plus, Play, Trash2, ArrowRightLeft } from "lucide-react";
import { useTranslation } from "@/i18n";

export function ProxiesTab() {
  const dispatch = useAppDispatch();
  const { items, isLoading, testingMap, addModal } = useAppSelector((state) => state.proxies);
  const [proxyUrl, setProxyUrl] = useState("");
  const { t } = useTranslation();

  const loadProxies = async () => {
    dispatch(setLoading(true));
    try {
      const data = await api<ProxyItem[]>("/api/proxies");
      dispatch(setProxies(data || []));
    } catch {} finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    loadProxies();
  }, []);

  const handleAddProxy = async () => {
    if (!proxyUrl.trim()) return;
    dispatch(incrementBusy());
    try {
      await api("/api/proxies", {
        method: "POST",
        body: JSON.stringify({ url: proxyUrl.trim() }),
      });
      dispatch(closeAddModal());
      setProxyUrl("");
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadProxies();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleTestProxy = async (url: string) => {
    dispatch(setTestStatus({ url, status: "testing" }));
    try {
      const res = await api<{ ok: boolean; latency_ms?: number }>("/api/proxies/test", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      dispatch(setTestStatus({ url, status: res.ok ? "ok" : "failed" }));
      if (res.ok) {
        dispatch(addToast({ type: "ok", message: `${t("proxies.statuses.ok")} (${res.latency_ms || 0}ms)` }));
      } else {
        dispatch(addToast({ type: "err", message: t("common.failed") }));
      }
    } catch {
      dispatch(setTestStatus({ url, status: "failed" }));
    }
  };

  const handleDeleteProxy = async (id: number) => {
    if (!confirm(t("common.confirm") + "?")) return;
    try {
      await api(`/api/proxies/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadProxies();
    } catch {}
  };

  const handleAssignAll = async () => {
    dispatch(incrementBusy());
    try {
      await api("/api/proxies/assign-all", { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadProxies();
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
          <h2 className="text-xl font-bold text-[#f6f8fb]">{t("proxies.title")}</h2>
          <p className="text-sm text-[#778094] mt-0.5">{t("proxies.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => dispatch(openAddModal())} className="gap-2 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
            <Plus className="w-4 h-4" />
            <span>{t("proxies.addProxy")}</span>
          </Button>
          <Button variant="secondary" onClick={handleAssignAll} className="gap-2 border-[#2a3341] bg-[#181d27] text-[#e7eaf0]">
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t("proxies.autoBalance")}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-36 animate-pulse border-[#2a3341] bg-[#12161e]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-[#2a3341] bg-[#12161e]">
          <div className="w-12 h-12 rounded-full bg-[#181d27] flex items-center justify-center text-[#778094] mb-3">
            <Network className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("common.empty")}</h3>
          <p className="text-xs text-[#778094] mt-1 max-w-sm">
            {t("proxies.subtitle")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((prx) => {
            const testStatus = testingMap[prx.url];
            return (
              <Card key={prx.id} className="p-4 space-y-4 border-[#2a3341] bg-[#12161e] hover:border-[#fe2c55]/40 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-[#f6f8fb] truncate">
                      {prx.url}
                    </div>
                    <div className="text-[11px] text-[#778094]">
                      {t("proxies.boundAccounts", { count: prx.assigned_count ?? 0 })}
                    </div>
                  </div>

                  <Badge
                    variant={
                      testStatus === "ok"
                        ? "success"
                        : testStatus === "failed"
                        ? "danger"
                        : "secondary"
                    }
                  >
                    {testStatus === "testing"
                      ? t("proxies.statuses.testing")
                      : testStatus === "ok"
                      ? t("proxies.statuses.ok")
                      : testStatus === "failed"
                      ? t("proxies.statuses.failed")
                      : t("proxies.statuses.untested")}
                  </Badge>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1d2530]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTestProxy(prx.url)}
                    className="gap-1.5 text-xs text-[#38bdf8]"
                  >
                    <Play className="w-3 h-3" />
                    <span>{t("proxies.testLatency")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => prx.id !== undefined && handleDeleteProxy(prx.id)}
                    className="h-7 w-7 text-[#778094] hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Proxy Modal */}
      <Dialog open={addModal.isOpen} onOpenChange={(open) => !open && dispatch(closeAddModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("proxies.addProxy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder={t("proxies.urlPlaceholder")}
              className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeAddModal())}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddProxy} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
