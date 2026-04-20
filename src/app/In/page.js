'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PuchIn } from '../actions/moment'
import AuthCheck from '@/lib/AuthCheck'

export default function PunchInPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <AuthCheck>
                <PunchInContent />
            </AuthCheck>
        </Suspense>
    )
}

function PunchInContent() {
    const [status, setStatus] = useState('checking')
    const [message, setMessage] = useState('Processing punch in...')
    const router = useRouter()

    // Check permission status on mount
    useEffect(() => {
        const checkPermission = async () => {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' })
                if (result.state === 'granted') {
                    // Permission already granted, proceed directly
                    handlePunchInWithLocation()
                } else {
                    // Show permission prompt
                    setStatus('prompt')
                }
            } catch {
                // Fallback if permissions API not supported
                setStatus('prompt')
            }
        }
        checkPermission()
    }, [])

    const handlePunchInWithLocation = async () => {
        try {
            setStatus('loading')
            setMessage('Getting location...')

            const userData = localStorage.getItem('userData')
            const parsedUserData = JSON.parse(userData)

            if (!navigator.geolocation) {
                setStatus('error')
                setMessage('Geolocation is not supported by your browser')
                return
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = {
                        Lat: position.coords.latitude,
                        Long: position.coords.longitude
                    }

                    const fingerPrint = {
                        screen: `${window.screen.width}x${window.screen.height}`,
                        cpuCore: navigator.hardwareConcurrency || 'unknown',
                        memory: navigator.deviceMemory || 'unknown',
                        canvasHash: generateCanvasHash(),
                        webGlHash: generateWebGLHash()
                    }

                    const result = await PuchIn(fingerPrint, location, parsedUserData)

                    if (result.success) {
                        router.push('/success')
                    } else {
                        setStatus('error')
                        setMessage(`Error: ${result.error}`)
                    }
                },
                async () => {
                    // User denied location in browser popup, proceed with null values
                    const location = {
                        Lat: null,
                        Long: null
                    }

                    const fingerPrint = {
                        screen: `${window.screen.width}x${window.screen.height}`,
                        cpuCore: navigator.hardwareConcurrency || 'unknown',
                        memory: navigator.deviceMemory || 'unknown',
                        canvasHash: generateCanvasHash(),
                        webGlHash: generateWebGLHash()
                    }

                    const result = await PuchIn(fingerPrint, location, parsedUserData)

                    if (result.success) {
                        router.push('/success')
                    } else {
                        setStatus('error')
                        setMessage(`Error: ${result.error}`)
                    }
                }
            )
        } catch (error) {
            setStatus('error')
            setMessage(`Error: ${error.message}`)
        }
    }

    const handlePunchInWithoutLocation = async () => {
        try {
            setStatus('loading')
            setMessage('Processing punch in...')

            const userData = localStorage.getItem('userData')
            const parsedUserData = JSON.parse(userData)

            const location = {
                Lat: null,
                Long: null
            }

            const fingerPrint = {
                screen: `${window.screen.width}x${window.screen.height}`,
                cpuCore: navigator.hardwareConcurrency || 'unknown',
                memory: navigator.deviceMemory || 'unknown',
                canvasHash: generateCanvasHash(),
                webGlHash: generateWebGLHash()
            }

            const result = await PuchIn(fingerPrint, location, parsedUserData)

            if (result.success) {
                router.push('/success')
            } else {
                setStatus('error')
                setMessage(`Error: ${result.error}`)
            }
        } catch (error) {
            setStatus('error')
            setMessage(`Error: ${error.message}`)
        }
    }

    // Generate canvas fingerprint
    const generateCanvasHash = () => {
        try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            ctx.textBaseline = 'top'
            ctx.font = '14px Arial'
            ctx.fillText('fingerprint', 2, 2)
            return canvas.toDataURL().slice(-50)
        } catch {
            return 'unavailable'
        }
    }

    // Generate WebGL fingerprint
    const generateWebGLHash = () => {
        try {
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl')
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
            return debugInfo
                ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).slice(0, 20)
                : 'unavailable'
        } catch {
            return 'unavailable'
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                {status === 'checking' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-lg text-gray-700">Checking permissions...</p>
                    </div>
                )}

                {status === 'prompt' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                            <svg
                                className="h-8 w-8 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">Location Permission</h2>
                        <p className="text-sm text-gray-600 text-center">
                            We use your location to verify your punch in. This helps ensure accurate attendance tracking.
                        </p>
                        <button
                            onClick={handlePunchInWithLocation}
                            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Allow Location Permission
                        </button>
                        <button
                            onClick={handlePunchInWithoutLocation}
                            className="text-sm text-gray-500 underline hover:text-gray-700"
                        >
                            Decline location
                        </button>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-lg text-gray-700">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <svg
                                className="h-8 w-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <p className="text-xl font-semibold text-red-600">{message}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
