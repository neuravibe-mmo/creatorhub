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
    dispatch(incrementBusy("正在打开浏览器抓取作品..."));
    try {
      await api(`/api/hub/${selectedAccountId}/sync/works`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: "作品同步完成" }));
      loadHubData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "同步失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Sync DMs
  const handleSyncDMs = async () => {
    if (!selectedAccountId) return;
    dispatch(incrementBusy("正在拉取最新私信..."));
    try {
      await api(`/api/hub/${selectedAccountId}/sync/dm`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: "私信已同步" }));
      loadHubData();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "同步失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Open Browser for manual interaction
  const handleOpenAccountBrowser = async () => {
    if (!selectedAccountId) return;
    dispatch(incrementBusy("正在启动独立浏览器窗口..."));
    try {
      await api(`/api/hub/${selectedAccountId}/browser/open`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: "浏览器已启动" }));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "启动失败" }));
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
      dispatch(addToast({ type: "err", message: e.message || "发送失败" }));
    }
  };

  const tabs = [
    { id: "myworks" as HubSubTab, label: "我的作品", icon: Film, count: works.length },
    { id: "follows" as HubSubTab, label: "关注", icon: User, count: followings.length },
    { id: "fans" as HubSubTab, label: "粉丝", icon: Heart, count: followers.length },
    { id: "dms" as HubSubTab, label: "私信", icon: Send, count: conversations.length },
    { id: "stats" as any, label: "数据", icon: Eye, count: 0 },
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
                账号管理 <span className="text-xs text-[#778094] font-normal">本账号的作品 / 关注 / 粉丝 / 私信</span>
              </div>
            </div>
          </div>

          <div className="w-64">
            <Select
              value={selectedAccountId}
              onValueChange={(val) => dispatch(setSelectedAccountId(val))}
            >
              <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder="未登录账号" />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                {accounts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    暂无已登录账号
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
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeSubTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => dispatch(setActiveSubTab(t.id))}
                className={`px-3.5 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive
                    ? "bg-[#fe2c55]/15 text-[#fe2c55] border border-[#fe2c55]/40 shadow-sm"
                    : "text-[#8b94a3] hover:text-[#e7eaf0] hover:bg-[#181d27] border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-[#181d27] text-[#778094]">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Not Logged In State */}
        {!selectedAccountId || accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#778094]">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="text-sm font-medium text-[#8b94a3]">请先选择已登录账号。</div>
          </div>
        ) : (
          <div className="pt-2">
            {/* Panel: My Works */}
            {activeSubTab === "myworks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] text-xs text-[#8b94a3]">
                  <span>
                    点「同步作品」用该账号登录态打开其主页抓取作品列表(小红书/快手自动走站内「我」入口;小红书首屏笔记从页面内嵌数据直读)。计数只统计当前所选账号。
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncMyWorks}
                    className="gap-1.5 text-xs text-[#e7eaf0] border-[#2a3341] bg-[#12161e] shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-[#fe2c55]" />
                    <span>同步作品</span>
                  </Button>
                </div>

                {works.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#778094]">暂无已同步作品，请点击上方「同步作品」</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {works.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-[14px] border border-[#2a3341] bg-[#181d27] p-3 space-y-2.5 hover:border-[#fe2c55]/40 transition-all group overflow-hidden"
                      >
                        <div
                          className="aspect-[3/4] rounded-[10px] bg-[#0b0f16] overflow-hidden relative cursor-zoom-in"
                          onClick={() =>
                            dispatch(
                              openLightbox({
                                images: w.images && w.images.length > 0 ? w.images : [w.cover_url || ""],
                              })
                            )
                          }
                        >
                          {w.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={w.cover_url}
                              alt={w.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#778094]">
                              {w.media_type === "video" ? <Video className="w-8 h-8" /> : <Image className="w-8 h-8" />}
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                            {w.media_type === "video" ? "视频" : "图文"}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-[#f6f8fb] line-clamp-2">{w.title}</h4>
                          <div className="flex items-center justify-between text-[11px] text-[#778094] mt-2">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-[#fe2c55]" />
                              {w.like_count ?? 0}
                            </span>
                            <span>{timeAgo(w.publish_time || w.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Panel: DMs */}
            {activeSubTab === "dms" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] text-xs text-[#8b94a3]">
                  <span>
                    点「同步」拉取会话列表，打开会话后自动加载完整聊天记录。发消息使用「打开浏览器收发」。
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncDMs}
                      className="gap-1.5 text-xs text-[#e7eaf0] border-[#2a3341] bg-[#12161e]"
                    >
                      <Download className="w-3.5 h-3.5 text-[#fe2c55]" />
                      <span>同步私信</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleOpenAccountBrowser}
                      className="gap-1.5 text-xs bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>打开浏览器收发</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[520px]">
                  <div className="border border-[#2a3341] bg-[#181d27] rounded-[12px] p-2 overflow-y-auto space-y-1">
                    {conversations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#778094]">暂无会话</div>
                    ) : (
                      conversations.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => dispatch(setActiveConversationId(c.id))}
                          className={`p-3 rounded-[10px] flex items-center gap-3 cursor-pointer transition-colors ${
                            activeConversationId === c.id
                              ? "bg-[#fe2c55]/15 border border-[#fe2c55]/40 text-[#f6f8fb]"
                              : "hover:bg-[#202632] text-[#8b94a3]"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#12161e] border border-[#2a3341] flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[#778094]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-[#e7eaf0] truncate">{c.peer_name || "用户"}</div>
                            <div className="text-[11px] text-[#778094] truncate mt-0.5">{c.last_message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="md:col-span-2 border border-[#2a3341] bg-[#181d27] rounded-[12px] p-4 flex flex-col justify-between">
                    {activeConversationId ? (
                      <>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {activeMessages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex ${m.is_self ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] px-3.5 py-2 rounded-xl text-xs ${
                                  m.is_self
                                    ? "bg-[#fe2c55] text-white rounded-br-none"
                                    : "bg-[#12161e] border border-[#2a3341] text-[#e7eaf0] rounded-bl-none"
                                }`}
                              >
                                <p>{m.content}</p>
                                <span className="block text-[9px] opacity-70 text-right mt-1 font-mono">
                                  {timeAgo(m.timestamp)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-[#1d2530]">
                          <Input
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendDM()}
                            placeholder="输入私信内容…"
                            className="bg-[#0b0f16] border-[#2a3341] text-xs h-9"
                          />
                          <Button onClick={handleSendDM} className="gap-1.5 h-9 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-xs">
                            <Send className="w-3.5 h-3.5" />
                            <span>发送</span>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#778094] text-xs space-y-2">
                        <Send className="w-8 h-8 opacity-40 text-[#fe2c55]" />
                        <span>选择左侧会话查看消息</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Follows */}
            {activeSubTab === "follows" && (
              <div className="space-y-4">
                <div className="p-8 text-center text-xs text-[#778094]">
                  关注列表通过登录态自动同步
                </div>
              </div>
            )}

            {/* Panel: Fans */}
            {activeSubTab === "fans" && (
              <div className="space-y-4">
                <div className="p-8 text-center text-xs text-[#778094]">
                  粉丝列表通过登录态自动同步
                </div>
              </div>
            )}

            {/* Panel: Stats */}
            {activeSubTab === ("stats" as any) && (
              <div className="space-y-4">
                <div className="p-8 text-center text-xs text-[#778094]">
                  本账号数据趋势由后台引擎在账号体检时逐日快照
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
