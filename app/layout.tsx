import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { MuiProvider } from "@/components/mui-provider";
import { SiteHeader } from "@/components/site-header";
import { Suspense } from "react";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Consultations",
  description: "Book and manage consultations",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <MuiProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-svh flex-col">
              <SiteHeader />
              <div className="flex flex-1">
                <Suspense>
                  <AppSidebar />
                </Suspense>
                <div className="flex flex-1 flex-col">{children}</div>
              </div>
            </div>
          </ThemeProvider>
        </MuiProvider>
      </body>
    </html>
  );
}
