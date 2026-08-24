import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DanmakuWatch, DanmakuItem } from "@/types";

interface DanmakuState {
  watches: DanmakuWatch[];
  activeWatchId: number | null;
  danmakus: DanmakuItem[];
  page: number;
  pageSize: number;
  total: number;
  addWatchModal: {
    isOpen: boolean;
  };
}

const initialState: DanmakuState = {
  watches: [],
  activeWatchId: null,
  danmakus: [],
  page: 1,
  pageSize: 20,
  total: 0,
  addWatchModal: {
    isOpen: false,
  },
};

export const danmakuSlice = createSlice({
  name: "danmaku",
  initialState,
  reducers: {
    setWatches: (state, action: PayloadAction<DanmakuWatch[]>) => {
      state.watches = action.payload;
    },
    setActiveWatchId: (state, action: PayloadAction<number | null>) => {
      state.activeWatchId = action.payload;
      state.page = 1;
    },
    setDanmakus: (state, action: PayloadAction<{ items: DanmakuItem[]; total: number }>) => {
      state.danmakus = action.payload.items;
      state.total = action.payload.total;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    openAddWatchModal: (state) => {
      state.addWatchModal.isOpen = true;
    },
    closeAddWatchModal: (state) => {
      state.addWatchModal.isOpen = false;
    },
  },
});

export const {
  setWatches,
  setActiveWatchId,
  setDanmakus,
  setPage,
  openAddWatchModal,
  closeAddWatchModal,
} = danmakuSlice.actions;

export default danmakuSlice.reducer;
