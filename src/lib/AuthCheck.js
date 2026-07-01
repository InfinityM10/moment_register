'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { account } from '@/lib/appwrite'

export default function AuthCheck({ children }) {
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkRegistration = async () => {
      // Skip check if already on register page
      if (pathname === '/register') {
        setIsChecking(false)
        return
      }

      // Check if user is registered in localStorage
      let userData = localStorage.getItem('userData')
      
      if (!userData) {
        try {
          // If localStorage is empty, check if we are logged into Appwrite
          const user = await account.get()
          const prefs = await account.getPrefs()
          
          if (prefs && prefs.designation && prefs.department) {
            // Restore data to localStorage from Appwrite preferences
            const restoredData = {
              name: user.name,
              designation: prefs.designation,
              department: prefs.department,
              registeredAt: new Date().toISOString()
            }
            localStorage.setItem('userData', JSON.stringify(restoredData))
            userData = restoredData
          }
        } catch (error) {
          // Silent catch - user is either not logged in or doesn't have preferences set
          console.warn('AuthCheck: Appwrite session/preferences check skipped or failed:', error.message)
        }
      }
      
      if (!userData) {
        // User not registered, redirect to register with current path
        const redirectUrl = `/register?redirect=${encodeURIComponent(pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''))}`
        router.push(redirectUrl)
      } else {
        setIsChecking(false)
      }
    }

    checkRegistration()
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

