"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setWatches,
  setActiveWatchId,
  setComments,
  openReplyModal,
  closeReplyModal,
  openAddWatchModal,
  closeAddWatchModal,
} from "@/store/slices/commentsSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { CommentWatch, CommentItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Plus, Heart, Reply, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function CommentsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { watches, activeWatchId, comments, total, replyModal, addWatchModal } = useAppSelector(
    (state) => state.comments
  );
  const { t } = useTranslation();

  const [watchUrl, setWatchUrl] = useState("");
  const [replyText, setReplyText] = useState("");

  const loadWatches = async () => {
    try {
      const data = await api<CommentWatch[]>(`/api/comment-watches?platform=${currentPlatform}`);
      dispatch(setWatches(data || []));
      if (data && data.length > 0 && !activeWatchId) {
        dispatch(setActiveWatchId(data[0].id));
      }
    } catch {}
  };

  const loadComments = async () => {
    if (!activeWatchId) return;
    try {
      const data = await api<{ items: CommentItem[]; total: number }>(
        `/api/comments?watch_id=${activeWatchId}`
      );
      dispatch(setComments({ items: data.items || [], total: data.total || 0 }));
    } catch {}
  };

  useEffect(() => {
    loadWatches();
  }, [currentPlatform]);

  useEffect(() => {
    loadComments();
  }, [activeWatchId]);

  const handleAddWatch = async () => {
    if (!watchUrl.trim()) return;
    dispatch(incrementBusy("正在添加作品评论监控..."));
    try {
      await api("/api/comment-watches", {
        method: "POST",
        body: JSON.stringify({ platform: currentPlatform, url: watchUrl.trim() }),
      });
      dispatch(closeAddWatchModal());
      setWatchUrl("");
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadWatches();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !replyModal.comment) return;
    dispatch(incrementBusy("正在发送回复..."));
    try {
      await api(`/api/comments/${replyModal.comment.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: replyText.trim() }),
      });
      dispatch(closeReplyModal());
      setReplyText("");
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadComments();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleDeleteWatch = async (id: number) => {
    if (!confirm(t("common.confirm") + "?")) return;
    try {
      await api(`/api/comment-watches/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadWatches();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#f6f8fb]">{t("comments.title")}</h2>
          <p className="text-sm text-[#778094] mt-0.5">{t("pageContext.comments.desc")}</p>
        </div>

        <Button onClick={() => dispatch(openAddWatchModal())} className="gap-2 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
          <Plus className="w-4 h-4" />
          <span>{t("common.add")}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left List: Monitored Works */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("contents.title")}</h3>
          {watches.length === 0 ? (
            <Card className="p-8 text-center text-[#778094] text-xs border-dashed border-[#2a3341] bg-[#12161e]">
              {t("common.empty")}
            </Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {watches.map((w) => (
                <Card
                  key={w.id}
                  onClick={() => dispatch(setActiveWatchId(w.id))}
                  className={`p-3 cursor-pointer transition-all border-[#2a3341] bg-[#12161e] ${
                    activeWatchId === w.id
                      ? "border-[#fe2c55] bg-[#fe2c55]/5 shadow-sm"
                      : "hover:border-[#fe2c55]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[#f6f8fb] line-clamp-1">
                        {w.work_title || `作品 ${w.work_id}`}
                      </div>
                      <div className="text-[11px] text-[#778094] mt-0.5">
                        @{w.author_name || "未知作者"} · {w.total_comments ?? 0} {t("contents.commentsCount")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWatch(w.id);
                      }}
                      className="h-6 w-6 text-[#778094] hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right List: Comments */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("comments.title")} ({total})</h3>
          {comments.length === 0 ? (
            <Card className="p-12 text-center text-[#778094] text-xs border-dashed border-[#2a3341] bg-[#12161e]">
              {t("common.empty")}
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {comments.map((c) => (
                <Card key={c.id} className="p-4 space-y-2 border-[#2a3341] bg-[#12161e] hover:border-[#fe2c55]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-xs font-bold text-[#f6f8fb]">
                        {c.author_name?.slice(0, 1) || "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#f6f8fb]">{c.author_name}</div>
                        <div className="text-[10px] text-[#778094]">{timeAgo(c.create_time)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-[#778094]">
                        <Heart className="w-3 h-3" /> {c.like_count ?? 0}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dispatch(openReplyModal(c))}
                        className="gap-1 h-7 text-xs text-[#38bdf8]"
                      >
                        <Reply className="w-3 h-3" />
                        <span>{t("comments.reply")}</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-[#e7eaf0] pt-1">{c.content}</p>

                  {c.my_reply && (
                    <div className="p-2.5 rounded-[8px] bg-[#181d27] border border-[#1d2530] text-xs text-[#fe2c55] mt-2">
                      <span className="font-semibold">{t("comments.reply")}: </span>
                      <span className="text-[#e7eaf0]">{c.my_reply}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Watch Modal */}
      <Dialog open={addWatchModal.isOpen} onOpenChange={(open) => !open && dispatch(closeAddWatchModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("comments.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={watchUrl}
              onChange={(e) => setWatchUrl(e.target.value)}
              placeholder="输入要监控评论区的作品链接"
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

      {/* Reply Modal */}
      <Dialog open={replyModal.isOpen} onOpenChange={(open) => !open && dispatch(closeReplyModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("comments.reply")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-[#181d27] rounded-[8px] text-xs text-[#8b94a3]">
              <span className="font-semibold text-[#f6f8fb]">@{replyModal.comment?.author_name}: </span>
              {replyModal.comment?.content}
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="输入回复内容..."
              className="min-h-[100px] text-xs bg-[#0b0f16] border-[#2a3341]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeReplyModal())}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSendReply} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
