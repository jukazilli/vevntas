import "@fontsource-variable/nunito-sans";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vevntas",
  description: "Ventas simples, control total",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
