import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MonitorTarget, CollectionJob } from "@/types";

interface MonitorsState {
  targets: MonitorTarget[];
  collectionJobs: CollectionJob[];
  selectedJobId: number | null;
  filterGroup: string;
  filterTag: string;
  createModal: {
    isOpen: boolean;
  };
  createCollectionModal: {
    isOpen: boolean;
  };
}

const initialState: MonitorsState = {
  targets: [],
  collectionJobs: [],
  selectedJobId: null,
  filterGroup: "",
  filterTag: "",
  createModal: {
    isOpen: false,
  },
  createCollectionModal: {
    isOpen: false,
  },
};

export const monitorsSlice = createSlice({
  name: "monitors",
  initialState,
  reducers: {
    setTargets: (state, action: PayloadAction<MonitorTarget[]>) => {
      state.targets = action.payload;
    },
    setCollectionJobs: (state, action: PayloadAction<CollectionJob[]>) => {
      state.collectionJobs = action.payload;
    },
    setSelectedJobId: (state, action: PayloadAction<number | null>) => {
      state.selectedJobId = action.payload;
    },
    setFilterGroup: (state, action: PayloadAction<string>) => {
      state.filterGroup = action.payload;
    },
    setFilterTag: (state, action: PayloadAction<string>) => {
      state.filterTag = action.payload;
    },
    openCreateModal: (state) => {
      state.createModal.isOpen = true;
    },
    closeCreateModal: (state) => {
      state.createModal.isOpen = false;
    },
    openCreateCollectionModal: (state) => {
      state.createCollectionModal.isOpen = true;
    },
    closeCreateCollectionModal: (state) => {
      state.createCollectionModal.isOpen = false;
    },
  },
});

export const {
  setTargets,
  setCollectionJobs,
  setSelectedJobId,
  setFilterGroup,
  setFilterTag,
  openCreateModal,
  closeCreateModal,
  openCreateCollectionModal,
  closeCreateCollectionModal,
} = monitorsSlice.actions;

export default monitorsSlice.reducer;
