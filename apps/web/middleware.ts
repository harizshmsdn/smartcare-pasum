// apps/web/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    // Create an unmodified response
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // This ensures that if the Supabase token needs to be refreshed, 
                    // the new token is written back into the request cookies
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

                    supabaseResponse = NextResponse.next({
                        request,
                    })

                    // And also written to the outgoing response cookies
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Use getUser() instead of getSession() in middleware. 
    // getUser() validates the token against the Supabase server, preventing spoofing.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // All routes are protected by default except for the login route
    const isProtectedRoute = !request.nextUrl.pathname.startsWith('/login')

    // If the user is NOT logged in and tries to access a protected route, redirect to login
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If the user IS logged in and tries to access the login page, redirect to the home page
    if (user && !isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // Return the response so the page can load with the correct cookies
    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, .svg, .png (static assets)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}