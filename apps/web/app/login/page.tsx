"use client";

import { useState } from 'react';
import { login, signup } from './actions';
import Link from 'next/link';
import Grainient from '../../components/Grainient';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'home' | 'about'>('home');
    const [authError, setAuthError] = useState<{ error: string, code: string | number } | null>(null);
    const [isPending, setIsPending] = useState(false);

    const isWrongCredentials = authError?.error.toLowerCase().includes('credential') || authError?.error.toLowerCase().includes('invalid login');

    const handleAction = async (action: (formData: FormData) => Promise<any>, formData: FormData) => {
        setAuthError(null);
        setIsPending(true);
        const res = await action(formData);
        if (res?.error) {
            setAuthError(res);
        }
        setIsPending(false);
    };

    return (
        <div className="min-h-screen flex w-full font-sans">

            {/* Login & Signup Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#FAF9F6] p-6 sm:p-12">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">

                    {/* Header */}
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                            tigha @ PASUM
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Welcome back, please login to your account
                        </p>
                    </div>

                    {authError && (
                        <div className="p-3 text-sm text-red-600 bg-red-50/50 border border-red-200 rounded-lg flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-semibold">
                                    {isWrongCredentials ? 'Invalid Credentials' : `Error ${authError.code}`}
                                </p>
                                <p className="text-red-500/90">{authError.error}</p>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form className="space-y-5">
                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="matric@siswa.um.edu.my"
                                required
                                disabled={isPending}
                                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-all text-slate-800 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    authError ? 'border-red-300 focus:ring-red-500 bg-red-50/20' : 'border-gray-300 focus:ring-blue-600'
                                }`}
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={isPending}
                                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-all text-slate-800 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    authError ? 'border-red-300 focus:ring-red-500 bg-red-50/20' : 'border-gray-300 focus:ring-blue-600'
                                }`}
                            />
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                                />
                                Remember me
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                formAction={(formData) => handleAction(login, formData)}
                                disabled={isPending}
                                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Log In'
                                )}
                            </button>
                            <button
                                formAction={(formData) => handleAction(signup, formData)}
                                disabled={isPending}
                                className="flex-1 bg-transparent text-blue-600 py-3 px-4 rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors font-semibold active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                Sign Up
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">or</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    {/* SSO Buttons Container */}
                    <div className="space-y-3">
                        {/* Google SSO Button */}
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-slate-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Sign in with Google
                        </button>

                        {/* UM SSO Button */}
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-slate-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 11.2V16a8 8 0 0 0 16 0v-4.8" />
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            </svg>
                            Sign in with UM SSO
                        </button>
                    </div>

                </div>
            </div>

            {/* Right Side: Dynamic Content with Grainy Gradient */}
            <div
                className="hidden lg:flex w-1/2 relative flex-col justify-center p-12 overflow-hidden bg-[#101a2c]"
            >
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <Grainient
                        color1="#101a2c"
                        color2="#223018"
                        color3="#c8d4ff"
                    />
                </div>

                {/* Top Right Navigation */}
                <nav className="absolute top-8 right-12 flex gap-8 z-10">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`font-medium transition-all duration-300 ${activeTab === 'home' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                    >
                        Home
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`font-medium transition-all duration-300 ${activeTab === 'about' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                    >
                        About Us
                    </button>
                </nav>

                {/* Dynamic Content */}
                <div className="relative z-10 max-w-lg mx-auto w-full text-white space-y-6">
                    {activeTab === 'home' ? (
                        <div className="space-y-4 transition-opacity duration-500 ease-in-out">
                            <h2 className="text-6xl sm:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70">
                                tigha.
                            </h2>
                            <p className="text-[#efe5d3]/90 text-xl font-medium leading-relaxed max-w-md">
                                an EdTech platform to keep students locked in and ahead of the curve.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 transition-opacity duration-500 ease-in-out">
                            <div className="space-y-1 border-l-4 border-[#c8d4ff]/40 pl-5">
                                <h3 className="text-3xl font-bold text-white tracking-tight">Hariz</h3>
                                <p className="text-[#ddcfe7]/80 text-lg font-medium">Ex-PASUM Student</p>
                            </div>
                            <div className="space-y-1 border-l-4 border-[#c8d4ff]/40 pl-5">
                                <h3 className="text-3xl font-bold text-white tracking-tight">Garry</h3>
                                <p className="text-[#ddcfe7]/80 text-lg font-medium">Ex-PASUM Student</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}