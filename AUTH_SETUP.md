# Authentication Setup

## Overview
This app now includes email/password authentication using Appwrite. Users must be logged in to access the logs page.

## Features

### 1. Sign Up (`/signup`)
- New users can create an account with:
  - Email
  - Password (minimum 8 characters)
  - Name
  - Designation
  - Department
- Account is created in Appwrite
- User is automatically logged in after signup
- Redirects to home page

### 2. Login (`/login`)
- Existing users can log in with email and password
- Supports redirect parameter: `/login?redirect=/logs`
- After successful login, redirects to:
  - The page specified in redirect parameter (default: `/logs`)
  - Stores session in localStorage

### 3. Protected Routes
- **Logs Page (`/logs`)**: Requires authentication
  - If not logged in, redirects to `/login?redirect=/logs`
  - After login, automatically returns to logs page
  - Includes logout button in header

### 4. Home Page (`/`)
- Shows login/signup buttons if not authenticated
- Shows dashboard with punch in/out options if authenticated
- Includes logout button

## Authentication Flow

1. User visits `/logs` without being logged in
2. Automatically redirected to `/login?redirect=/logs`
3. User logs in with email/password
4. After successful login, redirected back to `/logs`

## Appwrite Setup Required

Make sure your Appwrite project has:
1. Email/Password authentication enabled
2. Proper CORS settings for your domain
3. Environment variables set in `.env`:
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT`
   - `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
   - `NEXT_PUBLIC_APPWRITE_COLLECTION_ID`

## Session Management

- Sessions are managed by Appwrite
- User data stored in localStorage for quick access
- Logout clears both Appwrite session and localStorage
