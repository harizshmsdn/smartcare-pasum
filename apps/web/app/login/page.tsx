import { login, signup } from './actions'

export default function LoginPage() {
    return (
        <div className="flex h-screen items-center justify-center">
            <form className="flex w-full max-w-sm flex-col gap-4">
                <h1 className="text-2xl font-bold">SmartCare PASUM</h1>

                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className="border p-2" />

                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" required className="border p-2" />

                <div className="flex gap-2">
                    <button formAction={login} className="bg-blue-600 p-2 text-white flex-1">Log In</button>
                    <button formAction={signup} className="bg-gray-200 p-2 flex-1">Sign Up</button>
                </div>
            </form>
        </div>
    )
}