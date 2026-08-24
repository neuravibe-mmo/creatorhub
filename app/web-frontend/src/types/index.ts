export type Platform = "douyin" | "xhs" | "kuaishou" | "shipinhao";

export type TabType =
  | "overview"
  | "accounts"
  | "risk-control"
  | "collections"
  | "monitors"
  | "contents"
  | "comments"
  | "danmaku"
  | "hub"
  | "publish"
  | "autocomment"
  | "share-download"
  | "proxies"
  | "notifications"
  | "settings";

export interface Account {
  id: string | number;
  platform: Platform;
  account_id?: string;
  nickname: string;
  avatar?: string;
  status?: string;
  cookies?: string;
  group_name?: string;
  tags?: string[];
  note?: string;
  proxy?: string;
  works_count?: number;
  following_count?: number;
  follower_count?: number;
  total_favorited?: number;
  created_at?: string;
  updated_at?: string;
  risk_level?: string;
  cooling_until?: string;
  is_logged_in?: boolean;
}

export interface ProxyItem {
  id?: number;
  url: string;
  protocol?: string;
  country?: string;
  latency_ms?: number;
  status?: string;
  note?: string;
  assigned_count?: number;
}

export interface MonitorTarget {
  id: number;
  platform: Platform;
  target_id: string;
  nickname: string;
  avatar?: string;
  group_name?: string;
  tags?: string[];
  status?: string;
  last_sync_at?: string;
  works_count?: number;
  sync_frequency?: number;
}

export interface CollectionJob {
  id: number;
  platform: Platform;
  keyword: string;
  status: "pending" | "running" | "completed" | "failed";
  target_count: number;
  collected_count: number;
  created_at: string;
  completed_at?: string;
  error?: string;
  results?: ContentItem[];
}

export interface ContentItem {
  id: number | string;
  platform: Platform;
  content_id: string;
  target_id?: string;
  author_id?: string;
  author_name?: string;
  author_avatar?: string;
  title: string;
  desc?: string;
  media_type: "video" | "image" | "album";
  cover_url?: string;
  video_url?: string;
  images?: string[];
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  collected_count?: number;
  download_status?: "none" | "downloading" | "completed" | "failed";
  local_path?: string;
  created_at?: string;
  publish_time?: string;
  group_name?: string;
  tags?: string[];
}

export interface CommentWatch {
  id: number;
  platform: Platform;
  work_id: string;
  work_title?: string;
  work_cover?: string;
  author_name?: string;
  group_name?: string;
  tags?: string[];
  total_comments?: number;
  last_sync_at?: string;
}

export interface CommentItem {
  id: number | string;
  platform: Platform;
  watch_id?: number;
  comment_id: string;
  work_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  like_count: number;
  create_time: string;
  reply_count?: number;
  sentiment?: "positive" | "neutral" | "negative";
  my_reply?: string;
}

export interface DanmakuWatch {
  id: number;
  platform: Platform;
  video_id: string;
  title: string;
  cover_url?: string;
  group_name?: string;
  tags?: string[];
  danmaku_count: number;
  last_sync_at?: string;
}

export interface DanmakuItem {
  id: number;
  text: string;
  video_time_ms: number;
  send_time: string;
  color?: string;
  sender_name?: string;
}

export interface PublishTask {
  id: number;
  platform: Platform;
  account_id: string | number;
  account_name?: string;
  title: string;
  desc: string;
  media_type: "video" | "image";
  files: string[];
  cover_url?: string;
  tags?: string[];
  scheduled_at?: string;
  status: "draft" | "queued" | "publishing" | "published" | "failed";
  error_message?: string;
  created_at: string;
}

export interface AutoCommentRule {
  id: number;
  platform: Platform;
  name: string;
  mode: "auto_reply" | "auto_comment";
  account_id: number;
  target_kind: "self" | "work" | "creator" | "keyword";
  keyword?: string;
  sec_uid?: string;
  aweme_id?: string;
  xsec_token?: string;
  templates: string[];
  use_ai: boolean;
  reply_filter?: string;
  skip_keywords?: string;
  daily_cap: number;
  min_gap_seconds: number;
  max_per_run: number;
  interval_seconds: number;
  require_review: boolean;
  enabled: boolean;
  last_run_at?: string;
  last_error?: string;
  created_at?: string;
}

export interface AutoCommentTask {
  id: number;
  platform: Platform;
  rule_id?: number;
  account_id?: number;
  aweme_id?: string;
  xsec_token?: string;
  target_comment_id?: string;
  target_nick?: string;
  target_text?: string;
  content: string;
  scheduled_at?: string;
  status: "draft" | "pending" | "doing" | "uncertain" | "done" | "failed" | "canceled";
  result?: string;
  error?: string;
  method?: "manual" | "api" | "browser" | string;
  created_at: string;
  done_at?: string;
}

export interface ShareHistoryItem {
  id: number;
  source_url: string;
  title: string;
  author?: string;
  platform?: string;
  media_type: "video" | "images" | "audio";
  cover_url?: string;
  download_url?: string;
  file_path?: string;
  file_size?: number;
  created_at: string;
  status: "success" | "downloading" | "failed";
}

export interface NotificationChannel {
  id: number;
  name: string;
  type: "dingtalk" | "feishu" | "wecom" | "telegram" | "webhook";
  webhook_url: string;
  secret?: string;
  events?: string[];
  enabled: boolean;
}

export interface RiskSummary {
  counts?: {
    normal?: number;
    cooldown?: number;
    recovering?: number;
    auth_invalid?: number;
    proxy_error?: number;
    network_circuit?: number;
    write_paused?: number;
  };
  blocked_tasks?: number;
  risk_events_today?: number;
  abnormal?: number;
}

export interface RiskAccountItem {
  account_id: number;
  nickname: string;
  platform: Platform;
  status: string;
  status_label: string;
  status_tone: "success" | "danger" | "warning" | "secondary";
  risk_level: number;
  reason?: string;
  cooldown_until?: string;
  next_probe_at?: string;
  recovery_successes?: number;
  recovery_target?: number;
  blocked_tasks?: number;
  queued_tasks?: { total: number };
  proxy?: string;
  proxy_status?: string;
  network_key?: string;
  last_risk_at?: string;
  task_next_allowed_at?: string;
  platform_account_id?: string;
  platform_account_id_label?: string;
  latest_block_reason?: string;
}

export interface RiskConfig {
  risk_control: Record<string, any>;
  schedule: Record<string, any>;
  admin_token_required?: boolean;
}

export interface DMConversation {
  id: string;
  peer_id: string;
  peer_name: string;
  peer_avatar?: string;
  last_message: string;
  last_time: string;
  unread_count: number;
}

export interface DMMessage {
  id: string;
  sender_id: string;
  is_self: boolean;
  content: string;
  timestamp: string;
  status?: "sent" | "sending" | "failed";
}
