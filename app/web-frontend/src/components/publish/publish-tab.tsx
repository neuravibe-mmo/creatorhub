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
import { Send, Upload, Sparkles, Hash } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function PublishTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const accounts = useAppSelector((state) => state.accounts.items);
  const { tasks, isLoading } = useAppSelector((state) => state.publish);
  const { t } = useTranslation();

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
        .map((tg) => tg.trim())
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

      dispatch(addToast({ type: "ok", message: t("common.success") }));
      setTitle("");
      setDesc("");
      setTags("");
      loadTasks();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#f6f8fb]">{t("publish.title")}</h2>
        <p className="text-sm text-[#778094] mt-0.5">{t("publish.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Publish Form */}
        <Card className="lg:col-span-2 p-5 space-y-4 border-[#2a3341] bg-[#12161e]">
          <h3 className="text-base font-semibold text-[#f6f8fb]">{t("publish.title")}</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#778094] block mb-1.5">{t("publish.selectAccount")}</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue placeholder={t("publish.selectAccount")} />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nickname} ({a.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#778094] block mb-1.5">{t("publish.postTitle")}</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("publish.titlePlaceholder")}
                className="bg-[#0b0f16] border-[#2a3341] text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#778094] block mb-1.5">{t("publish.postContent")}</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={t("publish.contentPlaceholder")}
                className="min-h-[100px] bg-[#0b0f16] border-[#2a3341] text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#778094] block mb-1.5">{t("publish.topics")}</label>
              <div className="relative">
                <Hash className="w-4 h-4 text-[#778094] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("publish.tagsPlaceholder")}
                  className="pl-9 bg-[#0b0f16] border-[#2a3341] text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSubmitPublish} className="gap-2 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white text-xs">
                <Send className="w-4 h-4" />
                <span>{t("publish.publishNow")}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Tasks Stream */}
        <Card className="p-5 space-y-4 border-[#2a3341] bg-[#12161e]">
          <h3 className="text-sm font-semibold text-[#f6f8fb]">{t("hub.tabs.publishHistory")}</h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#778094]">{t("common.empty")}</div>
            ) : (
              tasks.map((tsk) => (
                <div
                  key={tsk.id}
                  className="p-3 rounded-[8px] bg-[#181d27]/60 border border-[#1d2530] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#f6f8fb] truncate max-w-[160px]">
                      {tsk.title}
                    </span>
                    <Badge variant={tsk.status === "published" ? "success" : "secondary"}>
                      {tsk.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-[#778094] truncate">{tsk.desc || "无描述"}</div>
                  <div className="text-[10px] text-[#778094]">{timeAgo(tsk.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
