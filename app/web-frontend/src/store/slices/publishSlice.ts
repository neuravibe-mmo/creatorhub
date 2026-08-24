import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PublishTask, ContentItem } from "@/types";

interface PublishState {
  tasks: PublishTask[];
  isLoading: boolean;
  crossPlatformModal: {
    isOpen: boolean;
    sourceWork: ContentItem | null;
    targetPlatform: string;
  };
}

const initialState: PublishState = {
  tasks: [],
  isLoading: false,
  crossPlatformModal: {
    isOpen: false,
    sourceWork: null,
    targetPlatform: "xhs",
  },
};

export const publishSlice = createSlice({
  name: "publish",
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<PublishTask[]>) => {
      state.tasks = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    openCrossPlatformModal: (
      state,
      action: PayloadAction<{ work: ContentItem; targetPlatform?: string }>
    ) => {
      state.crossPlatformModal = {
        isOpen: true,
        sourceWork: action.payload.work,
        targetPlatform: action.payload.targetPlatform || "xhs",
      };
    },
    closeCrossPlatformModal: (state) => {
      state.crossPlatformModal.isOpen = false;
      state.crossPlatformModal.sourceWork = null;
    },
  },
});

export const {
  setTasks,
  setLoading,
  openCrossPlatformModal,
  closeCrossPlatformModal,
} = publishSlice.actions;

export default publishSlice.reducer;
