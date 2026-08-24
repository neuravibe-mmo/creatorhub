import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
  settings: Record<string, any>;
  isLoading: boolean;
}

const initialState: SettingsState = {
  settings: {},
  isLoading: false,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Record<string, any>>) => {
      state.settings = action.payload;
    },
    updateSettingItem: (state, action: PayloadAction<{ key: string; value: any }>) => {
      state.settings[action.payload.key] = action.payload.value;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setSettings, updateSettingItem, setLoading } = settingsSlice.actions;
export default settingsSlice.reducer;
