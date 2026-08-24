import type { Metadata } from "next";
import { ReduxProvider } from "@/store/provider";
import { I18nProvider } from "@/i18n";
import { ToastContainer } from "@/components/ui/toast";
import { BusyIndicator } from "@/components/layout/busy-indicator";
import { LightboxModal } from "@/components/layout/lightbox-modal";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreatorHub - 多平台创作者多账号与数据管理中心",
  description: "支持抖音、小红书、快手、视频号的多账号托管、数据监控、无水印下载与矩阵分发",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-[#090b10] text-[#f6f8fb] min-h-screen antialiased">
        <ReduxProvider>
          <I18nProvider>
            <BusyIndicator />
            <LightboxModal />
            <ToastContainer />
            {children}
          </I18nProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
