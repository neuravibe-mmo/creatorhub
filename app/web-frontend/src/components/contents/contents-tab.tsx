"use client";

import React, { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setContents,
  setPage,
  toggleSelectId,
  selectAllIds,
  clearSelectedIds,
  setFilterMediaType,
  setSearchQuery,
} from "@/store/slices/contentsSlice";
import { addToast, incrementBusy, decrementBusy, openLightbox } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { ContentItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Heart, MessageSquare, Video, Image, CheckSquare, Square, Search } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function ContentsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { items, page, pageSize, total, selectedIds, filterMediaType, searchQuery } =
    useAppSelector((state) => state.contents);
  const { t } = useTranslation();

  const loadContents = async () => {
    try {
      const params = new URLSearchParams({
        platform: currentPlatform,
        page: String(page),
        limit: String(pageSize),
      });
      if (filterMediaType) params.set("media_type", filterMediaType);
      if (searchQuery) params.set("q", searchQuery);

      const res = await api<{ items: ContentItem[]; total: number }>(`/api/contents?${params}`);
      dispatch(setContents({ items: res.items || [], total: res.total || 0 }));
    } catch {}
  };

  useEffect(() => {
    loadContents();
  }, [currentPlatform, page, filterMediaType, searchQuery]);

  const handleDownloadSingle = async (item: ContentItem) => {
    dispatch(incrementBusy("正在下载媒体文件..."));
    try {
      await api(`/api/contents/${item.id}/download`, { method: "POST" });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      loadContents();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) return;
    dispatch(incrementBusy(`正在批量下载 ${selectedIds.length} 个作品...`));
    try {
      await api("/api/contents/batch-download", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      dispatch(addToast({ type: "ok", message: t("common.success") }));
      dispatch(clearSelectedIds());
      loadContents();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || t("common.failed") }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#f6f8fb]">{t("contents.title")}</h2>
          <p className="text-sm text-[#778094] mt-0.5">{t("pageContext.contents.desc")}</p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-[#fe2c55]/10 border border-[#fe2c55]/20 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-[#fe2c55] font-medium">已选择 {selectedIds.length} 项</span>
            <Button size="sm" onClick={handleBatchDownload} className="gap-1.5 text-xs bg-[#fe2c55] hover:bg-[#fe2c55]/90 text-white">
              <Download className="w-3.5 h-3.5" />
              <span>{t("contents.downloadVideo")}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#12161e] border border-[#2a3341] rounded-[12px]">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#778094] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              placeholder={t("contents.searchTitle")}
              className="pl-9 text-xs bg-[#0b0f16] border-[#2a3341]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36">
            <Select
              value={filterMediaType}
              onValueChange={(val) => dispatch(setFilterMediaType(val === "all" ? "" : val))}
            >
              <SelectTrigger className="h-9 bg-[#0b0f16] border-[#2a3341] text-xs">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12161e] border-[#2a3341]">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="video">视频</SelectItem>
                <SelectItem value="image">图集</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              allSelected
                ? dispatch(clearSelectedIds())
                : dispatch(selectAllIds(items.map((i) => String(i.id))))
            }
            className="gap-2 text-xs border-[#2a3341] bg-[#0b0f16] text-[#8b94a3]"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-[#fe2c55]" /> : <Square className="w-4 h-4" />}
            <span>{allSelected ? "取消全选" : "全选本页"}</span>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-[#778094] border-dashed border-[#2a3341] bg-[#12161e]">
          {t("common.empty")}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isSelected = selectedIds.includes(String(item.id));
            return (
              <Card
                key={item.id}
                className={`p-3 space-y-3 relative group transition-all border-[#2a3341] bg-[#12161e] ${
                  isSelected ? "border-[#fe2c55] bg-[#fe2c55]/5" : "hover:border-[#fe2c55]/40"
                }`}
              >
                <button
                  onClick={() => dispatch(toggleSelectId(String(item.id)))}
                  className="absolute top-4 left-4 z-10 p-1.5 rounded bg-black/60 text-white"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#fe2c55]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                </button>

                <div
                  className="aspect-[3/4] bg-[#0b0f16] rounded-md overflow-hidden relative cursor-pointer"
                  onClick={() =>
                    item.images && item.images.length > 0
                      ? dispatch(openLightbox({ images: item.images }))
                      : item.cover_url && dispatch(openLightbox({ images: [item.cover_url] }))
                  }
                >
                  {item.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#778094]">
                      {item.media_type === "video" ? <Video className="w-8 h-8" /> : <Image className="w-8 h-8" />}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-xs text-[#f6f8fb] line-clamp-2" title={item.title}>
                    {item.title || "无标题作品"}
                  </div>
                  <div className="text-[11px] text-[#778094] flex items-center justify-between">
                    <span>@{item.author_name}</span>
                    <span>{timeAgo(item.publish_time)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1d2530] text-[11px] text-[#778094]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {item.like_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {item.comment_count ?? 0}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownloadSingle(item)}
                    className="h-7 w-7 text-[#778094] hover:text-[#f6f8fb]"
                    title={t("contents.downloadVideo")}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
