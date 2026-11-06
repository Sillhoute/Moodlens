import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/style/globals.css";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MoodLens - Facial Expression Recognition",
  description:
    "Sistem Pengenalan Ekspresi Wajah FER-2013 Menggunakan Custom CNN & ResNet50 Transfer Learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={jakartaSans.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
