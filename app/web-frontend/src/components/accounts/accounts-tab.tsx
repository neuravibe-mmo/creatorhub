"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setAccounts,
  setLoading,
  openQrModal,
  updateQrStatus,
  closeQrModal,
  openCookieModal,
  closeCookieModal,
} from "@/store/slices/accountsSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Account } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { QrCode, KeyRound, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function AccountsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { items, isLoading, qrModal, cookieModal } = useAppSelector((state) => state.accounts);
  const [cookieText, setCookieText] = useState("");
  const { t } = useTranslation();

  const loadAccounts = async () => {
    dispatch(setLoading(true));
    try {
      const data = await api<Account[]>(`/api/accounts?platform=${currentPlatform}`);
      dispatch(setAccounts(data || []));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [currentPlatform]);

  // QR Login Polling
  const startQrLogin = async (mode: "normal" | "creator" = "normal") => {
    dispatch(openQrModal({ mode }));
    try {
      const endpoint =
        currentPlatform === "xhs"
          ? mode === "creator"
            ? "/api/xhs/creator/login/start"
            : "/api/xhs/login/start"
          : currentPlatform === "kuaishou"
          ? mode === "creator"
            ? "/api/kuaishou/creator/login/start"
            : "/api/kuaishou/login/start"
          : currentPlatform === "shipinhao"
          ? "/api/channels/login/start"
          : mode === "creator"
          ? "/api/creator/login/start"
          : "/api/login/start";

      const res = await api<{ token?: string; qrcode_url?: string; status?: string }>(endpoint, {
        method: "POST",
      });

      dispatch(
        updateQrStatus({
          token: res.token,
          qrUrl: res.qrcode_url,
          statusText: "请使用手机 App 扫码确认",
        })
      );
    } catch (e: any) {
      dispatch(updateQrStatus({ statusText: `生成二维码失败: ${e.message}` }));
    }
  };

  // Poll QR status when qrModal is open
  useEffect(() => {
    if (!qrModal.isOpen || !qrModal.token) return;

    const timer = setInterval(async () => {
      try {
        const checkEndpoint = `/api/login/status?token=${encodeURIComponent(qrModal.token)}&platform=${currentPlatform}`;
        const res = await api<{ status: string; account?: Account }>(checkEndpoint);
        if (res.status === "confirmed" || res.status === "success") {
          clearInterval(timer);
          dispatch(closeQrModal());
          dispatch(addToast({ type: "ok", message: t("common.success") }));
          loadAccounts();
        } else if (res.status === "scanned") {
          dispatch(updateQrStatus({ statusText: "已扫码，请在手机上点击确认" }));
        } else if (res.status === "expired") {
          clearInterval(timer);
          dispatch(updateQrStatus({ statusText: "二维码已过期，请重新点击登录" }));
        }
      } catch {}
    }, 2000);

    return () => clearInterval(timer);
  }, [qrModal.isOpen, qrModal.token, currentPlatform]);

  const handleSaveCookie = async () => {
    if (!cookieText.trim()) return;
    dispatch(incrementBusy(t("common.saving")));
    try {
      await api("/api/accounts/cookie", {
        method: "POST",
        body: JSON.stringify({ platform: currentPlatform, cookie: cookieText.trim() }),
      });
      dispatch(closeCookieModal());
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      setCookieText("");
      loadAccounts();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleDeleteAccount = async (id: string | number) => {
    if (!confirm(t("common.confirm") + "?")) return;
    dispatch(incrementBusy(t("common.loading")));
    try {
      await api(`/api/accounts/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadAccounts();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleSyncStats = async (id: string | number) => {
    dispatch(incrementBusy(t("common.loading")));
    try {
      await api(`/api/accounts/${id}/sync`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadAccounts();
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
          <h2 className="text-xl font-bold text-[#f6f8fb]">{t("accounts.title")}</h2>
          <p className="text-sm text-[#778094] mt-0.5">{t("accounts.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={() => startQrLogin("normal")} className="gap-2 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
            <QrCode className="w-4 h-4" />
            <span>{t("accounts.qrLogin")}</span>
          </Button>
          {currentPlatform !== "shipinhao" && (
            <Button variant="secondary" onClick={() => startQrLogin("creator")} className="gap-2 border-[#2a3341] bg-[#181d27] text-[#e7eaf0]">
              <UserPlus className="w-4 h-4" />
              <span>{t("accounts.addAccount")}</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => dispatch(openCookieModal())} className="gap-2 border-[#2a3341] bg-[#12161e] text-[#8b94a3]">
            <KeyRound className="w-4 h-4" />
            <span>{t("accounts.cookieLogin")}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-[#12161e] border-[#2a3341]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-[#2a3341] bg-[#12161e]">
          <div className="w-12 h-12 rounded-full bg-[#181d27] flex items-center justify-center text-[#778094] mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("common.empty")}</h3>
          <p className="text-xs text-[#778094] mt-1 max-w-sm">
            {t("accounts.subtitle")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((acc) => (
            <Card key={acc.id} className="p-4 space-y-4 border-[#2a3341] bg-[#12161e] hover:border-[#fe2c55]/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#181d27] border border-[#2a3341] overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#f6f8fb]">
                    {acc.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.avatar} alt={acc.nickname} className="w-full h-full object-cover" />
                    ) : (
                      acc.nickname?.slice(0, 1) || "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#f6f8fb] truncate">{acc.nickname}</div>
                    <div className="text-xs text-[#778094] font-mono truncate">
                      ID: {acc.account_id || acc.id}
                    </div>
                  </div>
                </div>

                <Badge variant={acc.is_logged_in !== false ? "success" : "danger"}>
                  {acc.is_logged_in !== false ? t("accounts.valid") : t("accounts.invalid")}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#1d2530] text-center">
                <div>
                  <div className="text-xs text-[#778094]">{t("contents.title")}</div>
                  <div className="text-sm font-semibold text-[#f6f8fb] mt-0.5">{acc.works_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-[#778094]">{t("contents.likes")}</div>
                  <div className="text-sm font-semibold text-[#f6f8fb] mt-0.5">{acc.total_favorited ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-[#778094]">{t("hub.stats.followers")}</div>
                  <div className="text-sm font-semibold text-[#f6f8fb] mt-0.5">{acc.follower_count ?? 0}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-xs text-[#778094]">
                <span>{timeAgo(acc.updated_at)}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSyncStats(acc.id)}
                    title={t("common.refresh")}
                    className="h-7 w-7"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="h-7 w-7 hover:text-rose-400"
                    title={t("common.delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR Login Dialog */}
      <Dialog open={qrModal.isOpen} onOpenChange={(open) => !open && dispatch(closeQrModal())}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>{t("accounts.qrLogin")}</DialogTitle>
            <DialogDescription>
              {qrModal.mode === "creator" ? t("accounts.creatorLoginDesc") : t("accounts.clientLoginDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="w-52 h-52 bg-white rounded-xl p-3 flex items-center justify-center shadow-lg">
              {qrModal.qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrModal.qrUrl} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#778094]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#fe2c55]" />
                  <span className="text-xs">{t("common.loading")}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-[#f6f8fb] font-medium">{qrModal.statusText}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cookie Login Dialog */}
      <Dialog open={cookieModal.isOpen} onOpenChange={(open) => !open && dispatch(closeCookieModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("accounts.cookieLogin")}</DialogTitle>
            <DialogDescription>{t("accounts.cookieLoginDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Textarea
              value={cookieText}
              onChange={(e) => setCookieText(e.target.value)}
              placeholder="sessionid=...; sid_guard=...;"
              className="min-h-[140px] font-mono text-xs bg-[#0b0f16] border-[#2a3341]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeCookieModal())}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSaveCookie} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
