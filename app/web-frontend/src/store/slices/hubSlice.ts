import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DMConversation, DMMessage, ContentItem } from "@/types";

export type HubSubTab = "myworks" | "dms" | "fans" | "follows";

interface HubState {
  selectedAccountId: string;
  activeSubTab: HubSubTab;
  works: ContentItem[];
  conversations: DMConversation[];
  activeConversationId: string | null;
  messages: Record<string, DMMessage[]>;
  followers: any[];
  followings: any[];
  workComments: {
    isOpen: boolean;
    work: ContentItem | null;
    comments: any[];
  };
}

const initialState: HubState = {
  selectedAccountId: "",
  activeSubTab: "myworks",
  works: [],
  conversations: [],
  activeConversationId: null,
  messages: {},
  followers: [],
  followings: [],
  workComments: {
    isOpen: false,
    work: null,
    comments: [],
  },
};

export const hubSlice = createSlice({
  name: "hub",
  initialState,
  reducers: {
    setSelectedAccountId: (state, action: PayloadAction<string>) => {
      state.selectedAccountId = action.payload;
    },
    setActiveSubTab: (state, action: PayloadAction<HubSubTab>) => {
      state.activeSubTab = action.payload;
    },
    setWorks: (state, action: PayloadAction<ContentItem[]>) => {
      state.works = action.payload;
    },
    setConversations: (state, action: PayloadAction<DMConversation[]>) => {
      state.conversations = action.payload;
    },
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: DMMessage[] }>
    ) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: DMMessage }>
    ) => {
      const list = state.messages[action.payload.conversationId] || [];
      state.messages[action.payload.conversationId] = [...list, action.payload.message];
    },
    setFollowers: (state, action: PayloadAction<any[]>) => {
      state.followers = action.payload;
    },
    setFollowings: (state, action: PayloadAction<any[]>) => {
      state.followings = action.payload;
    },
    openWorkComments: (state, action: PayloadAction<ContentItem>) => {
      state.workComments = {
        isOpen: true,
        work: action.payload,
        comments: [],
      };
    },
    closeWorkComments: (state) => {
      state.workComments.isOpen = false;
      state.workComments.work = null;
    },
    setWorkCommentsList: (state, action: PayloadAction<any[]>) => {
      state.workComments.comments = action.payload;
    },
  },
});

export const {
  setSelectedAccountId,
  setActiveSubTab,
  setWorks,
  setConversations,
  setActiveConversationId,
  setMessages,
  addMessage,
  setFollowers,
  setFollowings,
  openWorkComments,
  closeWorkComments,
  setWorkCommentsList,
} = hubSlice.actions;

export default hubSlice.reducer;
