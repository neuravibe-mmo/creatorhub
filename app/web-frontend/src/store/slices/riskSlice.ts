import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RiskSummary, RiskConfig, RiskAccountItem } from "@/types";

interface RiskState {
  summary: RiskSummary | null;
  config: RiskConfig | null;
  accounts: RiskAccountItem[];
  auditLogs: any[];
  tokenModal: {
    isOpen: boolean;
  };
  auditModal: {
    isOpen: boolean;
  };
}

const initialState: RiskState = {
  summary: null,
  config: null,
  accounts: [],
  auditLogs: [],
  tokenModal: {
    isOpen: false,
  },
  auditModal: {
    isOpen: false,
  },
};

export const riskSlice = createSlice({
  name: "risk",
  initialState,
  reducers: {
    setRiskSummary: (state, action: PayloadAction<RiskSummary>) => {
      state.summary = action.payload;
    },
    setRiskConfig: (state, action: PayloadAction<RiskConfig>) => {
      state.config = action.payload;
    },
    setRiskAccounts: (state, action: PayloadAction<RiskAccountItem[]>) => {
      state.accounts = action.payload;
    },
    setAuditLogs: (state, action: PayloadAction<any[]>) => {
      state.auditLogs = action.payload;
    },
    openTokenModal: (state) => {
      state.tokenModal.isOpen = true;
    },
    closeTokenModal: (state) => {
      state.tokenModal.isOpen = false;
    },
    openAuditModal: (state) => {
      state.auditModal.isOpen = true;
    },
    closeAuditModal: (state) => {
      state.auditModal.isOpen = false;
    },
  },
});

export const {
  setRiskSummary,
  setRiskConfig,
  setRiskAccounts,
  setAuditLogs,
  openTokenModal,
  closeTokenModal,
  openAuditModal,
  closeAuditModal,
} = riskSlice.actions;

export default riskSlice.reducer;
