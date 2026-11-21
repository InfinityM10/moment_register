# Movement Register - Complete Deployment & Setup Guide

> **Complete documentation for deploying and configuring the Movement Register attendance system**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Codebase Structure](#codebase-structure)
4. [Appwrite Setup (Step-by-Step)](#appwrite-setup-step-by-step)
5. [Vercel Deployment (Step-by-Step)](#vercel-deployment-step-by-step)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Movement Register** is a Next.js-based employee attendance tracking system with the following features:

- **Manual Punch In/Out**: Employees scan NFC/QR codes to punch in and out
- **Location Verification**: GPS validation within 200-500m of office coordinates
- **Device Fingerprinting**: Browser-based device identification
- **Real-time Logs**: Live attendance timeline with working hours calculation
- **iOS Persistence**: Cloud-synced user profiles that survive localStorage clearing
- **Duplicate Detection**: Smart detection of duplicate punches

**Tech Stack:**
- Frontend: Next.js 15, React 19, TailwindCSS
- Backend: Appwrite (Database, Auth)
- Deployment: Vercel

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Device (Phone/PC)                │
│  - Scans NFC/QR → Opens /In or /out page                │
│  - Gets GPS location + generates device fingerprint      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│               Next.js App (Vercel Hosted)                │
│  - /In and /out pages (manual punch)                     │
│  - /logs page (real-time attendance view)                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│            Appwrite Cloud (Database + Auth)              │
│  - Stores all punch records                              │
│  - User authentication                                   │
│  - Real-time subscriptions                               │
└─────────────────────────────────────────────────────────┘
```

---

## Codebase Structure

```
moment_register/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── moment.js           # Server action: PuchIn, PunchOut functions
│   │   ├── In/
│   │   │   └── page.js             # Punch IN page
│   │   ├── out/
│   │   │   └── page.js             # Punch OUT page
│   │   ├── logs/
│   │   │   └── page.js             # Real-time attendance logs viewer
│   │   ├── login/
│   │   │   └── page.js             # Login page
│   │   ├── signup/
│   │   │   └── page.js             # Signup page
│   │   ├── register/
│   │   │   └── page.js             # User profile details form
│   │   ├── success/
│   │   │   └── page.js             # Success confirmation + redirect
│   │   ├── layout.js               # Root layout
│   │   ├── page.js                 # Home page
│   │   └── app.css                 # Global styles
│   ├── lib/
│   │   ├── appwrite.js             # Appwrite client config
│   │   └── AuthCheck.js            # Auth guard + iOS persistence fix
│   └── static/                     # Static assets
├── public/                         # Public assets
├── .env.local                      # Environment variables (NOT in git)
├── .gitignore
├── package.json
├── next.config.mjs
└── README.md
```

---

## Appwrite Setup (Step-by-Step)

### Step 1: Create Appwrite Account

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io)
2. Sign up with your email (e.g., `webadmin@cdhpm.com`)
3. Verify your email

### Step 2: Create a Project

1. Click **Create Project**
2. Enter project name: `moment_register` (or any name you prefer)
3. Select region closest to your users (e.g., Frankfurt for India/EU users)
4. Click **Create**
5. **Copy the Project ID** (looks like `69e6f9d80027facb390e`)

### Step 3: Create Database

1. In the left sidebar, click **Databases**
2. Click **Create Database**
3. Enter database name: `MovementLogs`
4. Click **Create**
5. **Copy the Database ID** (looks like `69e6fa5e003ce889edc0`)

### Step 4: Create Collection (Table)

1. Inside your database, click **Create Collection**
2. Enter collection name: `moment_register`
3. Click **Create**
4. **Copy the Collection ID** (could be custom ID like `moment_register` or auto-generated)

### Step 5: Configure Collection Attributes

Add the following attributes (click **Create Attribute** for each):

| Attribute Name | Type | Size | Required | Default |
|---|---|---|---|---|
| `Name` | String | 64 | ✅ Yes | - |
| `DeviceFingerPrint` | String | 100 | ✅ Yes | - |
| `Lat` | Float | - | ✅ Yes | 0 |
| `Long` | Float | - | ✅ Yes | 0 |
| `moment` | String | 10 | ✅ Yes | - |
| `designation` | String | 128 | ✅ Yes | - |
| `department` | String | 128 | ✅ Yes | - |

**Important:** After creating attributes, click **Settings** → **Update Permissions**

### Step 6: Set Collection Permissions

#### Option 1: Using Guest Access (Quick Setup)
1. Go to Collection → **Settings** → **Permissions**
2. Click **Add Role**
3. Select **Any** (allows unauthenticated access)
4. Enable permissions:
   - ✅ **Create**
   - ✅ **Read**
5. Click **Update**

#### Option 2: Using Server API Key (Recommended for Production)
1. Go to **Project Overview** → **API Keys**
2. Click **Create API Key**
3. Name: `moment_register_server`
4. Scopes: Enable **databases.write**, **databases.read**
5. Click **Create**
6. **Copy the API Key** (starts with something long)
7. Install server SDK:
   ```bash
   npm install node-appwrite
   ```
8. Update `src/lib/appwrite.js` to use server client with API key

### Step 7: Enable Auth Providers

1. Go to **Auth** in sidebar
2. Click **Settings**
3. Enable **Email/Password** authentication
4. Click **Update**

### Step 8: Get Endpoint URL

Your Appwrite endpoint will be based on your region:
- Frankfurt: `https://fra.cloud.appwrite.io/v1`
- Default: `https://cloud.appwrite.io/v1`

---

## Vercel Deployment (Step-by-Step)

### Step 1: Login to GitHub

1. Go to [github.com/login](https://github.com/login)
2. Login using `webadmin@cdhpm.com` credentials
3. Verify you can see the repository: [github.com/webadmin-cdhpm/moment_register](https://github.com/webadmin-cdhpm/moment_register)

### Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up**
3. Choose **Continue with GitHub**
4. Authorize Vercel to access your GitHub account
5. Select your organization: `webadmin-cdhpm`

### Step 3: Import Project

1. On Vercel dashboard, click **Add New** → **Project**
2. Find `webadmin-cdhpm/moment_register` in the list
3. Click **Import**
4. Configure project:
   - **Project Name**: `moment-register` (or any name)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)

### Step 4: Add Environment Variables

Before clicking Deploy, add these environment variables:

Click **Environment Variables** section and add:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id_here
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=moment_register
```

**Replace:**
- `your_project_id_here` → Your Appwrite Project ID (from Step 2)
- `your_database_id_here` → Your Appwrite Database ID (from Step 3)

### Step 5: Deploy

1. Click **Deploy**
2. Wait 2-3 minutes for build to complete
3. Once deployed, you'll get a URL like: `https://moment-register-xyz.vercel.app`
4. **Copy this URL** - you'll need it for cron setup

### Step 6: Test Deployment

1. Visit your Vercel URL
2. Click **Sign Up** and create a test account
3. Fill in profile details (Name, Designation, Department)
4. Click **Punch In**
5. Check Appwrite database - you should see a new record

---

## Environment Variables Reference

### Required Variables

| Variable | Example Value | Where to Find |
|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Based on Appwrite region |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `69e6f9d80027facb390e` | Appwrite → Project → Settings → Project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | `69e6fa5e003ce889edc0` | Appwrite → Databases → Your DB → ID below name |
| `NEXT_PUBLIC_APPWRITE_COLLECTION_ID` | `moment_register` | Appwrite → Database → Collection → ID below name |

### Local Development (.env.local)

Create a file named `.env.local` in project root:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=69e6f9d80027facb390e
NEXT_PUBLIC_APPWRITE_DATABASE_ID=69e6fa5e003ce889edc0
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=moment_register
```

---

## Testing & Verification

### Test 1: Manual Punch Flow

1. Visit `https://your-vercel-url.vercel.app`
2. Click **Sign Up**
3. Create account with email/password
4. Fill profile: Name = "Test User", Designation = "Developer", Department = "IT"
5. Click **Punch In**
6. Allow location when prompted
7. Should redirect to success page, then to cdhpm.com
8. Check Appwrite database - new record should appear

### Test 2: Logs Page

1. Visit `https://your-vercel-url.vercel.app/login`
2. Login with your account
3. Visit `https://your-vercel-url.vercel.app/logs`
4. Should see:
   - Your punch record in "Raw Logs" tab
   - Your name in "Currently In Office" panel
   - Timeline in "Working Hours" tab

### Test 3: iOS Persistence

1. Open app on iPhone Safari
2. Login and set profile details
3. Close Safari completely (swipe up to kill)
4. Reopen app
5. Should still be logged in with details intact ✅

---

## Troubleshooting

### Issue: "No permissions provided for action 'create'"

**Cause:** Appwrite collection doesn't have create permissions

**Fix:**
1. Go to Appwrite → Database → Collection → Settings → Permissions
2. Add role "Any" with "Create" checked
3. Or use server API key (see Appwrite Setup Step 6 Option 2)

### Issue: Vercel deployment fails

**Cause:** Missing environment variables or build errors

**Fix:**
1. Check Vercel deployment logs for specific error
2. Verify all 4 environment variables are set
3. Make sure Node.js version is 18+ (check `package.json` engines field)
4. Try redeploying: Vercel dashboard → Deployments → click "..." → Redeploy

### Issue: "Appwrite project paused"

**Cause:** Free tier projects pause after 7 days of inactivity

**Fix:**
1. Restore project in Appwrite dashboard
2. Upgrade to Pro plan ($15/month, no pausing)
3. Or ensure regular usage to keep project active

### Issue: Location validation fails

**Cause:** Coordinates don't match office location

**Fix:**
1. Update office coordinates in `src/app/actions/moment.js`:
   ```js
   const AceptalbeLocation = {
     lat: "13.249319",  // Your office latitude
     long: "79.113723"  // Your office longitude
   }
   ```
2. Or allow punch without location (set Lat/Long validation distance to higher value)

---

## Additional Configuration

### Update Office Location

Edit `src/app/actions/moment.js`:

```javascript
const AceptalbeLocation = {
  lat: "YOUR_OFFICE_LATITUDE",
  long: "YOUR_OFFICE_LONGITUDE"
}
```

Then commit and push:
```bash
git add src/app/actions/moment.js
git commit -m "Update office coordinates"
git push
```

Vercel will auto-deploy.

### Change Redirect After Punch

Edit `src/app/success/page.js` line 13:

```javascript
window.location.href = 'https://your-new-url.com'
```

---

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Enable Appwrite 2FA** - For admin account protection
3. **Use server API key** - Instead of "Any" permissions in production
4. **Monitor logs** - Check Vercel logs weekly
5. **Backup database** - Export Appwrite data monthly

---

## Support & Maintenance

### Regular Checks (Weekly)

- [ ] Check Appwrite project is active (not paused)
- [ ] Review Vercel deployment status
- [ ] Spot-check random attendance records

### Monthly Tasks

- [ ] Export Appwrite database backup
- [ ] Review and clear old logs (if needed)
- [ ] Check Vercel analytics for errors
- [ ] Update dependencies: `npm update`

### When Adding New Employees

1. They sign up at `/signup`
2. Fill profile at `/register`
3. Ready to use

---

## Quick Reference

**Live URLs:**
- App: `https://your-vercel-url.vercel.app`
- Punch In: `https://your-vercel-url.vercel.app/In`
- Punch Out: `https://your-vercel-url.vercel.app/out`
- Logs: `https://your-vercel-url.vercel.app/logs`

**Admin Dashboards:**
- GitHub: https://github.com/webadmin-cdhpm/moment_register
- Vercel: https://vercel.com/dashboard
- Appwrite: https://cloud.appwrite.io

**Key Files:**
- Manual punch logic: `src/app/actions/moment.js`
- Auth & persistence: `src/lib/AuthCheck.js`
- Logs viewer: `src/app/logs/page.js`

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2026  
**Author:** CDHPM Development Team
