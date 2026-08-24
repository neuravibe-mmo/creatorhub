"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Check, Eye, EyeOff, Info, Zap } from "lucide-react";
import { useTranslation } from "@/i18n";

export function SettingsTab() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // Download settings
  const [downloadDir, setDownloadDir] = useState("");
  const [videoQuality, setVideoQuality] = useState("highest");
  const [dlMsg, setDlMsg] = useState("");

  // AI settings
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiApiKeySet, setAiApiKeySet] = useState(false);
  const [aiTemperature, setAiTemperature] = useState("0.9");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiMsg, setAiMsg] = useState("");

  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; sample?: string; error?: string } | null>(null);

  const loadSettings = async () => {
    try {
      const data = await api<any>("/api/settings");
      if (data) {
        setDownloadDir(data.download_dir || "");
        setVideoQuality(data.video_quality || "highest");
        setAiEnabled(!!data.ai_enabled);
        setAiBaseUrl(data.ai_base_url || "");
        setAiModel(data.ai_model || "");
        setAiTemperature(data.ai_temperature || "0.9");
        setAiPrompt(data.ai_prompt || "");
        setAiApiKeySet(!!data.ai_api_key_set);
      }
    } catch {}
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save Download Settings
  const handleSaveDownloadSettings = async () => {
    dispatch(incrementBusy());
    try {
      const res = await api<any>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          download_dir: downloadDir.trim(),
          video_quality: videoQuality,
        }),
      });
      setDownloadDir(res.download_dir || "");
      setVideoQuality(res.video_quality || "highest");
      setDlMsg("✓");
      dispatch(addToast({ type: "ok", message: t("common.success") }));
    } catch (e: any) {
      setDlMsg(e.message || t("common.failed"));
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Test AI Connection
  const handleTestAi = async () => {
    dispatch(incrementBusy());
    try {
      const body: any = {
        base_url: aiBaseUrl.trim(),
        model: aiModel.trim(),
        prompt: aiPrompt,
        temperature: aiTemperature || "0.9",
      };
      if (aiApiKey.trim()) {
        body.api_key = aiApiKey.trim();
      }

      const res = await api<{ ok: boolean; sample?: string; error?: string }>("/api/settings/ai-test", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setAiTestResult(res);
      if (res.ok) {
        setAiMsg("✓");
        dispatch(addToast({ type: "ok", message: t("common.success") }));
      } else {
        setAiMsg(res.error || t("common.failed"));
        dispatch(addToast({ type: "err", message: `${t("common.failed")}: ${res.error || ""}` }));
      }
    } catch (e: any) {
      setAiMsg(e.message || t("common.failed"));
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
      setAiTestResult({ ok: false, error: e.message });
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Save AI Settings
  const handleSaveAiSettings = async () => {
    dispatch(incrementBusy());
    try {
      const body: any = {
        ai_enabled: aiEnabled,
        ai_base_url: aiBaseUrl.trim(),
        ai_model: aiModel.trim(),
        ai_temperature: aiTemperature.trim() || "0.9",
        ai_prompt: aiPrompt,
      };
      if (aiApiKey.trim()) {
        body.api_key = aiApiKey.trim();
      }

      const res = await api<any>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setAiApiKey("");
      setAiApiKeySet(!!res.ai_api_key_set);
      setAiMsg("✓");
      dispatch(addToast({ type: "ok", message: t("common.success") }));
    } catch (e: any) {
      setAiMsg(e.message || t("common.failed"));
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Download Settings Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1d2530]">
          <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
            <Download className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">
            {t("settings.downloadTitle")}{" "}
            <span className="text-xs text-[#778094] font-normal">{t("settings.downloadSub")}</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.defaultDir")}</label>
            <Input
              value={downloadDir}
              onChange={(e) => setDownloadDir(e.target.value)}
              placeholder="例如 D:\douyin\downloads；留空使用 ./data/media"
              className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
            <div className="text-[10px] text-[#778094] mt-1">{t("settings.dirHelp")}</div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.defaultQuality")}</label>
            <Select value={videoQuality} onValueChange={setVideoQuality}>
              <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="highest">{t("shareDownload.qualities.highest")}</SelectItem>
                <SelectItem value="1080">{t("shareDownload.qualities.p1080")}</SelectItem>
                <SelectItem value="720">{t("shareDownload.qualities.p720")}</SelectItem>
                <SelectItem value="540">{t("shareDownload.qualities.p540")}</SelectItem>
                <SelectItem value="lowest">{t("shareDownload.qualities.lowest")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-[10px] text-[#778094] mt-1">{t("settings.qualityHelp")}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[#34d399] font-medium">{dlMsg}</span>
          <Button
            onClick={handleSaveDownloadSettings}
            className="gap-1.5 h-8 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-xs text-white"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t("settings.saveDownload")}</span>
          </Button>
        </div>
      </div>

      {/* 2. Large Language Model (AI) API Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1d2530]">
          <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">
            {t("settings.aiTitle")}{" "}
            <span className="text-xs text-[#778094] font-normal">{t("settings.aiSub")}</span>
          </h3>
        </div>

        <div className="space-y-4">
          {/* Switch Row */}
          <label className="flex items-center gap-3 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
            />
            <div>
              <div className="font-semibold text-xs text-[#f6f8fb]">{t("settings.enableAi")}</div>
              <div className="text-[11px] text-[#778094]">{t("settings.enableAiDesc")}</div>
            </div>
          </label>

          {/* Form Grid 4 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.baseUrl")}</label>
              <Input
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.modelName")}</label>
              <Input
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="deepseek-chat / qwen-plus / gpt-4o-mini"
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.apiKey")}</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiApiKeySet ? "已保存(留空=不修改)" : "API Key"}
                  className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-2.5 text-[#778094] hover:text-[#f6f8fb]"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-[10px] text-[#778094] mt-1">{t("settings.apiKeyHelp")}</div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.temperature")}</label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={aiTemperature}
                onChange={(e) => setAiTemperature(e.target.value)}
                placeholder="0.9"
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
              <div className="text-[10px] text-[#778094] mt-1">{t("settings.tempHelp")}</div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("settings.promptTemplate")}</label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t("settings.promptPlaceholder")}
              rows={3}
              className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
            <div className="text-[10px] text-[#778094] mt-1">{t("settings.promptHelp")}</div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] text-xs text-[#8b94a3]">
            <Info className="w-4 h-4 shrink-0 text-[#38bdf8] mt-0.5" />
            <span>{t("settings.callout")}</span>
          </div>

          {/* Test AI Result */}
          {aiTestResult && (
            <div
              className={`p-3 rounded-[10px] border text-xs ${
                aiTestResult.ok
                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/30 border-rose-500/30 text-rose-300"
              }`}
            >
              {aiTestResult.ok ? (
                <div>
                  <span className="font-semibold">连通正常 ✓</span> 样例文案：
                  <b className="text-white ml-1">{aiTestResult.sample}</b>
                </div>
              ) : (
                <div>
                  <span className="font-semibold">连通失败：</span>
                  {aiTestResult.error}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#1d2530]">
            <span className="text-xs text-[#8b94a3]">{aiMsg}</span>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAi}
                className="gap-1.5 text-xs text-[#e7eaf0] border-[#2a3341] bg-[#181d27]"
              >
                <Zap className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>{t("settings.testAi")}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAiSettings}
                className="gap-1.5 text-xs bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t("settings.saveAi")}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
