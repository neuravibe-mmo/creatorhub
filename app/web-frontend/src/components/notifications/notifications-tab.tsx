"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setChannels } from "@/store/slices/notificationsSlice";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bell, Plus, Trash2, Send, Edit, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/i18n";

const N_TEMPLATES: Record<string, string> = {
  bark: '{\n  "key": "你的Bark设备key",\n  "server": "https://api.day.app"\n}',
  dingtalk: '{\n  "webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxx",\n  "secret": "加签密钥(可选)",\n  "keyword": "关键词(可选)"\n}',
  telegram: '{\n  "bot_token": "123:abc",\n  "chat_id": "你的chat_id"\n}',
};

export function NotificationsTab() {
  const dispatch = useAppDispatch();
  const channels = useAppSelector((state) => state.notifications.channels);
  const { t } = useTranslation();

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("dingtalk");
  const [configText, setConfigText] = useState(N_TEMPLATES.dingtalk);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editConfigText, setEditConfigText] = useState("");

  const loadChannels = async () => {
    try {
      const data = await api<any[]>("/api/notifications");
      dispatch(setChannels(data || []));
    } catch {
      dispatch(setChannels([]));
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setConfigText(N_TEMPLATES[newType] || "{}");
  };

  // Add Channel
  const handleAddChannel = async () => {
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(configText || "{}");
    } catch {
      dispatch(addToast({ type: "err", message: "配置不是合法 JSON" }));
      return;
    }

    dispatch(incrementBusy("正在添加通知渠道..."));
    try {
      await api("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || type,
          type,
          config: parsedConfig,
        }),
      });
      setName("");
      dispatch(addToast({ type: "ok", message: "通知渠道已添加 ✓" }));
      loadChannels();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "添加失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Toggle Channel Enabled
  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await api(`/api/notifications/${id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
      dispatch(addToast({ type: "ok", message: enabled ? "已启用" : "已停用" }));
      loadChannels();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "操作失败" }));
    }
  };

  // Test Channel
  const handleTestChannel = async (id: number) => {
    dispatch(incrementBusy("正在发送测试推送..."));
    try {
      const res = await api<{ ok: boolean; detail?: string }>(`/api/notifications/${id}/test`, {
        method: "POST",
      });
      if (res.ok) {
        dispatch(addToast({ type: "ok", message: "测试推送已发送 ✓" }));
      } else {
        dispatch(addToast({ type: "err", message: `发送失败: ${res.detail || ""}` }));
      }
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "测试失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Delete Channel
  const handleDeleteChannel = async (id: number) => {
    if (!confirm("确定删除该通知渠道？")) return;
    try {
      await api(`/api/notifications/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: "渠道已删除" }));
      loadChannels();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "删除失败" }));
    }
  };

  // Open Edit Modal
  const openEdit = (channel: any) => {
    setEditingChannel(channel);
    setEditName(channel.name || "");
    setEditConfigText(JSON.stringify(channel.config || {}, null, 2));
    setEditOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingChannel) return;
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(editConfigText || "{}");
    } catch {
      dispatch(addToast({ type: "err", message: "配置不是合法 JSON，请修正后再保存" }));
      return;
    }

    dispatch(incrementBusy("正在更新通知渠道..."));
    try {
      await api(`/api/notifications/${editingChannel.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim() || editingChannel.type,
          config: parsedConfig,
        }),
      });
      setEditOpen(false);
      dispatch(addToast({ type: "ok", message: "通知渠道已更新 ✓" }));
      loadChannels();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "更新失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Add Channel Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1d2530]">
          <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">
            {t("notifications.title")}{" "}
            <span className="text-xs text-[#778094] font-normal">{t("notifications.subtitle")}</span>
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("notifications.channelName")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("notifications.channelNamePlaceholder")}
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("notifications.channelType")}</label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  <SelectItem value="bark">{t("notifications.types.bark")}</SelectItem>
                  <SelectItem value="dingtalk">{t("notifications.types.dingtalk")}</SelectItem>
                  <SelectItem value="telegram">{t("notifications.types.telegram")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("notifications.channelConfig")}</label>
            <Textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={4}
              spellCheck={false}
              className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
            <div className="text-[10px] text-[#778094] mt-1">{t("notifications.configHelp")}</div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <Button
              onClick={handleAddChannel}
              className="gap-1.5 h-8 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-xs text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("notifications.addBtn")}</span>
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="pt-4 border-t border-[#1d2530]" />

        {/* 2. Configured Channels List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#f6f8fb]">
              {t("notifications.configuredChannels")}{" "}
              <span className="text-[11px] text-[#778094] font-normal">{t("notifications.configuredSub")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadChannels}
              className="h-7 text-xs text-[#778094] hover:text-[#f6f8fb]"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1d2530] text-[#778094]">
                  <th className="py-2.5 px-3 font-medium">{t("notifications.cols.nameType")}</th>
                  <th className="py-2.5 px-3 font-medium">{t("notifications.cols.status")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("notifications.cols.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d2530]">
                {channels.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#778094]">
                      {t("notifications.empty")}
                    </td>
                  </tr>
                ) : (
                  channels.map((c) => (
                    <tr key={c.id} className="hover:bg-[#181d27]/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#f6f8fb]">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#181d27] border border-[#2a3341] text-[#778094] font-mono uppercase">
                            {c.type}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant={c.enabled ? "success" : "secondary"}>
                          {c.enabled ? t("autocomment.ruleActive") : t("autocomment.rulePaused")}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(c)}
                            className="h-7 text-xs"
                          >
                            {t("autocomment.btnEdit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestChannel(c.id)}
                            className="h-7 text-xs text-[#38bdf8]"
                          >
                            {t("proxies.testLatency")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(c.id, !c.enabled)}
                            className="h-7 text-xs"
                          >
                            {c.enabled ? t("autocomment.rulePaused") : t("autocomment.ruleActive")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteChannel(c.id)}
                            className="h-7 w-7 text-[#778094] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Channel Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("notifications.title")}</DialogTitle>
            <DialogDescription>
              {t("notifications.configuredSub")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("notifications.channelName")}</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={60}
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("notifications.channelConfig")}</label>
              <Textarea
                value={editConfigText}
                onChange={(e) => setEditConfigText(e.target.value)}
                rows={8}
                spellCheck={false}
                className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1d2530]">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSaveEdit} className="bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
