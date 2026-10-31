import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#111111]">
        <header className="border-b border-[#E6E6E6]">
          <nav className="flex items-center justify-between gap-4 px-4 sm:px-8 h-14">
            <div className="flex items-center gap-4 sm:gap-8 min-w-0">
              <Link href="/" className="font-extrabold tracking-tight">CX Copiloto</Link>
              <div className="flex gap-4 sm:gap-6 text-sm text-[#6B6B6B]">
                <Link href="/" className="hover:text-[#111111]">Chat</Link>
                <Link href="/agent" className="hover:text-[#111111]">Atendente</Link>
                <Link href="/metrics" className="hover:text-[#111111]">Indicadores</Link>
              </div>
            </div>
            <span className="hidden md:block font-mono text-xs uppercase tracking-widest text-[#6B6B6B]">
              Dados fictícios · Projeto independente
            </span>
          </nav>
        </header>
        {children}
        <footer className="border-t border-[#E6E6E6] px-4 sm:px-8 py-3 text-xs text-[#6B6B6B]">
          Projeto de portfólio independente · dados 100% fictícios · sem vínculo com o iFood · não é um canal de suporte real
        </footer>
      </body>
    </html>
  );
}
