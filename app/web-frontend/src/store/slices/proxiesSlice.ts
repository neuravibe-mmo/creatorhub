import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProxyItem } from "@/types";

interface ProxiesState {
  items: ProxyItem[];
  isLoading: boolean;
  testingMap: Record<string, "testing" | "ok" | "failed">;
  detectedInfo: { url: string; country?: string; protocol?: string } | null;
  addModal: {
    isOpen: boolean;
  };
  importModal: {
    isOpen: boolean;
  };
}

const initialState: ProxiesState = {
  items: [],
  isLoading: false,
  testingMap: {},
  detectedInfo: null,
  addModal: {
    isOpen: false,
  },
  importModal: {
    isOpen: false,
  },
};

export const proxiesSlice = createSlice({
  name: "proxies",
  initialState,
  reducers: {
    setProxies: (state, action: PayloadAction<ProxyItem[]>) => {
      state.items = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setTestStatus: (
      state,
      action: PayloadAction<{ url: string; status: "testing" | "ok" | "failed" }>
    ) => {
      state.testingMap[action.payload.url] = action.payload.status;
    },
    setDetectedInfo: (
      state,
      action: PayloadAction<{ url: string; country?: string; protocol?: string } | null>
    ) => {
      state.detectedInfo = action.payload;
    },
    openAddModal: (state) => {
      state.addModal.isOpen = true;
    },
    closeAddModal: (state) => {
      state.addModal.isOpen = false;
      state.detectedInfo = null;
    },
    openImportModal: (state) => {
      state.importModal.isOpen = true;
    },
    closeImportModal: (state) => {
      state.importModal.isOpen = false;
    },
  },
});

export const {
  setProxies,
  setLoading,
  setTestStatus,
  setDetectedInfo,
  openAddModal,
  closeAddModal,
  openImportModal,
  closeImportModal,
} = proxiesSlice.actions;

export default proxiesSlice.reducer;
