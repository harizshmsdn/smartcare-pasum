// apps/web/app/login/page.tsx
"use client";

import { useState } from 'react';
import { login, signup } from './actions';
import Link from 'next/link';
import Grainient from '../../components/Grainient';
import { PixelIcon } from '../../components/PixelIcon';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'home' | 'about'>('home');
    const [authError, setAuthError] = useState<{ error: string, code: string | number } | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const isWrongCredentials = authError?.error.toLowerCase().includes('credential') || authError?.error.toLowerCase().includes('invalid login');

    // Submits authentication action and manages loading/error states
    const handleAction = async (action: (formData: FormData) => Promise<any>, formData: FormData) => {
        setAuthError(null);
        setIsPending(true);
        try {
            const res = await action(formData);
            if (res?.error) {
                setAuthError(res);
                setIsPending(false);
            } else {
                setIsSuccess(true);
            }
        } catch (err: any) {
            if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.includes('NEXT_REDIRECT')) {
                setIsSuccess(true);
            } else {
                setIsPending(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex w-full font-sans relative overflow-hidden bg-[#101a2c] text-white">

            {/* Unified Dark Grainient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
                <Grainient
                    color1="#101a2c"
                    color2="#223018"
                    color3="#c8d4ff"
                    timeSpeed={0.8}
                    colorBalance={-0.27}
                    warpStrength={1}
                    warpFrequency={5}
                    warpSpeed={2}
                    warpAmplitude={50}
                    blendAngle={0}
                    blendSoftness={0.05}
                    rotationAmount={500}
                    noiseScale={2}
                    grainAmount={0.12}
                    grainScale={2}
                    grainAnimated={false}
                    contrast={1.5}
                    gamma={1}
                    saturation={1}
                    centerX={0}
                    centerY={0}
                    zoom={0.9}
                />
            </div>

            {/* Left Side: dottxt.ai Dark Wireframe Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10">
                <div className="w-full max-w-md bg-[#080f1c]/85 backdrop-blur-xl rounded-none border border-white/15 p-8 space-y-7 relative shadow-2xl">

                    {/* Success redirect loading overlay */}
                    {isSuccess && (
                        <div className="absolute inset-0 bg-[#080f1c]/95 backdrop-blur-sm rounded-none flex flex-col items-center justify-center gap-3 z-30 animate-in fade-in duration-200 border border-white/20">
                            <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-none animate-spin" />
                            <div className="text-center">
                                <p className="text-sm font-mono font-bold text-white tracking-wider uppercase">Authenticating</p>
                                <p className="text-xs font-mono text-white/50 mt-1">Redirecting to dashboard...</p>
                            </div>
                        </div>
                    )}

                    {/* Technical Section Index Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-blue-400 font-bold">01</span>
                            <span className="font-mono text-xs uppercase tracking-wider text-white/80">
                                // AUTHENTICATION
                            </span>
                        </div>
                        <span className="text-[10px] font-mono border border-white/15 px-2 py-0.5 text-white/60 bg-white/5">
                            PORTAL
                        </span>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
                            Sign in to <span className="font-black">tigha.</span>
                        </h2>
                        <p className="text-white/50 text-xs font-mono">
                            Enter your PASUM credentials to continue
                        </p>
                    </div>

                    {authError && (
                        <div className="p-3 text-xs font-mono text-red-300 bg-red-950/40 border border-red-500/50 rounded-none flex items-start gap-2.5 animate-in fade-in duration-150">
                            <PixelIcon name="warning" size={16} className="text-red-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold text-red-200 uppercase tracking-wide">
                                    {isWrongCredentials ? 'Invalid Credentials' : `Error ${authError.code}`}
                                </p>
                                <p className="text-red-300/80 mt-0.5">
                                    {isWrongCredentials ? 'The email or password you entered is incorrect.' : authError.error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Form with Sharp Wireframe Inputs */}
                    <form className="space-y-4">
                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-white/70 block">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (authError) setAuthError(null);
                                    }}
                                    placeholder="matric@siswa.um.edu.my"
                                    required
                                    disabled={isPending || isSuccess}
                                    className={`w-full px-3.5 py-2.5 rounded-none border text-sm text-white font-mono placeholder:text-white/20 bg-black/40 focus:outline-none transition-all ${authError
                                        ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/40'
                                        : 'border-white/15 focus:border-blue-400'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-white/70 block">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (authError) setAuthError(null);
                                    }}
                                    placeholder="••••••••"
                                    required
                                    disabled={isPending || isSuccess}
                                    className={`w-full px-3.5 py-2.5 rounded-none border text-sm text-white font-mono placeholder:text-white/20 bg-black/40 focus:outline-none transition-all ${authError
                                        ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/40'
                                        : 'border-white/15 focus:border-blue-400'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-xs font-mono text-white/60 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    className="rounded-none border-white/20 bg-black/40 text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Remember me</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Action Buttons in dottxt.ai Wireframe Style */}
                        <div className="flex gap-3 pt-3">
                            <button
                                formAction={(formData) => handleAction(login, formData)}
                                disabled={isPending || isSuccess}
                                className="flex-1 bg-white text-black hover:bg-white/90 py-2.5 px-4 rounded-none font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer shadow-sm"
                            >
                                {isPending || isSuccess ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-none animate-spin" />
                                        <span>SIGNING IN...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-4 h-4 bg-black text-white text-[10px] flex items-center justify-center font-bold">↵</span>
                                        <span>LOG IN</span>
                                    </>
                                )}
                            </button>
                            <button
                                formAction={(formData) => handleAction(signup, formData)}
                                disabled={isPending || isSuccess}
                                className="flex-1 bg-transparent text-white border border-white/20 hover:border-white/40 hover:bg-white/5 py-2.5 px-4 rounded-none font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer"
                            >
                                SIGN UP
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-3 text-white/30 text-[11px] font-mono uppercase">or sso</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Disabled SSO Buttons in dottxt.ai Wireframe Box */}
                    <div className="space-y-2">
                        {/* Google SSO Button (Disabled) */}
                        <div className="relative group/disabled w-full cursor-not-allowed" title="Feature Disabled">
                            <button
                                type="button"
                                disabled
                                className="w-full flex items-center justify-center gap-2.5 bg-black/25 border border-white/10 text-white/40 py-2.5 px-4 rounded-none text-xs font-mono opacity-50 grayscale cursor-not-allowed pointer-events-none select-none"
                            >
                                <span>[ G ]</span>
                                <span>Sign in with Google</span>
                            </button>
                            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2 py-0.5 text-[10px] font-mono text-white bg-slate-900 border border-white/20 rounded-none shadow-lg whitespace-nowrap z-50">
                                FEATURE DISABLED
                            </div>
                        </div>

                        {/* UM SSO Button (Disabled) */}
                        <div className="relative group/disabled w-full cursor-not-allowed" title="Feature Disabled">
                            <button
                                type="button"
                                disabled
                                className="w-full flex items-center justify-center gap-2.5 bg-black/25 border border-white/10 text-white/40 py-2.5 px-4 rounded-none text-xs font-mono opacity-50 grayscale cursor-not-allowed pointer-events-none select-none"
                            >
                                <span>[ UM ]</span>
                                <span>Sign in with UM SSO</span>
                            </button>
                            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2 py-0.5 text-[10px] font-mono text-white bg-slate-900 border border-white/20 rounded-none shadow-lg whitespace-nowrap z-50">
                                FEATURE DISABLED
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Right Side: dottxt.ai Style Brand Hero Showcase */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-center p-12 overflow-hidden z-10">

                {/* Top Right Navigation matching dottxt.ai buttons */}
                <nav className="absolute top-8 right-12 flex gap-3 z-10 font-mono text-xs">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-none border transition-all ${activeTab === 'home'
                            ? 'border-white/40 bg-white/10 text-white'
                            : 'border-white/10 bg-black/20 text-white/50 hover:border-white/25 hover:text-white'
                            }`}
                    >
                        <span className="w-4 h-4 bg-[#BD932F] text-black text-[10px] font-bold flex items-center justify-center">H</span>
                        <span>Home</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-none border transition-all ${activeTab === 'about'
                            ? 'border-white/40 bg-white/10 text-white'
                            : 'border-white/10 bg-black/20 text-white/50 hover:border-white/25 hover:text-white'
                            }`}
                    >
                        <span className="w-4 h-4 bg-[#7F9ACF] text-black text-[10px] font-bold flex items-center justify-center">A</span>
                        <span>About Us</span>
                    </button>
                </nav>

                {/* Dynamic Content in Wireframe Box */}
                <div className="max-w-lg mx-auto w-full space-y-6">
                    {activeTab === 'home' ? (
                        <div className="space-y-6 transition-opacity duration-300">
                            {/* Title & IPA */}
                            <div className="border border-white/15 bg-[#09111e]/70 backdrop-blur-md p-8 rounded-none space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <span className="font-mono text-xs text-blue-400">00 // PLATFORM</span>
                                </div>
                                <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-white font-sans">
                                    tigha<span className="text-blue-400">.</span>
                                </h1>
                                <div className="text-white/60 font-mono text-xs tracking-wide flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-2 rounded-none">
                                    <span className="text-white font-bold">/ˈtaɪ.ɡɑː/</span>
                                    <span className="text-white/20">•</span>
                                    <span className="text-white/50 italic font-sans">like &quot;ti&quot; in tiger + &quot;gha&quot; in ghana</span>
                                </div>
                                <p className="text-slate-300 text-base font-normal leading-relaxed">
                                    An EdTech system to keep students locked in and ahead of the curve.
                                </p>
                            </div>

                            {/* Technical Specs Tags */}
                            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                                <div className="border border-white/10 bg-black/30 p-3 rounded-none">
                                    <span className="text-white/40 block text-[10px]">01 // ATTENDANCE</span>
                                    <span className="text-white font-semibold mt-1 block">GPS + FaceID Check-In</span>
                                </div>
                                <div className="border border-white/10 bg-black/30 p-3 rounded-none">
                                    <span className="text-white/40 block text-[10px]">02 // ANALYTICS</span>
                                    <span className="text-white font-semibold mt-1 block">Early Risk Trajectory</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-white/15 bg-[#09111e]/70 backdrop-blur-md p-8 rounded-none space-y-6 transition-opacity duration-300 font-mono">
                            <div className="border-b border-white/10 pb-3">
                                <span className="text-xs text-blue-400">02 // CREATORS</span>
                            </div>
                            <div className="space-y-4">
                                <div className="border-l-2 border-[#c8d4ff] pl-4 py-1">
                                    <h3 className="text-xl font-bold text-white font-sans">Hariz</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">Ex-PASUM Student & Developer</p>
                                </div>
                                <div className="border-l-2 border-[#7F9ACF] pl-4 py-1">
                                    <h3 className="text-xl font-bold text-white font-sans">Garry</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">Ex-PASUM Student & Developer</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}