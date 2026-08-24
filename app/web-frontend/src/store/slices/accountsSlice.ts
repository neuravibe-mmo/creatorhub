import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Account } from "@/types";

interface AccountsState {
  items: Account[];
  isLoading: boolean;
  filterGroup: string;
  filterTag: string;
  qrModal: {
    isOpen: boolean;
    qrUrl: string;
    token: string;
    statusText: string;
    mode: "normal" | "creator";
  };
  cookieModal: {
    isOpen: boolean;
    text: string;
  };
}

const initialState: AccountsState = {
  items: [],
  isLoading: false,
  filterGroup: "",
  filterTag: "",
  qrModal: {
    isOpen: false,
    qrUrl: "",
    token: "",
    statusText: "正在生成二维码...",
    mode: "normal",
  },
  cookieModal: {
    isOpen: false,
    text: "",
  },
};

export const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<Account[]>) => {
      state.items = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setFilterGroup: (state, action: PayloadAction<string>) => {
      state.filterGroup = action.payload;
    },
    setFilterTag: (state, action: PayloadAction<string>) => {
      state.filterTag = action.payload;
    },
    openQrModal: (
      state,
      action: PayloadAction<{ mode?: "normal" | "creator"; token?: string; qrUrl?: string }>
    ) => {
      state.qrModal.isOpen = true;
      state.qrModal.mode = action.payload.mode || "normal";
      state.qrModal.token = action.payload.token || "";
      state.qrModal.qrUrl = action.payload.qrUrl || "";
      state.qrModal.statusText = "正在生成二维码...";
    },
    updateQrStatus: (
      state,
      action: PayloadAction<{ qrUrl?: string; token?: string; statusText?: string }>
    ) => {
      if (action.payload.qrUrl !== undefined) state.qrModal.qrUrl = action.payload.qrUrl;
      if (action.payload.token !== undefined) state.qrModal.token = action.payload.token;
      if (action.payload.statusText !== undefined)
        state.qrModal.statusText = action.payload.statusText;
    },
    closeQrModal: (state) => {
      state.qrModal.isOpen = false;
      state.qrModal.qrUrl = "";
      state.qrModal.token = "";
    },
    openCookieModal: (state) => {
      state.cookieModal.isOpen = true;
      state.cookieModal.text = "";
    },
    closeCookieModal: (state) => {
      state.cookieModal.isOpen = false;
      state.cookieModal.text = "";
    },
  },
});

export const {
  setAccounts,
  setLoading,
  setFilterGroup,
  setFilterTag,
  openQrModal,
  updateQrStatus,
  closeQrModal,
  openCookieModal,
  closeCookieModal,
} = accountsSlice.actions;

export default accountsSlice.reducer;
