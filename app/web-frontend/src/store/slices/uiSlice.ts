import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ToastItem {
  id: string;
  type: "info" | "ok" | "err";
  message: string;
}

export interface LightboxState {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface UiState {
  inFlight: number;
  busyLabel: string;
  toasts: ToastItem[];
  lightbox: LightboxState;
  confirmDialog: ConfirmDialogState | null;
}

const initialState: UiState = {
  inFlight: 0,
  busyLabel: "处理中...",
  toasts: [],
  lightbox: {
    isOpen: false,
    images: [],
    currentIndex: 0,
  },
  confirmDialog: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    incrementBusy: (state, action: PayloadAction<string | undefined>) => {
      state.inFlight += 1;
      if (action.payload) state.busyLabel = action.payload;
    },
    decrementBusy: (state) => {
      state.inFlight = Math.max(0, state.inFlight - 1);
    },
    addToast: (state, action: PayloadAction<{ type?: "info" | "ok" | "err"; message: string }>) => {
      const id = Math.random().toString(36).substring(2, 9);
      state.toasts.push({
        id,
        type: action.payload.type || "info",
        message: action.payload.message,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    openLightbox: (state, action: PayloadAction<{ images: string[]; index?: number }>) => {
      state.lightbox = {
        isOpen: true,
        images: action.payload.images,
        currentIndex: action.payload.index || 0,
      };
    },
    closeLightbox: (state) => {
      state.lightbox.isOpen = false;
      state.lightbox.images = [];
    },
    setLightboxIndex: (state, action: PayloadAction<number>) => {
      state.lightbox.currentIndex = action.payload;
    },
    openConfirm: (state, action: PayloadAction<ConfirmDialogState>) => {
      state.confirmDialog = action.payload;
    },
    closeConfirm: (state) => {
      state.confirmDialog = null;
    },
  },
});

export const {
  incrementBusy,
  decrementBusy,
  addToast,
  removeToast,
  openLightbox,
  closeLightbox,
  setLightboxIndex,
  openConfirm,
  closeConfirm,
} = uiSlice.actions;

export default uiSlice.reducer;
