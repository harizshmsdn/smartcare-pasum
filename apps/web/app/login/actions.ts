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