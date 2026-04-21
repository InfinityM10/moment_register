'use client'

import { useEffect, useState } from 'react'

export default function SuccessPage() {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          window.location.href = 'https://www.cdhpm.com/'
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(countdownInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-green-500">
      <div className="flex flex-col items-center space-y-6 text-white">
        {/* Animated checkmark */}
        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-2xl animate-scale-in">
            <svg
              className="h-20 w-20 text-green-500 animate-check-draw"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success message */}
        <h1 className="text-4xl font-bold animate-fade-in">Success!</h1>

        {/* Countdown message */}
        <p className="text-xl animate-fade-in">
          Closes in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes check-draw {
          0% {
            stroke-dasharray: 0, 100;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dasharray: 100, 0;
            opacity: 1;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }

        .animate-check-draw {
          animation: check-draw 0.6s ease-out 0.3s forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out 0.8s forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
