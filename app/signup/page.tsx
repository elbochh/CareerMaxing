"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email and password are required.");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: sanitizedEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Could not create your account. Try a different email.");
        return;
      }
      const signin = await signIn("credentials", {
        email: sanitizedEmail,
        password,
        redirect: false,
        callbackUrl: "/onboarding",
      });
      if (!signin || signin.error) {
        setError("Account created — please log in.");
        router.push("/login");
        return;
      }
      router.replace("/onboarding");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-md space-y-6">
        
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#5680E9] uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to hub
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create New Account</h1>
          <p className="text-xs text-slate-400 font-semibold">Create a new account to get started.</p>
        </div>

        {error && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="text"
                value={name}
                maxLength={50} // Protects layout against giant character fills
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5680E9] focus:bg-white text-xs font-semibold text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="email"
                value={email}
                maxLength={80}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5680E9] focus:bg-white text-xs font-semibold text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                maxLength={64}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5680E9] focus:bg-white text-xs font-semibold text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#5AB9EA] shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                By registering, you agree to our <Link href="/terms" className="text-[#5680E9] font-black hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#5680E9] font-black hover:underline">Privacy Policy</Link>.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#5680E9] via-[#5AB9EA] to-[#8860D0] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-[#5680E9] font-black hover:underline">
              Log In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}