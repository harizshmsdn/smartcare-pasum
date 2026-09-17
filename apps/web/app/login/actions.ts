'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '../../utils/supabase/server'
import { checkRateLimit } from '../../lib/rate-limiter'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Extract client IP address for rate limiting
    const headerList = await headers()
    const forwarded = headerList.get('x-forwarded-for')
    const ip = (forwarded ? forwarded.split(',')[0]?.trim() : null) || '127.0.0.1'

    // Enforce 5 login attempts per minute per IP and email combination
    const rateLimit = checkRateLimit(`login:${ip}:${email}`, 5, 60)
    if (!rateLimit.allowed) {
        return {
            error: `Too many login attempts. Please wait ${rateLimit.retryAfter} seconds before trying again.`,
            code: 'RATE_LIMITED'
        }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error("Supabase Auth error details:", error)
        return { error: error.message, code: (error as any).code || error.status || 'AUTH_ERROR' }
    }

    // Clear the cache to ensure the layout recognizes the new session
    revalidatePath('/', 'layout')
    redirect('/') // Land on the home/schedule page after login
}

export async function signup(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Enforce 3 signups per 10 minutes per IP
    const headerList = await headers()
    const forwarded = headerList.get('x-forwarded-for')
    const ip = (forwarded ? forwarded.split(',')[0]?.trim() : null) || '127.0.0.1'
    const rateLimit = checkRateLimit(`signup:${ip}`, 3, 600)
    if (!rateLimit.allowed) {
        return {
            error: `Too many registration attempts. Please wait ${rateLimit.retryAfter} seconds.`,
            code: 'RATE_LIMITED'
        }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        console.error("Supabase Signup error details:", error)
        return { error: error.message, code: (error as any).code || error.status || 'SIGNUP_ERROR' }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const supabase = await createClient()

    // Retrieve active authenticated user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || !user.email) {
        return { error: "Authentication required. Please log in again." }
    }

    // Enforce rate limit of 5 password changes per 10 minutes per user
    const rateLimit = checkRateLimit(`pwd_change:${user.id}`, 5, 600)
    if (!rateLimit.allowed) {
        return {
            error: `Too many password change attempts. Please wait ${rateLimit.retryAfter} seconds.`
        }
    }

    // Validate new password meets complexity policy
    if (newPassword.length < 8) {
        return { error: "Password must be at least 8 characters long." }
    }
    if (!/[A-Z]/.test(newPassword)) {
        return { error: "Password must contain at least one uppercase letter." }
    }
    if (!/[0-9]/.test(newPassword)) {
        return { error: "Password must contain at least one number." }
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
        return { error: "Password must contain at least one special character." }
    }

    // Prevent reusing current password
    if (currentPassword === newPassword) {
        return { error: "New password cannot be the same as the current password." }
    }

    // Verify current password by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    })
    if (verifyError) {
        return { error: "Incorrect current password. Please try again." }
    }

    // Commit updated password to Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    })
    if (updateError) {
        return { error: updateError.message }
    }

    return { success: true }
}