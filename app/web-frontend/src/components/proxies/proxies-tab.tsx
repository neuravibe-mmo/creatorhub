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
import { Network, Plus, Play, Trash2, CheckCircle2, XCircle, ArrowRightLeft } from "lucide-react";

export function ProxiesTab() {
  const dispatch = useAppDispatch();
  const { items, isLoading, testingMap, addModal } = useAppSelector((state) => state.proxies);
  const [proxyUrl, setProxyUrl] = useState("");

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
    dispatch(incrementBusy("正在添加代理..."));
    try {
      await api("/api/proxies", {
        method: "POST",
        body: JSON.stringify({ url: proxyUrl.trim() }),
      });
      dispatch(closeAddModal());
      setProxyUrl("");
      dispatch(addToast({ type: "ok", message: "代理已加入代理池" }));
      loadProxies();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "添加失败" }));
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
        dispatch(addToast({ type: "ok", message: `连通正常 (${res.latency_ms || 0}ms)` }));
      } else {
        dispatch(addToast({ type: "err", message: "代理连通失败" }));
      }
    } catch {
      dispatch(setTestStatus({ url, status: "failed" }));
    }
  };

  const handleDeleteProxy = async (id: number) => {
    try {
      await api(`/api/proxies/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: "已移除代理" }));
      loadProxies();
    } catch {}
  };

  const handleAssignAll = async () => {
    dispatch(incrementBusy("正在批量分配代理..."));
    try {
      await api("/api/proxies/assign-all", { method: "POST" });
      dispatch(addToast({ type: "ok", message: "代理已均衡分配到各账号" }));
      loadProxies();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "分配失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">代理池管理</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            配置 HTTP / SOCKS5 静态或动态代理，实现账号多出口 IP 隔离与防关联
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => dispatch(openAddModal())} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>加入代理池</span>
          </Button>
          <Button variant="secondary" onClick={handleAssignAll} className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            <span>为未配账号批量分配</span>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 border-dashed">
          代理池为空，添加代理可有效降低账号风控风险
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p, idx) => {
            const status = testingMap[p.url];
            return (
              <Card key={p.id || idx} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-400" />
                    <span className="font-mono text-xs text-slate-300 font-semibold truncate max-w-[200px]">
                      {p.url}
                    </span>
                  </div>
                  {status === "ok" ? (
                    <Badge variant="success">正常</Badge>
                  ) : status === "failed" ? (
                    <Badge variant="danger">失效</Badge>
                  ) : (
                    <Badge variant="secondary">{p.protocol || "HTTP"}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                  <span>已分配账号: {p.assigned_count ?? 0}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestProxy(p.url)}
                      loading={status === "testing"}
                      className="text-xs"
                    >
                      测试
                    </Button>
                    <button
                      onClick={() => p.id && handleDeleteProxy(p.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
            <DialogTitle>加入代理池</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="http://user:pass@host:port 或 socks5://host:port"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeAddModal())}>
                取消
              </Button>
              <Button onClick={handleAddProxy}>确认加入</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
