import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthGate from "@/components/AuthGate";
import { AuthProvider } from "@/contexts/AuthContext";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "모모지 - 우리 가족 밥상 플래너",
  description: "가족 맞춤 식단 추천 및 냉장고 관리 앱",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-100">
        <AuthProvider>
          <AuthGate>
            <div className="min-h-screen w-full max-w-[390px] mx-auto bg-gray-50 flex flex-col shadow-xl sm:border-x border-gray-200">
              <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom)+16px)]">
                {children}
              </main>
              <BottomNav />
            </div>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
