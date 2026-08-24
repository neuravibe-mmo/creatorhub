import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ShareHistoryItem } from "@/types";

export interface ParsedShareLink {
  url: string;
  title?: string;
  author?: string;
  media_type?: string;
  cover_url?: string;
  formats?: { format_id: string; note?: string; ext?: string; resolution?: string }[];
  selected_format?: string;
}

interface ShareDownloadState {
  rawText: string;
  parsedLinks: ParsedShareLink[];
  selectedLinkIndex: number;
  history: ShareHistoryItem[];
  selectedHistoryIds: number[];
  page: number;
  pageSize: number;
  total: number;
  isParsing: boolean;
}

const initialState: ShareDownloadState = {
  rawText: "",
  parsedLinks: [],
  selectedLinkIndex: 0,
  history: [],
  selectedHistoryIds: [],
  page: 1,
  pageSize: 10,
  total: 0,
  isParsing: false,
};

export const shareDownloadSlice = createSlice({
  name: "shareDownload",
  initialState,
  reducers: {
    setRawText: (state, action: PayloadAction<string>) => {
      state.rawText = action.payload;
    },
    setParsedLinks: (state, action: PayloadAction<ParsedShareLink[]>) => {
      state.parsedLinks = action.payload;
      state.selectedLinkIndex = 0;
    },
    setSelectedLinkIndex: (state, action: PayloadAction<number>) => {
      state.selectedLinkIndex = action.payload;
    },
    updateLinkFormat: (state, action: PayloadAction<{ index: number; format: string }>) => {
      if (state.parsedLinks[action.payload.index]) {
        state.parsedLinks[action.payload.index].selected_format = action.payload.format;
      }
    },
    setHistory: (state, action: PayloadAction<{ items: ShareHistoryItem[]; total: number }>) => {
      state.history = action.payload.items;
      state.total = action.payload.total;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    toggleSelectHistoryId: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      if (state.selectedHistoryIds.includes(id)) {
        state.selectedHistoryIds = state.selectedHistoryIds.filter((item) => item !== id);
      } else {
        state.selectedHistoryIds.push(id);
      }
    },
    selectAllHistoryIds: (state, action: PayloadAction<number[]>) => {
      state.selectedHistoryIds = action.payload;
    },
    clearSelectedHistoryIds: (state) => {
      state.selectedHistoryIds = [];
    },
    setIsParsing: (state, action: PayloadAction<boolean>) => {
      state.isParsing = action.payload;
    },
  },
});

export const {
  setRawText,
  setParsedLinks,
  setSelectedLinkIndex,
  updateLinkFormat,
  setHistory,
  setPage,
  toggleSelectHistoryId,
  selectAllHistoryIds,
  clearSelectedHistoryIds,
  setIsParsing,
} = shareDownloadSlice.actions;

export default shareDownloadSlice.reducer;
