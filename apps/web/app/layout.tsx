// apps/web/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import "./globals.css";
import { Sidebar } from "../components/sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "SMART-CARE @ PASUM",
  description: "Digital monitoring and early-alert platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Access the cookies
  const cookieStore = await cookies();

  // 2. Initialize the Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // 3. Fetch the active user securely to prevent session spoofing
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-screen bg-[#FAF9F6] text-slate-800 font-sans overflow-hidden`}
      >
        {/* Persistent Sidebar - Only visible if logged in */}
        {user && <Sidebar />}

        {/* Dynamic Page Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}