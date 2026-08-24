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

export function CommentsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { watches, activeWatchId, comments, replyModal, addWatchModal } = useAppSelector(
    (state) => state.comments
  );

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
      dispatch(addToast({ type: "ok", message: "评论监控已添加" }));
      loadWatches();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "添加失败" }));
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
      dispatch(addToast({ type: "ok", message: "回复已发送" }));
      loadComments();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "回复失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">评论监控</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            实时抓取指定作品的最新评论，分析互动情感并支持一键回复
          </p>
        </div>

        <Button onClick={() => dispatch(openAddWatchModal())} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>添加作品监控</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Watches List */}
        <Card className="p-3 space-y-2 max-h-[650px] overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-400 px-2 py-1 uppercase">监控作品</h3>
          {watches.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">暂无监控中的作品</div>
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
                  <div className="font-semibold text-sm truncate">{w.work_title || `作品 ${w.work_id}`}</div>
                  <div className="text-xs text-slate-500 mt-0.5">评论: {w.total_comments ?? 0} 条</div>
                </div>
                <Badge variant="outline">{w.platform}</Badge>
              </div>
            ))
          )}
        </Card>

        {/* Comments Feed */}
        <Card className="md:col-span-2 p-4 flex flex-col min-h-[500px]">
          {comments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              暂无评论数据或请选择左侧作品
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-850 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-slate-200">{c.author_name}</div>
                    <span className="text-xs text-slate-500">{timeAgo(c.create_time)}</span>
                  </div>

                  <p className="text-sm text-slate-300">{c.content}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      {c.like_count ?? 0} 赞
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch(openReplyModal(c))}
                      className="gap-1 text-xs"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>回复</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Watch Modal */}
      <Dialog open={addWatchModal.isOpen} onOpenChange={(open) => !open && dispatch(closeAddWatchModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加作品评论监控</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={watchUrl}
              onChange={(e) => setWatchUrl(e.target.value)}
              placeholder="输入目标作品分享链接或 ID"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeAddWatchModal())}>
                取消
              </Button>
              <Button onClick={handleAddWatch}>开始监控</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply Modal */}
      <Dialog open={replyModal.isOpen} onOpenChange={(open) => !open && dispatch(closeReplyModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>回复评论</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {replyModal.comment && (
              <div className="p-3 rounded-lg bg-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-slate-200">@{replyModal.comment.author_name}: </span>
                {replyModal.comment.content}
              </div>
            )}
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="输入回复内容..."
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeReplyModal())}>
                取消
              </Button>
              <Button onClick={handleSendReply}>发送回复</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
