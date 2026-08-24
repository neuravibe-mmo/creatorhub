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

export function ContentsTab() {
  const dispatch = useAppDispatch();
  const currentPlatform = useAppSelector((state) => state.platform.currentPlatform);
  const { items, page, pageSize, total, selectedIds, filterMediaType, searchQuery } =
    useAppSelector((state) => state.contents);

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
      dispatch(addToast({ type: "ok", message: "下载已完成" }));
      loadContents();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "下载失败" }));
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
      dispatch(addToast({ type: "ok", message: "批量下载已触发" }));
      dispatch(clearSelectedIds());
      loadContents();
    } catch (e: any) {
      dispatch(addToast({ type: "err", message: e.message || "下载失败" }));
    } finally {
      dispatch(decrementBusy());
    }
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">内容列表</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            浏览所有抓取到的图文与视频作品，支持高清原图与无水印视频下载
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-blue-300 font-medium">已选择 {selectedIds.length} 项</span>
            <Button size="sm" onClick={handleBatchDownload} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>批量下载</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              placeholder="搜索作品标题或博主..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36">
            <Select
              value={filterMediaType}
              onValueChange={(v) => dispatch(setFilterMediaType(v === "all" ? "" : v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
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
            className="gap-1.5 text-xs"
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span>{allSelected ? "取消全选" : "全选当前页"}</span>
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {items.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 border-dashed">
          暂无作品数据，请先通过「作品监控」或「关键词采集」抓取内容
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isSelected = selectedIds.includes(String(item.id));
            return (
              <Card
                key={item.id}
                className={`p-3 space-y-3 group overflow-hidden transition-all ${
                  isSelected ? "border-blue-500 bg-blue-950/20" : ""
                }`}
              >
                <div className="aspect-[4/3] rounded-md bg-slate-800 overflow-hidden relative">
                  <div
                    className="w-full h-full cursor-pointer"
                    onClick={() =>
                      dispatch(
                        openLightbox({
                          images:
                            item.images && item.images.length > 0
                              ? item.images
                              : [item.cover_url || ""],
                        })
                      )
                    }
                  >
                    {item.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        {item.media_type === "video" ? (
                          <Video className="w-8 h-8" />
                        ) : (
                          <Image className="w-8 h-8" />
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => dispatch(toggleSelectId(String(item.id)))}
                    className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                    {item.media_type === "video" ? "视频" : "图集"}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-100 line-clamp-2">{item.title}</h4>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span className="truncate max-w-[120px]">@{item.author_name || "作者"}</span>
                    <span>{timeAgo(item.publish_time || item.created_at)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" />
                        {item.like_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-blue-400" />
                        {item.comment_count ?? 0}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadSingle(item)}
                      title="下载媒体"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-300 hover:text-white" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
