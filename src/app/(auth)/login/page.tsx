"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearCache } from "@/lib/clientCache";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid OTP');
      }

      // Successful login
      try {
        await clearCache();
      } catch (e) {
        console.error("Failed to clear cache on login:", e);
      }
      
      router.push('/dashboard');
      router.refresh(); // Refresh to update server components with new session
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(135, 113, 255, 0.3) 50%, #FFFFFF 100%)'
      }}
    >
      <div className="bg-white bg-opacity-70 shadow-xl rounded-2xl px-10 py-8 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <div className="mb-4">
          <img src="/images/login-icon.png" alt="Login Logo" width={60} height={60} />
        </div>
        
        {/* Title */}
        <h2
          className="text-center mt-0 mb-3 text-gray-900 font-bold"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 18 }}
        >
          {step === 'email' ? "Let's Get Started" : "Check Your Inbox"}
        </h2>
        
        <p
          className="text-center mb-6 text-gray-700 font-bold"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 14 }}
        >
          {step === 'email' 
            ? "Enter your email to join Setter — whether you're new or returning, we'll get you in fast."
            : `We sent a code to ${email}. Enter it below to verify.`}
        </p>

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-100 text-red-600 p-2 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {/* Forms */}
        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="w-full flex flex-col items-center">
            <label
              htmlFor="email"
              className="self-start text-gray-800 mb-1 font-bold"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}
            >
              Enter your email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@gmail.com"
              className="w-full mb-3 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-900 placeholder-gray-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="submit"
              className={`w-full font-medium py-2 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-violet-300 border border-gray-300 transition mb-2 ${email && !loading ? 'bg-[#8771FF] text-white hover:bg-[#6d5ed6]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              disabled={!email || loading}
            >
              {loading ? "Sending..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="w-full flex flex-col items-center">
            <label
              htmlFor="otp"
              className="self-start text-gray-800 mb-1 font-bold"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}
            >
              Enter OTP Code
            </label>
            <input
              id="otp"
              type="text"
              placeholder="123456"
              className="w-full mb-3 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-900 placeholder-gray-400 tracking-widest text-center text-lg"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              disabled={loading}
              maxLength={6}
            />
            <button
              type="submit"
              className={`w-full font-medium py-2 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-violet-300 border border-gray-300 transition mb-2 ${otp.length >= 4 && !loading ? 'bg-[#8771FF] text-white hover:bg-[#6d5ed6]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              disabled={!otp || loading}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(""); }}
              className="text-sm text-gray-500 hover:text-gray-800 mt-2"
            >
              Change email
            </button>
          </form>
        )}

        {/* Terms and Privacy */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Continue to accept <a href="#" className="underline hover:text-violet-700">terms & conditions</a><br />
          and <a href="#" className="underline hover:text-violet-700">privacy policy</a>.
        </p>
      </div>
    </div>
  );
}