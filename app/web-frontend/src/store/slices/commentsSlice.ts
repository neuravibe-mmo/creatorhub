import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CommentWatch, CommentItem } from "@/types";

interface CommentsState {
  watches: CommentWatch[];
  activeWatchId: number | null;
  comments: CommentItem[];
  page: number;
  pageSize: number;
  total: number;
  filterSentiment: string;
  filterMinLikes: number;
  searchQuery: string;
  replyModal: {
    isOpen: boolean;
    comment: CommentItem | null;
  };
  addWatchModal: {
    isOpen: boolean;
  };
}

const initialState: CommentsState = {
  watches: [],
  activeWatchId: null,
  comments: [],
  page: 1,
  pageSize: 15,
  total: 0,
  filterSentiment: "",
  filterMinLikes: 0,
  searchQuery: "",
  replyModal: {
    isOpen: false,
    comment: null,
  },
  addWatchModal: {
    isOpen: false,
  },
};

export const commentsSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {
    setWatches: (state, action: PayloadAction<CommentWatch[]>) => {
      state.watches = action.payload;
    },
    setActiveWatchId: (state, action: PayloadAction<number | null>) => {
      state.activeWatchId = action.payload;
      state.page = 1;
    },
    setComments: (state, action: PayloadAction<{ items: CommentItem[]; total: number }>) => {
      state.comments = action.payload.items;
      state.total = action.payload.total;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setFilterSentiment: (state, action: PayloadAction<string>) => {
      state.filterSentiment = action.payload;
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
    openReplyModal: (state, action: PayloadAction<CommentItem>) => {
      state.replyModal.isOpen = true;
      state.replyModal.comment = action.payload;
    },
    closeReplyModal: (state) => {
      state.replyModal.isOpen = false;
      state.replyModal.comment = null;
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
  setComments,
  setPage,
  setFilterSentiment,
  setFilterMinLikes,
  setSearchQuery,
  openReplyModal,
  closeReplyModal,
  openAddWatchModal,
  closeAddWatchModal,
} = commentsSlice.actions;

export default commentsSlice.reducer;
