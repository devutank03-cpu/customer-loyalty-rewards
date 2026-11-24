import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoRewards™ | Next-Gen Factory Box Code Loyalty Portal",
  description: "Cryptographically Verified Product Box Loyalty Rewards & Anti-Fraud Ledger",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#080C14] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden">
        {/* Subtle Ambient Background Lighting */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[130px] ambient-glow-emerald" />
          <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] ambient-glow-cyan" />
          <div className="absolute bottom-[-10%] left-[20%] w-[650px] h-[650px] rounded-full bg-emerald-600/8 blur-[140px]" />
          {/* Subtle grid texture */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 0)', 
              backgroundSize: '28px 28px' 
            }} 
          />
        </div>
        {children}
      </body>
    </html>
  );
}
