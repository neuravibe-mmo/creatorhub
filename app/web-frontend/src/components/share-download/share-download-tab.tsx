"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { addToast, incrementBusy, decrementBusy, openLightbox } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  Zap,
  Eye,
  Trash2,
  RefreshCw,
  Film,
  Image as ImageIcon,
  FileText,
  Folder,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Heart,
  MessageSquare,
  Clock,
  ExternalLink,
  CheckSquare,
  Square,
  Link2,
} from "lucide-react";
import { humanBytes, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

const PF_NAMES: Record<string, string> = {
  douyin: "抖音",
  xhs: "小红书",
  kuaishou: "快手",
  shipinhao: "视频号",
  wechat: "视频号",
  bilibili: "B站",
  youtube: "YouTube",
  generic: "通用站点",
};

export function ShareDownloadTab() {
  const dispatch = useAppDispatch();
  const accounts = useAppSelector((state) => state.accounts.items);
  const { t } = useTranslation();

  // Form states
  const [shareText, setShareText] = useState("");
  const [quality, setQuality] = useState("highest");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [outputDir, setOutputDir] = useState("");
  const [maxSizeMb, setMaxSizeMb] = useState<number>(0);

  // Option toggles
  const [saveMetadata, setSaveMetadata] = useState(false);
  const [saveThumbnail, setSaveThumbnail] = useState(true);
  const [saveSubtitles, setSaveSubtitles] = useState(false);
  const [allLinks, setAllLinks] = useState(false);

  // Parsed candidates
  const [parsedLinks, setParsedLinks] = useState<any[]>([]);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState(0);

  // Result inspect state
  const [inspectResult, setInspectResult] = useState<any>(null);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPlatform, setHistoryPlatform] = useState("");
  const [historyType, setHistoryType] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState("");

  const loadHistory = async () => {
    try {
      const data = await api<any[]>("/api/share-download/history?limit=500");
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Parse links
  const handleParseLinks = async () => {
    if (!shareText.trim()) {
      dispatch(addToast({ type: "err", message: t("shareDownload.placeholder") }));
      return;
    }
    dispatch(incrementBusy());
    try {
      const res = await api<{ links: any[]; count: number }>("/api/share-download/links", {
        method: "POST",
        body: JSON.stringify({ share_text: shareText.trim() }),
      });
      setParsedLinks(res.links || []);
      setSelectedLinkIndex(0);
      if (res.count > 0) {
        dispatch(addToast({ type: "ok", message: t("common.success") }));
      } else {
        dispatch(addToast({ type: "err", message: t("common.failed") }));
      }
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const buildRequestBody = (download: boolean) => {
    return {
      share_text: shareText.trim(),
      download,
      all_links: allLinks,
      link_index: selectedLinkIndex,
      quality,
      output_dir: outputDir.trim() || null,
      save_metadata: saveMetadata,
      save_thumbnail: saveThumbnail,
      save_subtitles: saveSubtitles,
      max_filesize_mb: maxSizeMb > 0 ? maxSizeMb : 0,
      account_id: selectedAccountId ? Number(selectedAccountId) : null,
    };
  };

  // Inspect link only
  const handleInspect = async () => {
    if (!shareText.trim()) {
      dispatch(addToast({ type: "err", message: t("shareDownload.placeholder") }));
      return;
    }
    dispatch(incrementBusy());
    try {
      const res = await api<any>("/api/share-download", {
        method: "POST",
        body: JSON.stringify(buildRequestBody(false)),
      });
      setInspectResult(res);
      dispatch(addToast({ type: "ok", message: t("common.success") }));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Start Download
  const handleStartDownload = async () => {
    if (!shareText.trim()) {
      dispatch(addToast({ type: "err", message: t("shareDownload.placeholder") }));
      return;
    }
    dispatch(incrementBusy());
    try {
      const res = await api<any>("/api/share-download", {
        method: "POST",
        body: JSON.stringify(buildRequestBody(true)),
      });
      setInspectResult(res);
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadHistory();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Delete History Row
  const handleDeleteHistory = async (id: number) => {
    try {
      await api(`/api/share-download/history/${id}`, { method: "DELETE" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadHistory();
      setSelectedHistoryIds((prev) => prev.filter((i) => i !== id));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedHistoryIds.length === 0) return;
    if (!confirm(t("common.confirm") + "?")) return;
    dispatch(incrementBusy());
    try {
      await api("/api/share-download/history/batch-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedHistoryIds }),
      });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      setSelectedHistoryIds([]);
      loadHistory();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  // Reveal Local Path
  const handleRevealPath = async (id: number) => {
    try {
      await api(`/api/share-download/history/${id}/reveal`, {
        method: "POST",
      });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    }
  };

  // Filter history
  const filteredHistory = history.filter((item) => {
    const q = historySearch.trim().toLowerCase();
    if (q) {
      const match =
        (item.title || "").toLowerCase().includes(q) ||
        (item.author || "").toLowerCase().includes(q) ||
        String(item.item_id || item.id || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    if (historyPlatform && item.platform !== historyPlatform) return false;
    if (historyType && item.media_type !== historyType) return false;
    if (historyStatus && item.status !== historyStatus) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAllPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedHistory.map((i) => i.id);
      setSelectedHistoryIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedHistory.map((i) => i.id));
      setSelectedHistoryIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const isAllPageSelected =
    paginatedHistory.length > 0 && paginatedHistory.every((i) => selectedHistoryIds.includes(i.id));

  // Export report
  const handleExportHistory = async (full: boolean) => {
    dispatch(incrementBusy());
    try {
      const qs = full ? "?full=true" : `?q=${encodeURIComponent(historySearch)}&platform=${historyPlatform}`;
      const response = await fetch(`/api/reports/share-download-history.xlsx${qs}`);
      if (!response.ok) throw new Error(t("common.failed"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `share_download_history_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      dispatch(addToast({ type: "ok", message: t("common.success") }));
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Download Form Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1d2530]">
          <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
            <Download className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#f6f8fb]">
            {t("shareDownload.cardTitle")}{" "}
            <span className="text-xs text-[#778094] font-normal">{t("shareDownload.cardSub")}</span>
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-[#778094] block mb-1">
              {t("shareDownload.cardTitle")}
            </label>
            <Textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              placeholder={t("shareDownload.placeholder")}
              rows={4}
              className="bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
            />
          </div>

          {/* 4 Column Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("shareDownload.quality")}</label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  <SelectItem value="highest">{t("shareDownload.qualities.highest")}</SelectItem>
                  <SelectItem value="1080">{t("shareDownload.qualities.p1080")}</SelectItem>
                  <SelectItem value="720">{t("shareDownload.qualities.p720")}</SelectItem>
                  <SelectItem value="540">{t("shareDownload.qualities.p540")}</SelectItem>
                  <SelectItem value="lowest">{t("shareDownload.qualities.lowest")}</SelectItem>
                  <SelectItem value="audio">{t("shareDownload.qualities.audio")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("shareDownload.accountReuse")}</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                  <SelectValue placeholder={t("shareDownload.noAccount")} />
                </SelectTrigger>
                <SelectContent className="bg-[#12161e] border-[#2a3341]">
                  <SelectItem value="none">{t("shareDownload.noAccount")}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.platform} · {a.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("shareDownload.defaultDir")}</label>
              <Input
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder={t("shareDownload.dirPlaceholder")}
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#778094] block mb-1">{t("shareDownload.maxSize")}</label>
              <Input
                type="number"
                min={0}
                max={102400}
                value={maxSizeMb}
                onChange={(e) => setMaxSizeMb(Number(e.target.value))}
                placeholder={t("shareDownload.maxSizePlaceholder")}
                className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs font-mono"
              />
            </div>
          </div>

          {/* Option Switches */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <label className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#181d27] border border-[#1d2530] cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={saveMetadata}
                onChange={(e) => setSaveMetadata(e.target.checked)}
                className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
              />
              <div>
                <div className="font-semibold text-[#f6f8fb]">{t("shareDownload.saveMetadata")}</div>
                <div className="text-[10px] text-[#778094]">{t("shareDownload.saveMetadataHelp")}</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#181d27] border border-[#1d2530] cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={saveThumbnail}
                onChange={(e) => setSaveThumbnail(e.target.checked)}
                className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
              />
              <div>
                <div className="font-semibold text-[#f6f8fb]">{t("shareDownload.saveThumbnail")}</div>
                <div className="text-[10px] text-[#778094]">{t("shareDownload.saveThumbnailHelp")}</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#181d27] border border-[#1d2530] cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={saveSubtitles}
                onChange={(e) => setSaveSubtitles(e.target.checked)}
                className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
              />
              <div>
                <div className="font-semibold text-[#f6f8fb]">{t("shareDownload.saveSubtitles")}</div>
                <div className="text-[10px] text-[#778094]">{t("shareDownload.saveSubtitlesHelp")}</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#181d27] border border-[#1d2530] cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={allLinks}
                onChange={(e) => setAllLinks(e.target.checked)}
                className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
              />
              <div>
                <div className="font-semibold text-[#f6f8fb]">{t("shareDownload.allLinks")}</div>
                <div className="text-[10px] text-[#778094]">{t("shareDownload.allLinksHelp")}</div>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleParseLinks}
              className="gap-1.5 text-xs text-[#e7eaf0] border-[#2a3341] bg-[#181d27]"
            >
              <Zap className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{t("shareDownload.parseLinks")}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleInspect}
              className="gap-1.5 text-xs text-[#e7eaf0] border-[#2a3341] bg-[#181d27]"
            >
              <Eye className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>{t("shareDownload.inspectOnly")}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleStartDownload}
              className="gap-1.5 text-xs bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("shareDownload.startDownload")}</span>
            </Button>
          </div>

          {/* Parsed candidate links list */}
          {parsedLinks.length > 0 && (
            <div className="p-3.5 rounded-[12px] bg-[#181d27] border border-[#2a3341] space-y-2 text-xs">
              <div className="font-semibold text-[#f6f8fb]">已识别 {parsedLinks.length} 条候选链接：</div>
              <div className="space-y-1.5">
                {parsedLinks.map((link, idx) => (
                  <label key={idx} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parsed-link"
                      checked={selectedLinkIndex === idx}
                      onChange={() => setSelectedLinkIndex(idx)}
                      className="mt-0.5 text-[#fe2c55]"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[#fe2c55]">
                        {PF_NAMES[link.platform] || link.platform || "通用站点"}
                      </span>
                      <span className="text-[#778094]"> · {link.host}</span>
                      <div className="font-mono text-[#8b94a3] truncate">{link.url}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Processing Result Preview (if inspect/downloaded) */}
      {inspectResult && (
        <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1d2530]">
            <Film className="w-4 h-4 text-[#34d399]" />
            <h3 className="text-sm font-semibold text-[#f6f8fb]">
              处理结果 <span className="text-xs text-[#778094] font-normal">{inspectResult.title || ""}</span>
            </h3>
          </div>
          <div className="p-3 rounded-[10px] bg-[#181d27] border border-[#1d2530] text-xs space-y-1">
            <div className="font-semibold text-[#f6f8fb]">{inspectResult.title || inspectResult.description}</div>
            <div className="text-[#8b94a3]">
              作者: {inspectResult.author || inspectResult.uploader || "—"} · 类型: {inspectResult.media_type || "视频"}
            </div>
            {inspectResult.download_path && (
              <div className="font-mono text-[#34d399] pt-1">
                保存路径: {inspectResult.download_path}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. History Table Card */}
      <div className="rounded-[16px] border border-[#2a3341] bg-[#12161e] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1d2530]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#181d27] border border-[#2a3341] flex items-center justify-center text-[#fe2c55]">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#f6f8fb]">
              {t("shareDownload.history")} <span className="text-xs text-[#778094] font-normal">{history.length}</span>
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadHistory}
            className="gap-1 text-xs text-[#778094] hover:text-[#f6f8fb]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("common.refresh")}</span>
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pb-1">
          <Input
            placeholder={t("shareDownload.searchPlaceholder")}
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="h-8 max-w-[220px] bg-[#0b0f16] border-[#2a3341] text-xs"
          />

          <div className="w-28">
            <Select value={historyPlatform} onValueChange={setHistoryPlatform}>
              <SelectTrigger className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("contents.filterPlatform")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="douyin">抖音</SelectItem>
                <SelectItem value="xhs">小红书</SelectItem>
                <SelectItem value="kuaishou">快手</SelectItem>
                <SelectItem value="shipinhao">视频号</SelectItem>
                <SelectItem value="generic">通用站点</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-28">
            <Select value={historyType} onValueChange={setHistoryType}>
              <SelectTrigger className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="video">视频</SelectItem>
                <SelectItem value="images">图文</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-28">
            <Select value={historyStatus} onValueChange={setHistoryStatus}>
              <SelectTrigger className="h-8 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="done">已下载</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedHistoryIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[#8b94a3]">{t("shareDownload.selectedCount", { count: selectedHistoryIds.length })}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedHistoryIds([])}
                className="h-7 text-xs"
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleBatchDelete}
                className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("common.batchDelete")}</span>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportHistory(false)}
              className="h-8 text-xs border-[#2a3341] bg-[#181d27] gap-1"
            >
              <Download className="w-3 h-3" />
              <span>{t("shareDownload.exportCurrent")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportHistory(true)}
              className="h-8 text-xs border-[#2a3341] bg-[#181d27] gap-1"
            >
              <Download className="w-3 h-3" />
              <span>{t("shareDownload.exportAll")}</span>
            </Button>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1d2530] text-[#778094]">
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={(e) => toggleSelectAllPage(e.target.checked)}
                    className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
                  />
                </th>
                <th className="py-2.5 px-3 font-medium w-16">{t("shareDownload.cols.cover")}</th>
                <th className="py-2.5 px-3 font-medium">{t("shareDownload.cols.desc")}</th>
                <th className="py-2.5 px-3 font-medium">{t("shareDownload.cols.type")}</th>
                <th className="py-2.5 px-3 font-medium">{t("shareDownload.cols.publishTime")}</th>
                <th className="py-2.5 px-3 font-medium">{t("shareDownload.cols.metrics")}</th>
                <th className="py-2.5 px-3 font-medium">{t("shareDownload.cols.statusActions")}</th>
                <th className="py-2.5 px-3 font-medium">{t("shareDownload.cols.localFile")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d2530]">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#778094]">
                    {t("shareDownload.emptyHistory")}
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => {
                  const isChecked = selectedHistoryIds.includes(item.id);
                  const isVideo = item.media_type === "video";
                  const cover = item.cover_url || item.thumbnail || "";

                  return (
                    <tr key={item.id} className="hover:bg-[#181d27]/60 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHistoryIds([...selectedHistoryIds, item.id]);
                            } else {
                              setSelectedHistoryIds(selectedHistoryIds.filter((i) => i !== item.id));
                            }
                          }}
                          className="rounded border-[#2a3341] bg-[#0b0f16] text-[#fe2c55]"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div
                          className="w-12 h-16 rounded-[6px] bg-[#0b0f16] overflow-hidden relative cursor-zoom-in shrink-0 border border-[#2a3341]"
                          onClick={() =>
                            cover && dispatch(openLightbox({ images: [cover] }))
                          }
                        >
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#778094]">
                              {isVideo ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="font-semibold text-[#f6f8fb] line-clamp-2">
                          {item.title || item.desc || "未命名作品"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#778094] mt-1 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-[#181d27] border border-[#2a3341] text-[#fe2c55] font-semibold">
                            {PF_NAMES[item.platform] || item.platform || "通用"}
                          </span>
                          {item.author && <span>@{item.author}</span>}
                          {item.item_id && <span>ID: {item.item_id}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#f6f8fb]">{isVideo ? "视频" : "图文"}</span>
                        {item.quality && (
                          <div className="text-[11px] text-[#778094] font-mono">{item.quality}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[#8b94a3] font-mono">
                        {item.create_time ? timeAgo(item.create_time) : "—"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 text-[11px] text-[#8b94a3]">
                          {item.like_count != null && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-[#fe2c55]" />
                              {item.like_count}
                            </span>
                          )}
                          {item.comment_count != null && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-[#38bdf8]" />
                              {item.comment_count}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.status === "done" || item.status === "success" ? "success" : "danger"}>
                            {item.status === "done" || item.status === "success" ? "已下载" : "失败"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHistory(item.id)}
                            className="h-6 w-6 text-[#778094] hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {item.local_path ? (
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 max-w-[160px]">
                              <div className="font-mono text-[11px] text-[#e7eaf0] truncate">
                                {item.local_path.split("/").pop()}
                              </div>
                              <div className="text-[10px] text-[#778094]">{humanBytes(item.file_size)}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRevealPath(item.id)}
                              className="h-7 w-7 text-[#778094] hover:text-[#f6f8fb] shrink-0"
                              title="在文件夹中定位"
                            >
                              <Folder className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[#778094]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-[#1d2530] text-xs text-[#8b94a3]">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="h-7 w-7"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-7 gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一页</span>
              </Button>
            </div>

            <div>
              第 {currentPage} / {totalPages} 页 · 共 {filteredHistory.length} 条
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-7 gap-1"
              >
                <span>下一页</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="h-7 w-7"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
