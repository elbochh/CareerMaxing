import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-md space-y-5">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#5680E9] uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Forgot Password
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Self-serve password reset is coming soon. For this hackathon build, please contact
            an admin or use the Google sign-in option.
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
          <Mail className="w-4 h-4 text-[#5AB9EA] shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 font-semibold leading-normal">
            Sign in with Google from the login page to regain access without a password.
          </p>
        </div>

        <Link
          href="/login"
          className="block text-center w-full py-3 bg-gradient-to-r from-[#5680E9] to-[#8860D0] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 active:scale-98 transition-all"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
