'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function AuthCheck({ children }) {
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Skip check if already on register page
    if (pathname === '/register') {
      setIsChecking(false)
      return
    }

    // Check if user is registered
    const userData = localStorage.getItem('userData')
    
    if (!userData) {
      // User not registered, redirect to register with current path
      const redirectUrl = `/register?redirect=${encodeURIComponent(pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''))}`
      router.push(redirectUrl)
    } else {
      setIsChecking(false)
    }
  }, [pathname, router, searchParams])

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
