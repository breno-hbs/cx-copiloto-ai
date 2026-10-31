import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CX Copiloto AI",
  description: "Projeto de portfólio independente: triagem e atendimento com IA. Dados fictícios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <div className="bg-amber-100 text-amber-900 text-xs text-center px-3 py-1.5">
          Projeto de portfólio independente · dados 100% fictícios · sem vínculo com o iFood · não é um canal de suporte real
        </div>
        <nav className="flex gap-4 px-4 py-2 text-sm border-b bg-white">
          <Link href="/" className="font-semibold">CX Copiloto AI</Link>
          <Link href="/" className="text-neutral-600 hover:underline">Chat do cliente</Link>
          <Link href="/agent" className="text-neutral-600 hover:underline">Painel do atendente</Link>
          <Link href="/metrics" className="text-neutral-600 hover:underline">Indicadores</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
