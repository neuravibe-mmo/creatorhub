import type { Metadata } from "next";
import { ReduxProvider } from "@/store/provider";
import { ToastContainer } from "@/components/ui/toast";
import { BusyIndicator } from "@/components/layout/busy-indicator";
import { LightboxModal } from "@/components/layout/lightbox-modal";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreatorHub - 全平台创作者多账号与数据管理中心",
  description: "支持抖音、小红书、快手、视频号的多账号托管、数据监控、无水印下载与矩阵分发",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <ReduxProvider>
          <BusyIndicator />
          <LightboxModal />
          <ToastContainer />
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
