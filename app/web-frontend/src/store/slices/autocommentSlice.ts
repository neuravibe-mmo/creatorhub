import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AutoCommentRule, AutoCommentTask } from "@/types";

interface AutoCommentState {
  rules: AutoCommentRule[];
  tasks: AutoCommentTask[];
  ruleEditorModal: {
    isOpen: boolean;
    rule: AutoCommentRule | null;
  };
}

const initialState: AutoCommentState = {
  rules: [],
  tasks: [],
  ruleEditorModal: {
    isOpen: false,
    rule: null,
  },
};

export const autocommentSlice = createSlice({
  name: "autocomment",
  initialState,
  reducers: {
    setRules: (state, action: PayloadAction<AutoCommentRule[]>) => {
      state.rules = action.payload;
    },
    setTasks: (state, action: PayloadAction<AutoCommentTask[]>) => {
      state.tasks = action.payload;
    },
    openRuleEditor: (state, action: PayloadAction<AutoCommentRule | null>) => {
      state.ruleEditorModal = {
        isOpen: true,
        rule: action.payload,
      };
    },
    closeRuleEditor: (state) => {
      state.ruleEditorModal = {
        isOpen: false,
        rule: null,
      };
    },
  },
});

export const { setRules, setTasks, openRuleEditor, closeRuleEditor } = autocommentSlice.actions;
export default autocommentSlice.reducer;
