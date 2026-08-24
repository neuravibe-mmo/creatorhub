"use client";

import React from "react";
import { useAppSelector } from "@/store/hooks";
import { Header } from "@/components/layout/header";
import { SidebarNavigation } from "@/components/layout/sidebar-navigation";
import { PageContext } from "@/components/layout/page-context";
import { OverviewTab } from "@/components/overview/overview-tab";
import { AccountsTab } from "@/components/accounts/accounts-tab";
import { HubTab } from "@/components/hub/hub-tab";
import { MonitorsTab } from "@/components/monitors/monitors-tab";
import { ContentsTab } from "@/components/contents/contents-tab";
import { CommentsTab } from "@/components/comments/comments-tab";
import { DanmakuTab } from "@/components/danmaku/danmaku-tab";
import { PublishTab } from "@/components/publish/publish-tab";
import { AutoCommentTab } from "@/components/autocomment/autocomment-tab";
import { ShareDownloadTab } from "@/components/share-download/share-download-tab";
import { ProxiesTab } from "@/components/proxies/proxies-tab";
import { RiskControlTab } from "@/components/risk-control/risk-control-tab";
import { NotificationsTab } from "@/components/notifications/notifications-tab";
import { SettingsTab } from "@/components/settings/settings-tab";

export default function DashboardPage() {
  const currentTab = useAppSelector((state) => state.platform.currentTab);

  const renderActiveTab = () => {
    switch (currentTab) {
      case "overview":
        return <OverviewTab />;
      case "accounts":
        return <AccountsTab />;
      case "hub":
        return <HubTab />;
      case "monitors":
      case "collections":
        return <MonitorsTab />;
      case "contents":
        return <ContentsTab />;
      case "comments":
        return <CommentsTab />;
      case "danmaku":
        return <DanmakuTab />;
      case "publish":
        return <PublishTab />;
      case "autocomment":
        return <AutoCommentTab />;
      case "share-download":
        return <ShareDownloadTab />;
      case "proxies":
        return <ProxiesTab />;
      case "risk-control":
        return <RiskControlTab />;
      case "notifications":
        return <NotificationsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090b10]">
      <Header />
      <div className="flex flex-1">
        <SidebarNavigation />
        <main className="flex-1 p-6 md:p-8 max-w-[1300px] overflow-x-hidden">
          <PageContext />
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
}
