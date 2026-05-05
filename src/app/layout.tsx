import type { Metadata } from "next";
import { Nav } from "./_components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Merit Flow",
  description: "Openhouse internal performance reviews"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
