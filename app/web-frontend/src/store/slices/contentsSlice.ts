import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ContentItem } from "@/types";

interface ContentsState {
  items: ContentItem[];
  page: number;
  pageSize: number;
  total: number;
  selectedIds: string[];
  filterMediaType: string;
  filterDownloadStatus: string;
  filterMinLikes: number;
  searchQuery: string;
  sortBy: string;
}

const initialState: ContentsState = {
  items: [],
  page: 1,
  pageSize: 12,
  total: 0,
  selectedIds: [],
  filterMediaType: "",
  filterDownloadStatus: "",
  filterMinLikes: 0,
  searchQuery: "",
  sortBy: "latest",
};

export const contentsSlice = createSlice({
  name: "contents",
  initialState,
  reducers: {
    setContents: (state, action: PayloadAction<{ items: ContentItem[]; total: number }>) => {
      state.items = action.payload.items;
      state.total = action.payload.total;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    toggleSelectId: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.selectedIds.includes(id)) {
        state.selectedIds = state.selectedIds.filter((item) => item !== id);
      } else {
        state.selectedIds.push(id);
      }
    },
    selectAllIds: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload;
    },
    clearSelectedIds: (state) => {
      state.selectedIds = [];
    },
    setFilterMediaType: (state, action: PayloadAction<string>) => {
      state.filterMediaType = action.payload;
      state.page = 1;
    },
    setFilterDownloadStatus: (state, action: PayloadAction<string>) => {
      state.filterDownloadStatus = action.payload;
      state.page = 1;
    },
    setFilterMinLikes: (state, action: PayloadAction<number>) => {
      state.filterMinLikes = action.payload;
      state.page = 1;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.page = 1;
    },
    setSortBy: (state, action: PayloadAction<string>) => {
      state.sortBy = action.payload;
      state.page = 1;
    },
  },
});

export const {
  setContents,
  setPage,
  toggleSelectId,
  selectAllIds,
  clearSelectedIds,
  setFilterMediaType,
  setFilterDownloadStatus,
  setFilterMinLikes,
  setSearchQuery,
  setSortBy,
} = contentsSlice.actions;

export default contentsSlice.reducer;
