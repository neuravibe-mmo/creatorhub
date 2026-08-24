"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { addToast, incrementBusy, decrementBusy } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Check, Eye, EyeOff, Info, Zap } from "lucide-react";

export function SettingsTab() {
  const dispatch = useAppDispatch();

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
    setDlMsg("保存中…");
    dispatch(incrementBusy("正在保存下载设置..."));
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
      setDlMsg("已保存 ✓ 新作品将按此设置下载");
      dispatch(addToast({ type: "ok", message: "下载设置已保存" }));
    } catch (e: any) {
      setDlMsg("失败: " + e.message);
      dispatch(addToast({ type: "err", message: e.message || "保存失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Test AI Connection
  const handleTestAi = async () => {
    setAiMsg("测试中…");
    dispatch(incrementBusy("正在测试大模型连通性..."));
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
        setAiMsg("连通正常 ✓");
        dispatch(addToast({ type: "ok", message: "大模型连通正常 ✓" }));
      } else {
        setAiMsg("连通失败: " + (res.error || ""));
        dispatch(addToast({ type: "err", message: `连通失败: ${res.error || ""}` }));
      }
    } catch (e: any) {
      setAiMsg("失败: " + e.message);
      dispatch(addToast({ type: "err", message: e.message || "测试失败" }));
      setAiTestResult({ ok: false, error: e.message });
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Save AI Settings
  const handleSaveAiSettings = async () => {
    setAiMsg("保存中…");
    dispatch(incrementBusy("正在保存 AI 设置..."));
    try {
      const body: any = {
        ai_enabled: aiEnabled,
        ai_base_url: aiBaseUrl.trim(),
        ai_model: aiModel.trim(),
        ai_temperature: aiTemperature.trim() || "0.9",
        ai_prompt: aiPrompt,
      };
      if (aiApiKey.trim()) {
        body.ai_api_key = aiApiKey.trim();
      }

      const res = await api<any>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setAiApiKey("");
      setAiApiKeySet(!!res.ai_api_key_set);
      setAiMsg(`已保存 ✓ ${aiEnabled ? "(规则勾选「用 AI」即生效)" : "(当前未启用)"}`);
      dispatch(
        addToast({
          type: "ok",
          message: `AI 设置已保存 ✓ ${aiEnabled ? "(规则勾选「用 AI」即生效)" : "(当前未启用)"}`,
        })
      );
    } catch (e: any) {
      setAiMsg("失败: " + e.message);
      dispatch(addToast({ type: "err", message: e.message || "保存失败" }));
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
            下载设置 <span className="text-xs text-[#778094] font-normal">全局默认</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">默认下载目录</label>
            <Input
              value={downloadDir}
              onChange={(e) => setDownloadDir(e.target.value)}
              placeholder="例如 D:\douyin\downloads；留空使用 ./data/media"
              className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
            <div className="text-[10px] text-[#778094] mt-1">系统会在该目录下按作者昵称自动创建子文件夹</div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">默认视频画质</label>
            <Select value={videoQuality} onValueChange={setVideoQuality}>
              <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="highest">原画 / 最高</SelectItem>
                <SelectItem value="1080">1080P</SelectItem>
                <SelectItem value="720">720P</SelectItem>
                <SelectItem value="540">540P</SelectItem>
                <SelectItem value="lowest">最低省流</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-[10px] text-[#778094] mt-1">单个监控目标可单独覆盖</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[#34d399] font-medium">{dlMsg}</span>
          <Button
            onClick={handleSaveDownloadSettings}
            className="gap-1.5 h-8 bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存下载设置</span>
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
            大模型 API <span className="text-xs text-[#778094] font-normal">自动评论文案生成(OpenAI 兼容接口)</span>
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
              <div className="font-semibold text-xs text-[#f6f8fb]">启用大模型生成文案</div>
              <div className="text-[11px] text-[#778094]">关闭后只使用规则中的本地模板库</div>
            </div>
          </label>

          {/* Form Grid 4 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">接口地址</label>
              <Input
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">模型名称</label>
              <Input
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="deepseek-chat / qwen-plus / gpt-4o-mini"
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">API Key</label>
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
              <div className="text-[10px] text-[#778094] mt-1">仅保存在本地数据库，不会回显</div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">生成温度</label>
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
              <div className="text-[10px] text-[#778094] mt-1">建议 0.7–1.0；数值越高表达越多</div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">提示词模板</label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="留空使用内置提示词"
              rows={3}
              className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
            <div className="text-[10px] text-[#778094] mt-1">
              可用变量：{"{source_text}"}、{"{nick}"}、{"{kw}"}、{"{platform}"}、{"{kind_label}"}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] text-xs text-[#8b94a3]">
            <Info className="w-4 h-4 shrink-0 text-[#38bdf8] mt-0.5" />
            <span>
              兼容 OpenAI <code className="text-[#38bdf8] bg-[#0b0f16] px-1 py-0.5 rounded">/chat/completions</code> 的服务。调用失败时会自动回退到当前规则的模板库。
            </span>
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
                <span>测试连通性</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAiSettings}
                className="gap-1.5 text-xs bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                <span>保存 AI 设置</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
