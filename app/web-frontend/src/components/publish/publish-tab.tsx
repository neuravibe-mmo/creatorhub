"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setTasks, setLoading, closeCrossPlatformModal } from "@/store/slices/publishSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { PublishTask } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Upload, Clock, Sparkles, Hash } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export function PublishTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const accounts = useAppSelector((state) => state.accounts.items);
  const { tasks, isLoading, crossPlatformModal } = useAppSelector((state) => state.publish);

  const [accountId, setAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [tags, setTags] = useState("");

  const loadTasks = async () => {
    dispatch(setLoading(true));
    try {
      const data = await api<PublishTask[]>(`/api/publish/tasks?platform=${currentPlatform}`);
      dispatch(setTasks(data || []));
    } catch {} finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    loadTasks();
  }, [currentPlatform]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(String(accounts[0].id));
    }
  }, [accounts, accountId]);

  const handleSubmitPublish = async () => {
    if (!title.trim() || !accountId) {
      dispatch(addToast({ type: "err", message: "请填写标题并选择发布账号" }));
      return;
    }

    dispatch(incrementBusy("正在提交发布任务..."));
    try {
      const tagList = tags
        .split(/[,\s#]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      await api("/api/publish/tasks", {
        method: "POST",
        body: JSON.stringify({
          platform: currentPlatform,
          account_id: accountId,
          title: title.trim(),
          desc: desc.trim(),
          media_type: mediaType,
          tags: tagList,
          files: [],
        }),
      });

      dispatch(addToast({ type: "ok", message: "发布任务已创建" }));
      setTitle("");
      setDesc("");
      setTags("");
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "创建任务失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-100">发布管理</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          创建作品发布任务，支持多图与视频上传、自动标签插入及定时发布
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Publish Form */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-100">新建发布</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">发布账号</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择发布账号" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nickname} ({a.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">作品标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="填写引人入胜的标题..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">作品文案 / 描述</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="详细文案内容..."
                className="min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">话题标签 (以空格或逗号分隔)</label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="美食 日常 探店"
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSubmitPublish} className="w-full gap-2">
                <Send className="w-4 h-4" />
                <span>立即发布 / 提交排队</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Recent Tasks */}
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-100">任务队列</h3>
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">暂无排队中的发布任务</div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 truncate">{task.title}</span>
                    <Badge variant={task.status === "published" ? "success" : "warning"}>
                      {task.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{task.account_name || `账号 ${task.account_id}`}</span>
                    <span>{timeAgo(task.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Cross Platform Dialog */}
      <Dialog
        open={crossPlatformModal.isOpen}
        onOpenChange={(open) => !open && dispatch(closeCrossPlatformModal())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>跨平台作品同步</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-400">
              将当前作品同步到小红书等平台发布
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dispatch(closeCrossPlatformModal())}>
                取消
              </Button>
              <Button onClick={() => dispatch(closeCrossPlatformModal())}>开始跨平台发布</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
