import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NotificationChannel } from "@/types";

interface NotificationsState {
  channels: NotificationChannel[];
  isLoading: boolean;
  channelModal: {
    isOpen: boolean;
    channel: NotificationChannel | null;
  };
}

const initialState: NotificationsState = {
  channels: [],
  isLoading: false,
  channelModal: {
    isOpen: false,
    channel: null,
  },
};

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setChannels: (state, action: PayloadAction<NotificationChannel[]>) => {
      state.channels = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    openChannelModal: (state, action: PayloadAction<NotificationChannel | null>) => {
      state.channelModal = {
        isOpen: true,
        channel: action.payload,
      };
    },
    closeChannelModal: (state) => {
      state.channelModal = {
        isOpen: false,
        channel: null,
      };
    },
  },
});

export const { setChannels, setLoading, openChannelModal, closeChannelModal } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;
