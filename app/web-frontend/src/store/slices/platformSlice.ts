import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Platform, TabType } from "@/types";

interface PlatformState {
  currentPlatform: Platform;
  currentTab: TabType;
  badges: Record<string, number>;
}

const initialState: PlatformState = {
  currentPlatform: "douyin",
  currentTab: "overview",
  badges: {},
};

export const platformSlice = createSlice({
  name: "platform",
  initialState,
  reducers: {
    setPlatform: (state, action: PayloadAction<Platform>) => {
      state.currentPlatform = action.payload;
    },
    setTab: (state, action: PayloadAction<TabType>) => {
      state.currentTab = action.payload;
    },
    setBadge: (state, action: PayloadAction<{ key: string; count: number }>) => {
      state.badges[action.payload.key] = action.payload.count;
    },
    setBadges: (state, action: PayloadAction<Record<string, number>>) => {
      state.badges = { ...state.badges, ...action.payload };
    },
  },
});

export const { setPlatform, setTab, setBadge, setBadges } = platformSlice.actions;
export default platformSlice.reducer;
