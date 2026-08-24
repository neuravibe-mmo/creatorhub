"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setSelectedAccountId,
  setActiveSubTab,
  setWorks,
  setConversations,
  setActiveConversationId,
  setMessages,
  addMessage,
  setFollowers,
  setFollowings,
  openWorkComments,
  closeWorkComments,
  HubSubTab,
} from "@/store/slices/hubSlice";
import { addToast, incrementBusy, decrementBusy, openLightbox } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User,
  Film,
  Heart,
  Send,
  Eye,
  Download,
  MessageSquare,
  Video,
  Image,
  Inbox,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function HubTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const accounts = useAppSelector((state) => state.accounts.items);
  const {
    selectedAccountId,
    activeSubTab,
    works,
    conversations,
    activeConversationId,
    messages,
    followers,
    followings,
  } = useAppSelector((state) => state.hub);
  const { t } = useTranslation();

  const [inputMsg, setInputMsg] = useState("");
  const [statsKpi, setStatsKpi] = useState<any>(null);

  // Auto select first account if available
  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.find((a) => String(a.id) === selectedAccountId))) {
      dispatch(setSelectedAccountId(String(accounts[0].id)));
    }
  }, [accounts, selectedAccountId, dispatch]);

  const loadHubData = async () => {
    if (!selectedAccountId) return;

    if (activeSubTab === "myworks") {
      api<any[]>(`/api/hub/${selectedAccountId}/works`)
        .then((data) => dispatch(setWorks(data || [])))
        .catch(() => dispatch(setWorks([])));
    } else if (activeSubTab === "dms") {
      api<any[]>(`/api/hub/${selectedAccountId}/dm/conversations`)
        .then((data) => dispatch(setConversations(data || [])))
        .catch(() => dispatch(setConversations([])));
    } else if (activeSubTab === "fans") {
      api<any[]>(`/api/hub/${selectedAccountId}/fans`)
        .then((data) => dispatch(setFollowers(data || [])))
        .catch(() => dispatch(setFollowers([])));
    } else if (activeSubTab === "follows") {
      api<any[]>(`/api/hub/${selectedAccountId}/following`)
        .then((data) => dispatch(setFollowings(data || [])))
        .catch(() => dispatch(setFollowings([])));
    } else if ((activeSubTab as string) === "stats") {
      api<any>(`/api/hub/${selectedAccountId}/stats`)
        .then((data) => setStatsKpi(data))
        .catch(() => setStatsKpi(null));
    }
  };

  useEffect(() => {
    loadHubData();
  }, [selectedAccountId, activeSubTab]);

  // Sync My Works via Patchright
  const handleSyncMyWorks = async () => {
    if (!selectedAccountId) return;
    dispatch(incrementBusy());
    try {
      await api(`/api/hub/${selectedAccountId}/sync/works`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadHubData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Sync DMs
  const handleSyncDMs = async () => {
    if (!selectedAccountId) return;
    dispatch(incrementBusy());
    try {
      await api(`/api/hub/${selectedAccountId}/sync/dm`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadHubData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Open Browser for manual interaction
  const handleOpenAccountBrowser = async () => {
    if (!selectedAccountId) return;
    dispatch(incrementBusy());
    try {
      await api(`/api/hub/${selectedAccountId}/browser/open`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleSendDM = async () => {
    if (!inputMsg.trim() || !activeConversationId || !selectedAccountId) return;
    const text = inputMsg.trim();
    setInputMsg("");
    try {
      await api(`/api/hub/${selectedAccountId}/dm/${activeConversationId}/send`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      dispatch(
        addMessage({
          conversationId: activeConversationId,
          message: {
            id: String(Date.now()),
            sender_id: "self",
            is_self: true,
            content: text,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    }
  };

  const tabs = [
    { id: "myworks" as HubSubTab, label: t("contents.title"), icon: Film, count: works.length },
    { id: "follows" as HubSubTab, label: t("hub.stats.following"), icon: User, count: followings.length },
    { id: "fans" as HubSubTab, label: t("hub.stats.followers"), icon: Heart, count: followers.length },
    { id: "dms" as HubSubTab, label: t("comments.title"), icon: Send, count: conversations.length },
    { id: "stats" as any, label: t("overview.stats.contents"), icon: Eye, count: 0 },
  ];

  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  return (
    <div className="space-y-4">
      {/* Main Container Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-lg space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1d2530]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-[#f6f8fb]">
                {t("hub.tabs.accounts")}{" "}
                <span className="text-xs text-[#778094] font-normal">
                  {t("pageContext.hub.desc")}
                </span>
              </div>
            </div>
          </div>

          <div className="w-64">
            <Select
              value={selectedAccountId}
              onValueChange={(val) => dispatch(setSelectedAccountId(val))}
            >
              <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("hub.unloggedInAccount")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                {accounts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t("common.empty")}
                  </SelectItem>
                ) : (
                  accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nickname} ({a.platform})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-[#0b0f16] border border-[#2a3341] rounded-[10px]">
          {tabs.map((tb) => {
            const isActive = activeSubTab === tb.id;
            const Icon = tb.icon;
            return (
              <button
                key={tb.id}
                onClick={() => dispatch(setActiveSubTab(tb.id))}
                className={`px-3.5 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-[#181d27] text-[#fe2c55] border border-[#fe2c55]/40 shadow-sm"
                    : "text-[#778094] hover:text-[#f6f8fb] border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tb.label}</span>
                {tb.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#12161e] text-[#fe2c55] border border-[#2a3341]">
                    {tb.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Sub-Tab Views */}
        <div className="pt-2">
          {activeSubTab === "myworks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#778094]">
                  {t("contents.title")} ({works.length})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncMyWorks}
                    className="gap-1.5 h-8 text-xs border-[#2a3341] bg-[#181d27]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t("common.refresh")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAccountBrowser}
                    className="gap-1.5 h-8 text-xs border-[#2a3341] bg-[#181d27] text-[#38bdf8]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t("common.openBrowser")}</span>
                  </Button>
                </div>
              </div>

              {works.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#778094] border border-dashed border-[#2a3341] rounded-[12px]">
                  {t("common.empty")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {works.map((w, idx) => (
                    <div
                      key={w.id || idx}
                      className="rounded-[12px] border border-[#2a3341] bg-[#181d27]/60 overflow-hidden space-y-2 p-3"
                    >
                      <div className="aspect-video bg-[#0b0f16] rounded-[8px] overflow-hidden relative group">
                        {w.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.cover_url}
                            alt={w.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#778094]">
                            <Film className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-[#f6f8fb] line-clamp-1">{w.title || "无标题作品"}</div>
                      <div className="flex items-center justify-between text-[11px] text-[#778094]">
                        <span>{timeAgo(w.created_at || w.publish_time)}</span>
                        <span>{w.like_count ?? 0} {t("contents.likes")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === "dms" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[380px]">
              <div className="border-r border-[#1d2530] pr-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#1d2530]">
                  <span className="text-xs font-semibold text-[#f6f8fb]">{t("comments.title")}</span>
                  <Button variant="ghost" size="sm" onClick={handleSyncDMs} className="h-7 text-xs">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#778094]">{t("common.empty")}</div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => dispatch(setActiveConversationId(c.id))}
                      className={`w-full p-2.5 rounded-[8px] text-left transition-colors flex items-center gap-2.5 ${
                        activeConversationId === c.id
                          ? "bg-[#181d27] text-[#fe2c55]"
                          : "text-[#8b94a3] hover:bg-[#181d27]/40"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0b0f16] flex items-center justify-center text-xs font-bold text-[#f6f8fb]">
                        {c.peer_name?.slice(0, 1) || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate text-[#f6f8fb]">{c.peer_name}</div>
                        <div className="text-[11px] text-[#778094] truncate">{c.last_message}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="md:col-span-2 flex flex-col justify-between p-2 space-y-3">
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px]">
                  {activeMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#778094]">
                      {t("common.empty")}
                    </div>
                  ) : (
                    activeMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.is_self ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] p-2.5 rounded-[10px] text-xs ${
                            m.is_self
                              ? "bg-[#fe2c55] text-white"
                              : "bg-[#181d27] border border-[#2a3341] text-[#f6f8fb]"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1d2530]">
                  <Input
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendDM()}
                    placeholder="输入私信内容..."
                    className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
                  />
                  <Button onClick={handleSendDM} className="h-9 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white text-xs">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {(activeSubTab === "fans" || activeSubTab === "follows") && (
            <div className="space-y-3">
              <div className="text-xs text-[#778094]">
                {activeSubTab === "fans" ? t("hub.stats.followers") : t("hub.stats.following")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(activeSubTab === "fans" ? followers : followings).map((u, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-[10px] bg-[#181d27]/60 border border-[#1d2530] flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0b0f16] border border-[#2a3341] flex items-center justify-center font-bold text-xs text-[#f6f8fb]">
                      {u.nickname?.slice(0, 1) || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#f6f8fb] truncate">{u.nickname}</div>
                      <div className="text-[10.5px] text-[#778094] truncate">ID: {u.uid || u.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
