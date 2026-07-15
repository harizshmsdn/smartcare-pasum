import { login, signup } from './actions'
import Link from 'next/link'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex w-full font-sans">

            {/* Login & Signup Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#FAF9F6] p-6 sm:p-12">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">

                    {/* Header */}
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                            SmartCare @ PASUM
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Welcome back, please login to your account
                        </p>
                    </div>

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
                                placeholder="matric@um.edu.my"
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-800 placeholder-gray-400"
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
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-800 placeholder-gray-400"
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
                                formAction={login}
                                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm active:scale-[0.98]"
                            >
                                Log In
                            </button>
                            <button
                                formAction={signup}
                                className="flex-1 bg-transparent text-blue-600 py-3 px-4 rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors font-semibold active:scale-[0.98]"
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

            {/* Right Side: Professional Blue Placeholder */}
            <div className="hidden lg:flex w-1/2 bg-blue-900 relative flex-col justify-center p-12 overflow-hidden">

                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-950 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>

                {/* Top Right Navigation */}
                <nav className="absolute top-8 right-12 flex gap-8 z-10">
                    <Link href="/" className="text-white/80 hover:text-white font-medium transition-colors">
                        Home
                    </Link>
                    <Link href="/about" className="text-white/80 hover:text-white font-medium transition-colors">
                        About Us
                    </Link>
                </nav>

                {/* Placeholder Content */}
                <div className="relative z-10 max-w-lg mx-auto text-white space-y-6">
                    <h2 className="text-4xl font-bold leading-tight">
                        Data-Driven Insights for Student Success.
                    </h2>
                    <p className="text-blue-200 text-lg leading-relaxed">
                        System information, interactive features, and platform capabilities will be showcased here shortly. Stay tuned for updates on our digital monitoring and early-alert system.
                    </p>
                </div>
            </div>

        </div>
    )
}