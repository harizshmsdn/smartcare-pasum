// apps/web/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit } from './lib/rate-limiter'

export async function middleware(request: NextRequest) {
    // Enforce global edge IP rate limit
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = (forwarded ? forwarded.split(',')[0]?.trim() : null) || '127.0.0.1'
    const edgeLimit = checkRateLimit(`edge:${ip}`, 120, 60)
    if (!edgeLimit.allowed) {
        return new NextResponse('Too many requests. Please wait before retrying.', {
            status: 429,
            headers: {
                'Retry-After': String(edgeLimit.retryAfter),
                'X-RateLimit-Limit': '120',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(edgeLimit.retryAfter),
            },
        })
    }

    // Enforce strict rate limit on login entry route
    if (request.nextUrl.pathname.startsWith('/login')) {
        const loginEdgeLimit = checkRateLimit(`edge_login:${ip}`, 15, 60)
        if (!loginEdgeLimit.allowed) {
            return new NextResponse('Too many login attempts. Please wait before retrying.', {
                status: 429,
                headers: { 'Retry-After': String(loginEdgeLimit.retryAfter) },
            })
        }
    }

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

    // 1. If the user is NOT logged in and tries to access a protected route, redirect to login
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. ROLE-BASED ACCESS CONTROL (RBAC)
    if (user && isProtectedRoute) {
        // Fast path: Check app_metadata for the role (saves a database query per request)
        let role = user.app_metadata?.role

        // Fallback: Query profiles table if not present in JWT app_metadata
        if (!role) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            role = profile?.role
        }

        const path = request.nextUrl.pathname
        const isStudentRoute = path.startsWith('/student')
        const isAdminRoute = path.startsWith('/admin')

        if (role === 'student') {
            // If student accesses lecturer/admin route, redirect them to the corresponding student route
            if (!isStudentRoute) {
                const url = request.nextUrl.clone()
                if (path === '/' || isAdminRoute) {
                    url.pathname = '/student'
                } else {
                    url.pathname = `/student${path}`
                }
                return NextResponse.redirect(url)
            }
        } else if (role === 'lecturer') {
            // If lecturer accesses student/admin route, redirect them to the corresponding lecturer route
            if (isStudentRoute || isAdminRoute) {
                const url = request.nextUrl.clone()
                const cleanPath = isStudentRoute 
                    ? path.slice('/student'.length) 
                    : path.slice('/admin'.length)
                url.pathname = cleanPath === '' ? '/' : cleanPath
                return NextResponse.redirect(url)
            }
        } else if (role === 'admin') {
            // If admin accesses student/lecturer route, redirect them to the corresponding admin route
            if (!isAdminRoute) {
                const url = request.nextUrl.clone()
                if (path === '/' || isStudentRoute) {
                    url.pathname = '/admin'
                } else if (path === '/settings' || path === '/profile') {
                    url.pathname = '/admin/settings'
                } else {
                    url.pathname = '/admin'
                }
                return NextResponse.redirect(url)
            }
        } else {
            // Kick out any unknown role
            await supabase.auth.signOut()
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'Unauthorized Access: Invalid role.')
            return NextResponse.redirect(url)
        }
    }

    // 3. If the user IS logged in (and authorized) and tries to access the login page, redirect to the home page
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