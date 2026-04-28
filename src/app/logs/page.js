'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { databases, account, client } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useRouter } from 'next/navigation'

export default function LogsPage() {
    const router = useRouter()
    const [logs, setLogs] = useState([])
    const [inOfficePeople, setInOfficePeople] = useState([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [lastDocId, setLastDocId] = useState(null)
    const [activeView, setActiveView] = useState('working-hours') // 'logs' or 'working-hours'
    const [showDuplicates, setShowDuplicates] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const observerTarget = useRef(null)

    const LOGS_PER_PAGE = 50

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                await account.get()
                setIsAuthenticated(true)
            } catch (error) {
                // Not authenticated, redirect to login
                router.push('/login?redirect=/logs')
            }
        }
        checkAuth()
    }, [router])

    // Calculate who's currently in office based on today's logs only
    const calculateInOffice = useCallback((allLogs) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Filter logs to only include today's logs
        const todaysLogs = allLogs.filter(log => {
            const logDate = new Date(log.$createdAt)
            logDate.setHours(0, 0, 0, 0)
            return logDate.getTime() === today.getTime()
        })

        const lastPunchByPerson = {}

        // Process today's logs to find last punch for each person
        todaysLogs.forEach(log => {
            const name = log.Name
            if (!lastPunchByPerson[name] || new Date(log.$createdAt) > new Date(lastPunchByPerson[name].$createdAt)) {
                lastPunchByPerson[name] = log
            }
        })

        // Filter people whose last punch was "in"
        const inOffice = Object.values(lastPunchByPerson)
            .filter(log => log.moment === 'in')
            .map(log => ({
                name: log.Name,
                department: log.department,
                designation: log.designation,
                lastPunch: log.$createdAt
            }))

        setInOfficePeople(inOffice)
    }, [])

    // Fetch logs with pagination
    const fetchLogs = useCallback(async (isInitial = false) => {
        if (loading || (!hasMore && !isInitial)) return

        setLoading(true)
        try {
            const queries = [
                Query.orderDesc('$createdAt'),
                Query.limit(LOGS_PER_PAGE)
            ]

            if (!isInitial && lastDocId) {
                queries.push(Query.cursorAfter(lastDocId))
            }

            const response = await databases.listDocuments(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
                process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID,
                queries
            )

            const newLogs = response.documents

            if (newLogs.length < LOGS_PER_PAGE) {
                setHasMore(false)
            }

            if (newLogs.length > 0) {
                setLogs(prevLogs => {
                    const updatedLogs = isInitial ? newLogs : [...prevLogs, ...newLogs]
                    calculateInOffice(updatedLogs)
                    return updatedLogs
                })
                setLastDocId(newLogs[newLogs.length - 1].$id)
            }
        } catch (error) {
            console.error('Error fetching logs:', error)
        } finally {
            setLoading(false)
        }
    }, [loading, hasMore, lastDocId, calculateInOffice])

    // Initial load - only after authentication is confirmed
    useEffect(() => {
        if (isAuthenticated) {
            fetchLogs(true)
        }
    }, [isAuthenticated])

    // Realtime subscription - only after authentication is confirmed
    useEffect(() => {
        if (!isAuthenticated) return

        const unsubscribe = client.subscribe(
            `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID}.documents`,
            (response) => {
                // Handle new document creation
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    const newLog = response.payload
                    setLogs(prevLogs => {
                        const updatedLogs = [newLog, ...prevLogs]
                        calculateInOffice(updatedLogs)
                        return updatedLogs
                    })
                }
            }
        )

        return () => {
            unsubscribe()
        }
    }, [isAuthenticated, calculateInOffice])

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    fetchLogs()
                }
            },
            { threshold: 0.1 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current)
            }
        }
    }, [hasMore, loading, fetchLogs])

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDateOnly = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    // Process logs into working hours view
    const processWorkingHours = useCallback(() => {
        const groupedByDate = {}

        logs.forEach(log => {
            const date = new Date(log.$createdAt).toDateString()
            if (!groupedByDate[date]) {
                groupedByDate[date] = {}
            }
            if (!groupedByDate[date][log.Name]) {
                groupedByDate[date][log.Name] = {
                    name: log.Name,
                    designation: log.designation,
                    department: log.department,
                    punches: []
                }
            }
            groupedByDate[date][log.Name].punches.push({
                time: log.$createdAt,
                moment: log.moment
            })
        })

        // Sort punches by time for each person and mark duplicates
        Object.keys(groupedByDate).forEach(date => {
            Object.keys(groupedByDate[date]).forEach(name => {
                const punches = groupedByDate[date][name].punches
                punches.sort((a, b) => new Date(a.time) - new Date(b.time))

                // Mark duplicate punches
                for (let i = 0; i < punches.length; i++) {
                    const curr = punches[i]

                    // Look back to find the last non-duplicate punch
                    for (let j = i - 1; j >= 0; j--) {
                        const prev = punches[j]

                        // Skip if already marked as duplicate
                        if (prev.isDuplicate) continue

                        const timeDiff = (new Date(curr.time) - new Date(prev.time)) / (1000 * 60)

                        // Case 1: Same type within 20 minutes - mark as duplicate
                        if (prev.moment === curr.moment && timeDiff <= 20) {
                            curr.isDuplicate = true
                            break
                        }

                        // Case 2: Different type (IN/OUT or OUT/IN) within 5 minutes - mark as duplicate
                        if (prev.moment !== curr.moment && timeDiff <= 5) {
                            curr.isDuplicate = true
                            break
                        }

                        // If different type and more than 5 minutes, stop looking back
                        if (prev.moment !== curr.moment) break
                    }
                }
            })
        })

        return groupedByDate
    }, [logs])

    const buildPunchTimeline = (punches) => {
        const timeline = []
        let hasError = false

        // Filter out duplicates for timeline processing
        const validPunches = punches.filter(p => !p.isDuplicate)

        for (let i = 0; i < punches.length; i++) {
            const current = punches[i]

            // Add current punch (including duplicates)
            timeline.push({
                type: 'punch',
                moment: current.moment,
                time: current.time,
                isDuplicate: current.isDuplicate || false
            })

            // Skip timeline logic for duplicates
            if (current.isDuplicate) {
                continue
            }

            // Find next valid (non-duplicate) punch
            let next = null
            for (let j = i + 1; j < punches.length; j++) {
                if (!punches[j].isDuplicate) {
                    next = punches[j]
                    break
                }
            }

            // Check what comes after this punch
            if (next) {
                // Two consecutive "in" punches - missing punch out
                if (current.moment === 'in' && next.moment === 'in') {
                    hasError = true
                    timeline.push({
                        type: 'error',
                        message: 'Missed punch out'
                    })
                }
                // Two consecutive "out" punches - missing punch in
                else if (current.moment === 'out' && next.moment === 'out') {
                    hasError = true
                    timeline.push({
                        type: 'error',
                        message: 'Punched out without punching in'
                    })
                }
                // Normal break (punch out followed by punch in)
                else if (current.moment === 'out' && next.moment === 'in') {
                    const breakDuration = (new Date(next.time) - new Date(current.time)) / (1000 * 60)
                    // Only show break if it's more than 5 minutes (otherwise it's likely a duplicate pair)
                    if (breakDuration > 5) {
                        timeline.push({
                            type: 'break',
                            duration: Math.round(breakDuration)
                        })
                    }
                }
            } else {
                // Last valid punch - check if it's an incomplete day
                if (current.moment === 'in') {
                    // Only show error if the day has ended (after 5 PM)
                    const punchDate = new Date(current.time)
                    const now = new Date()
                    const endOfWorkDay = new Date(punchDate)
                    endOfWorkDay.setHours(17, 0, 0, 0) // 5 PM

                    // Only flag as error if current time is past 5 PM on the same day
                    // or if it's a different day entirely
                    const isDifferentDay = punchDate.toDateString() !== now.toDateString()
                    const isPastEndOfDay = now > endOfWorkDay && punchDate.toDateString() === now.toDateString()

                    if (isDifferentDay || isPastEndOfDay) {
                        hasError = true
                        timeline.push({
                            type: 'error',
                            message: 'Missed to punch out at end of day'
                        })
                    }
                }
            }
        }

        // Check if day started with punch out (excluding duplicates)
        if (validPunches.length > 0 && validPunches[0].moment === 'out') {
            hasError = true
        }

        return { timeline, hasError }
    }

    const workingHoursData = processWorkingHours()

    // Show loading screen while checking authentication
    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">Movement Logs</h1>
                        <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-green-800">LIVE</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-700"
                        >
                            Home
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await account.deleteSession('current')
                                    localStorage.removeItem('userData')
                                    localStorage.removeItem('userSession')
                                    router.push('/login')
                                } catch (error) {
                                    console.error('Logout error:', error)
                                }
                            }}
                            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setActiveView('working-hours')}
                        className={`rounded-lg px-6 py-2 font-semibold transition-colors ${activeView === 'working-hours'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Working Hours
                    </button>
                    <button
                        onClick={() => setActiveView('logs')}
                        className={`rounded-lg px-6 py-2 font-semibold transition-colors ${activeView === 'logs'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Raw Logs
                    </button>
                </div>

                {/* Currently In Office Panel */}
                <div className="mb-6 rounded-lg bg-white p-6 shadow">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800">
                        Currently In Office ({inOfficePeople.length})
                    </h2>
                    {inOfficePeople.length === 0 ? (
                        <p className="text-gray-500">No one is currently in the office</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {inOfficePeople.map((person, index) => (
                                <div
                                    key={index}
                                    className="rounded-md border border-green-200 bg-green-50 p-3"
                                >
                                    <p className="font-semibold text-gray-900">{person.name}</p>
                                    <p className="text-sm text-gray-600">{person.designation}</p>
                                    <p className="text-xs text-gray-500">{person.department}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Show Duplicates Toggle - Only visible in Working Hours view */}
                {activeView === 'working-hours' && (
                    <div className="sticky top-0 z-10 mb-6 rounded-lg bg-white p-4 shadow">
                        <div className="flex items-center justify-between">
                            <label htmlFor="show-duplicates" className="text-sm font-medium text-gray-700">
                                Show Duplicate Punches
                            </label>
                            <button
                                id="show-duplicates"
                                onClick={() => setShowDuplicates(!showDuplicates)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showDuplicates ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showDuplicates ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                {/* Raw Logs View */}
                {activeView === 'logs' && (
                    <div className="rounded-lg bg-white shadow">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            Designation
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            Department
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            Action
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            Time
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            Location
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.$id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.Name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{log.designation}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{log.department}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${log.moment === 'in'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}
                                                >
                                                    {log.moment === 'in' ? '→ Punch In' : '← Punch Out'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatDate(log.$createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.Lat === 0 && log.Long === 0 ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                                        </svg>
                                                        No Location
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                        </svg>
                                                        Located
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {loading && (
                            <div className="flex justify-center p-4">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                            </div>
                        )}

                        <div ref={observerTarget} className="h-4" />

                        {!hasMore && logs.length > 0 && (
                            <div className="p-4 text-center text-sm text-gray-500">
                                No more logs to load
                            </div>
                        )}

                        {!loading && logs.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No logs found
                            </div>
                        )}
                    </div>
                )}

                {/* Working Hours View */}
                {activeView === 'working-hours' && (
                    <div className="space-y-6">
                        {loading && logs.length === 0 ? (
                            // Skeleton loader
                            <div className="space-y-6">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="rounded-lg bg-white shadow animate-pulse">
                                        <div className="border-b bg-gray-50 px-6 py-4">
                                            <div className="h-6 bg-gray-200 rounded w-48"></div>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            {[1, 2, 3].map((row) => (
                                                <div key={row} className="flex gap-4">
                                                    <div className="w-1/4">
                                                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                                        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                                                    </div>
                                                    <div className="w-2/4 space-y-2">
                                                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                                                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                                                    </div>
                                                    <div className="w-1/4">
                                                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : Object.keys(workingHoursData).length === 0 ? (
                            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                                No working hours data available
                            </div>
                        ) : (
                            Object.keys(workingHoursData)
                                .sort((a, b) => new Date(b) - new Date(a))
                                .map(date => (
                                    <div key={date} className="rounded-lg bg-white shadow">
                                        <div className="border-b bg-gray-50 px-6 py-4">
                                            <h2 className="text-lg font-semibold text-gray-900">
                                                {formatDateOnly(date)}
                                            </h2>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {Object.values(workingHoursData[date]).map((employee, idx) => {
                                                const { timeline, hasError } = buildPunchTimeline(employee.punches)

                                                return (
                                                    <div key={idx} className={`rounded-lg border p-3 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        {/* Employee Info */}
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    {employee.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {employee.designation} • {employee.department}
                                                                </p>
                                                            </div>
                                                            {hasError && (
                                                                <span className="text-xs font-medium text-red-600">
                                                                    ⚠ Incomplete
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Timeline - Horizontal Rectangles */}
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {timeline
                                                                .filter(item => showDuplicates || !item.isDuplicate)
                                                                .map((item, itemIdx) => {
                                                                    if (item.type === 'punch') {
                                                                        return (
                                                                            <div
                                                                                key={itemIdx}
                                                                                className={`flex items-center gap-1.5 rounded px-2.5 py-1 ${item.isDuplicate
                                                                                    ? 'bg-gray-200 text-gray-500'
                                                                                    : item.moment === 'in'
                                                                                        ? 'bg-green-500 text-white'
                                                                                        : 'bg-red-500 text-white'
                                                                                    }`}
                                                                            >
                                                                                <span className={`text-xs font-semibold ${item.isDuplicate ? 'line-through' : ''}`}>
                                                                                    {item.moment === 'in' ? 'IN' : 'OUT'}
                                                                                </span>
                                                                                <span className={`text-xs font-medium ${item.isDuplicate ? 'line-through' : ''}`}>
                                                                                    {formatTime(item.time)}
                                                                                </span>
                                                                                {item.isDuplicate && (
                                                                                    <span className="text-xs italic">
                                                                                        (dup)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    } else if (item.type === 'break') {
                                                                        return (
                                                                            <div
                                                                                key={itemIdx}
                                                                                className="flex items-center gap-1 rounded bg-blue-100 px-2.5 py-1 text-blue-700"
                                                                            >
                                                                                <span className="text-xs">{"<--"}</span>
                                                                                <span className="text-xs font-medium">
                                                                                    {item.duration > 59
                                                                                        ? `${Math.round(item.duration / 60)}h`
                                                                                        : `${item.duration}m`}
                                                                                </span>
                                                                                <span className="text-xs">{"-->"}</span>
                                                                            </div>
                                                                        )
                                                                    } else if (item.type === 'error') {
                                                                        return (
                                                                            <div
                                                                                key={itemIdx}
                                                                                className="flex items-center gap-1 rounded bg-red-200 px-2.5 py-1 text-red-800"
                                                                            >
                                                                                <span className="text-xs font-medium">
                                                                                    ⚠ {item.message}
                                                                                </span>
                                                                            </div>
                                                                        )
                                                                    }
                                                                })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                        )}

                        {loading && logs.length > 0 && (
                            <div className="flex justify-center p-4">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                            </div>
                        )}

                        <div ref={observerTarget} className="h-4" />

                        {!hasMore && logs.length > 0 && (
                            <div className="p-4 text-center text-sm text-gray-500">
                                No more logs to load
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
