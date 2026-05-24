"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      setError("All credential signature inputs must be fully populated.");
      return;
    }

    const sanitizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(sanitizedEmail)) {
      setError("The provided string network address is not in a valid email format.");
      return;
    }

    if (password.length < 6) {
      setError("Access keys must contain a minimum threshold of 6 parameters.");
      return;
    }

    setError("");
    setLoading(true);

    // Frontend Mock Authentication Execution Pipeline
    setTimeout(() => {
      setLoading(false);
      
      // 1. Commit authenticated status locally in user browser
      localStorage.setItem("isUserLoggedIn", "true");
      
      // 2. Alert the Navbar element right away to instantly update its visual state
      window.dispatchEvent(new Event("local-auth-change"));
      
      // 3. Securely route the newly tracked session context over to dashboard
      router.push("/dashboard");
    }, 1200);
  }

  const handleRevealStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setShowPassword(true);
  };

  const handleRevealEnd = () => {
    setShowPassword(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-md space-y-6">
        
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#5680E9] uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to hub
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-400 font-semibold">Initialize token handshake session context to resume tracking loops.</p>
        </div>

        {error && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Network Address (Email)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="email"
                value={email}
                maxLength={80}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@domain.net"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5680E9] focus:bg-white text-xs font-semibold text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Access Key Code (Password)</label>
              <Link href="/forgot-password" className="text-[10px] font-black text-[#5680E9] hover:underline uppercase tracking-wide">
                Forgot Key?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                maxLength={32}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  setError("Security architecture prevents pasting key signatures. Manual entry required.");
                }}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5680E9] focus:bg-white text-xs font-semibold text-slate-700 transition-all"
              />
              
              <button
                type="button"
                onMouseDown={handleRevealStart}
                onMouseUp={handleRevealEnd}
                onMouseLeave={handleRevealEnd}
                onTouchStart={handleRevealStart}
                onTouchEnd={handleRevealEnd}
                className="absolute right-3 top-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 select-none cursor-pointer transition-colors"
              >
                {showPassword ? <Eye className="w-4 h-4 text-[#5680E9]" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#5680E9] to-[#8860D0] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify and Connect"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-medium">
            New node cluster required?{" "}
            <Link href="/signup" className="text-[#8860D0] font-black hover:underline">
              Register Array Instance
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}