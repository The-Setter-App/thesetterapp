"use client";

import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(135, 113, 255, 0.3) 50%, #FFFFFF 100%)'
      }}
    >
      <div className="bg-white bg-opacity-70 shadow-xl rounded-2xl px-10 py-8 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <div className="mb-1">
          <img src="/images/login-icon.png" alt="Login Logo" width={60} height={60} />
        </div>
        {/* Title */}
        <h2
          className="text-center mt-0 mb-3 text-gray-900 font-bold"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 18 }}
        >
          Let's Get Started
        </h2>
        <p
          className="text-center mb-6 text-gray-700 font-bold"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 14 }}
        >
          Enter your email to join Setter — whether you're new or returning, we'll get you in fast.
        </p>
        {/* Email input */}
        <form className="w-full flex flex-col items-center">
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
          />
          <button
            type="submit"
            className={`w-full font-medium py-2 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-violet-300 border border-gray-300 transition mb-2 ${email ? 'bg-[#8771FF] text-white hover:bg-[#6d5ed6]' : 'bg-white text-gray-900 hover:bg-violet-50'}`}
            disabled={!email}
          >
            Continue
          </button>
        </form>
        {/* Terms and Privacy */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Continue to accept <a href="#" className="underline hover:text-violet-700">terms & conditions</a><br />
          and <a href="#" className="underline hover:text-violet-700">privacy policy</a>.
        </p>
      </div>
    </div>
  );
}