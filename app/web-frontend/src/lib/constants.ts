import { Platform, TabType } from "@/types";

export const PLATFORM_NAMES: Record<Platform, string> = {
  douyin: "抖音",
  xhs: "小红书",
  kuaishou: "快手",
  shipinhao: "视频号",
};

export const PLATFORMS: { id: Platform; name: string; color: string }[] = [
  { id: "douyin", name: "抖音", color: "#fe2c55" },
  { id: "xhs", name: "小红书", color: "#ff2442" },
  { id: "kuaishou", name: "快手", color: "#ff7902" },
  { id: "shipinhao", name: "视频号", color: "#07c160" },
];

export interface NavGroup {
  label?: string;
  items: NavItemConfig[];
}

export interface NavItemConfig {
  tab: TabType;
  label: string;
  icon: string;
  badgeKey?: string;
  supportedPlatforms?: Platform[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { tab: "overview", label: "总览", icon: "Zap" },
      { tab: "accounts", label: "账号", icon: "CreditCard", badgeKey: "accounts" },
      {
        tab: "monitors",
        label: "作品监控",
        icon: "Target",
        badgeKey: "monitors",
        supportedPlatforms: ["douyin", "xhs", "kuaishou"],
      },
      {
        tab: "collections",
        label: "关键词采集",
        icon: "Hash",
        badgeKey: "collections",
        supportedPlatforms: ["douyin", "xhs", "kuaishou"],
      },
      {
        tab: "comments",
        label: "评论监控",
        icon: "MessageSquare",
        badgeKey: "comments",
        supportedPlatforms: ["douyin", "xhs", "kuaishou"],
      },
      {
        tab: "danmaku",
        label: "弹幕监控",
        icon: "MessageCircle",
        badgeKey: "danmaku",
        supportedPlatforms: ["douyin"],
      },
    ],
  },
  {
    label: "本账号",
    items: [
      { tab: "hub", label: "账号管理", icon: "User" },
    ],
  },
  {
    label: "工具",
    items: [
      {
        tab: "publish",
        label: "发布",
        icon: "Send",
        badgeKey: "publish",
        supportedPlatforms: ["douyin", "xhs", "kuaishou", "shipinhao"],
      },
      {
        tab: "autocomment",
        label: "自动评论",
        icon: "MessageSquare",
        badgeKey: "autocomment",
        supportedPlatforms: ["douyin", "xhs", "kuaishou"],
      },
      { tab: "share-download", label: "链接下载", icon: "Download" },
      { tab: "proxies", label: "代理池", icon: "Network" },
      { tab: "notifications", label: "通知", icon: "Bell" },
      { tab: "settings", label: "设置", icon: "Settings" },
    ],
  },
  {
    label: "安全",
    items: [
      { tab: "risk-control", label: "风控中心", icon: "Shield", badgeKey: "risk" },
    ],
  },
];

export const PAGE_META: Record<TabType, { title: string; desc: string; kicker: string }> = {
  overview: {
    title: "总览",
    desc: "查看账号、监控、作品与评论的最新状态。",
    kicker: "工作台",
  },
  accounts: {
    title: "账号",
    desc: "管理已授权或通过 Cookie 登录的账号，检查登录态与网络出口。",
    kicker: "账号管理",
  },
  hub: {
    title: "本账号管理",
    desc: "同步您的作品、人际关系、私信以及账号数据。",
    kicker: "多平台工作台",
  },
  monitors: {
    title: "作品监控",
    desc: "配置监控博主主页，自动同步最新发布的作品与关键指标。",
    kicker: "数据采集",
  },
  collections: {
    title: "关键词批量采集",
    desc: "按话题关键词批量抓取热门作品及互动数据。",
    kicker: "采集任务",
  },
  contents: {
    title: "内容列表",
    desc: "浏览已抓取的作品，支持高清媒体下载与数据查看。",
    kicker: "媒体归档",
  },
  comments: {
    title: "评论监控",
    desc: "监控指定作品评论区，支持情感分析与互动回复。",
    kicker: "用户互动",
  },
  danmaku: {
    title: "短视频弹幕监控",
    desc: "抓取短视频弹幕数据，生成时间轴分布。",
    kicker: "弹幕分析",
  },
  publish: {
    title: "发布",
    desc: "上传图集或视频作品，配置标签与定时发布任务。",
    kicker: "内容分发",
  },
  autocomment: {
    title: "自动评论",
    desc: "基于规则或大模型生成回复文案，自动评论互动。",
    kicker: "自动化引擎",
  },
  "share-download": {
    title: "通用分享链接下载",
    desc: "支持抖音、小红书、快手、B站等平台的分享文案解析与原画质下载。",
    kicker: "提取工具",
  },
  proxies: {
    title: "代理池",
    desc: "配置代理服务器，实现账号网络出口隔离。",
    kicker: "网络隔离",
  },
  "risk-control": {
    title: "风控中心",
    desc: "监控账号健康状态与平台请求策略，避免触发风控。",
    kicker: "安全防护",
  },
  notifications: {
    title: "通知渠道",
    desc: "配置飞书、钉钉、企业微信机器人接收实时告警。",
    kicker: "消息推送",
  },
  settings: {
    title: "系统设置",
    desc: "配置存储目录、大模型 API 及后台引擎运行参数。",
    kicker: "全局设置",
  },
};

export const QMAP: Record<string, string> = {
  "": "默认",
  highest: "原画",
  "1080": "1080P",
  "720": "720P",
  "540": "540P",
  lowest: "省流",
};
