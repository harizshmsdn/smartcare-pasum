'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
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