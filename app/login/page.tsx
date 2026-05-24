"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, Mail, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Email format validation checker rules
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    const sanitizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(sanitizedEmail)) {
      setError("The email address is not in a valid format.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: sanitizedEmail,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
        </div>

        {error && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="email"
                value={email}
                maxLength={80} // Restricts thousands of character dumps
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5680E9] focus:bg-white text-xs font-semibold text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Password</label>
              <Link href="/forgot-password" className="text-[10px] font-black text-[#5680E9] hover:underline uppercase tracking-wide">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                maxLength={32} // Max capacity block limit safeguard
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
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
                title="Hold to reveal password string"
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
            <Link href="/signup" className="text-[#8860D0] font-black hover:underline">
              Register New Account
            </Link>
        </div>

      </div>
    </div>
  );
}