import { configureStore } from "@reduxjs/toolkit";
import platformReducer from "./slices/platformSlice";
import uiReducer from "./slices/uiSlice";
import accountsReducer from "./slices/accountsSlice";
import hubReducer from "./slices/hubSlice";
import monitorsReducer from "./slices/monitorsSlice";
import contentsReducer from "./slices/contentsSlice";
import commentsReducer from "./slices/commentsSlice";
import danmakuReducer from "./slices/danmakuSlice";
import publishReducer from "./slices/publishSlice";
import autocommentReducer from "./slices/autocommentSlice";
import shareDownloadReducer from "./slices/shareDownloadSlice";
import proxiesReducer from "./slices/proxiesSlice";
import riskReducer from "./slices/riskSlice";
import notificationsReducer from "./slices/notificationsSlice";
import settingsReducer from "./slices/settingsSlice";

export const store = configureStore({
  reducer: {
    platform: platformReducer,
    ui: uiReducer,
    accounts: accountsReducer,
    hub: hubReducer,
    monitors: monitorsReducer,
    contents: contentsReducer,
    comments: commentsReducer,
    danmaku: danmakuReducer,
    publish: publishReducer,
    autocomment: autocommentReducer,
    shareDownload: shareDownloadReducer,
    proxies: proxiesReducer,
    risk: riskReducer,
    notifications: notificationsReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
