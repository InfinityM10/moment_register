'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect');
    const [formData, setFormData] = useState({
        name: '',
        designation: '',
        department: ''
    });
    const [loading, setLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        // Check if user data exists in localStorage
        const savedData = localStorage.getItem('userData');

        if (savedData) {
            // User already registered
            const parsedData = JSON.parse(savedData);

            // If there's a redirect URL, go there immediately
            if (redirectUrl) {
                router.push(redirectUrl);
                return;
            }

            // Otherwise, load the data to show profile
            setFormData({
                name: parsedData.name,
                designation: parsedData.designation,
                department: parsedData.department
            });

            setIsRegistered(true);
        }

        setLoading(false);
    }, [redirectUrl, router]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Save to localStorage
        const dataToSave = {
            name: formData.name,
            designation: formData.designation,
            department: formData.department,
            registeredAt: new Date().toISOString()
        };

        localStorage.setItem('userData', JSON.stringify(dataToSave));
        setIsRegistered(true);

        console.log('Form submitted and saved:', formData);
        

        // Redirect to the original page if redirect parameter exists, otherwise go home
        if (redirectUrl) {
            router.push(redirectUrl);
        } else {
            router.push('/');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Person Details
                    </h1>
                    {isRegistered && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                            Registered
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    <div>
                        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter your name"
                        />
                    </div>

                    {/* Designation Field */}
                    <div>
                        <label htmlFor="designation" className="mb-1 block text-sm font-medium text-gray-700">
                            Designation <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="designation"
                            name="designation"
                            value={formData.designation}
                            onChange={handleInputChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. Faculty, Student, Coordinator"
                        />
                    </div>

                    {/* Department Field */}
                    <div>
                        <label htmlFor="department" className="mb-1 block text-sm font-medium text-gray-700">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. SoT, MBA"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {redirectUrl?.includes('/In') ? 'Punch In' : redirectUrl?.includes('/out') ? 'Punch Out' : 'Save'}
                    </button>
                </form>

                {isRegistered && (
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to clear your registration data?')) {
                                localStorage.removeItem('userData');
                                setFormData({
                                    name: '',
                                    designation: '',
                                    department: ''
                                });
                                setIsRegistered(false);

                            }
                        }}
                        className="mt-4 w-full rounded-md border border-red-300 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Clear Registration Data
                    </button>
                )}
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
