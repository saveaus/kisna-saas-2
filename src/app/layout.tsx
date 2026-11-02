import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care OS",
  description: "Operating system for NDIS and Support at Home providers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
