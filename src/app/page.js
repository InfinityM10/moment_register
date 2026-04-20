"use client"
import Link from "next/link";
import { useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await account.get()
        setIsAuthenticated(true)
        
        // Get user data from localStorage
        const data = localStorage.getItem("userData")
        if (data) {
          setUserData(JSON.parse(data))
        } else {
          // If no userData but authenticated, use account name
          setUserData({ name: user.name })
        }
      } catch (error) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await account.deleteSession('current')
      localStorage.removeItem('userData')
      localStorage.removeItem('userSession')
      setIsAuthenticated(false)
      setUserData(null)
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <main className="checker-background flex min-h-screen flex-col items-center justify-center p-5">
        <div className="text-lg">Loading...</div>
      </main>
    )
  }

  return (
    <main className="checker-background flex min-h-screen flex-col items-center justify-center p-5">
      {!isAuthenticated ? (
        <div className="rounded-lg bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Welcome!</h1>
          <p className="text-gray-600 mb-6">Please login or sign up to continue</p>
          <div className="space-y-3">
            <Link 
              href="/login"
              className="block w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Login
            </Link>
            <Link 
              href="/signup"
              className="block w-full rounded-md border border-blue-600 bg-white px-6 py-3 font-medium text-blue-600 hover:bg-blue-50"
            >
              Sign Up
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-8 shadow-lg text-center max-w-md w-full">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Welcome back!</h1>
          <p className="text-lg text-gray-700 mb-6">{userData?.name}</p>
          <div className="space-y-3">
            <Link 
              href="/In"
              className="block w-full rounded-md bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
            >
              Punch In
            </Link>
            <Link 
              href="/out"
              className="block w-full rounded-md bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
            >
              Punch Out
            </Link>
            <Link 
              href="/register"
              className="block w-full rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              View Profile
            </Link>
            <Link 
              href="/logs"
              className="block w-full rounded-md border border-blue-300 bg-blue-50 px-6 py-3 font-medium text-blue-700 hover:bg-blue-100"
            >
              View Logs
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full rounded-md border border-red-300 bg-white px-6 py-3 font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
