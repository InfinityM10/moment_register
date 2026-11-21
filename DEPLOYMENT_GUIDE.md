# Movement Register - Complete Deployment & Setup Guide

> **Complete documentation for deploying and configuring the Movement Register attendance system**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Codebase Structure](#codebase-structure)
4. [Appwrite Setup (Step-by-Step)](#appwrite-setup-step-by-step)
5. [Vercel Deployment (Step-by-Step)](#vercel-deployment-step-by-step)
6. [Cron Job Configuration](#cron-job-configuration)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Auto-Punch System Explained](#auto-punch-system-explained)
9. [Testing & Verification](#testing--verification)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Movement Register** is a Next.js-based employee attendance tracking system with the following features:

- **Manual Punch In/Out**: Employees scan NFC/QR codes to punch in and out
- **Location Verification**: GPS validation within 200-500m of office coordinates
- **Device Fingerprinting**: Browser-based device identification
- **Automatic Punches**: Auto punch-out for lunch, auto punch-in after lunch, and auto EOD punch-out for specific users
- **Real-time Logs**: Live attendance timeline with working hours calculation
- **iOS Persistence**: Cloud-synced user profiles that survive localStorage clearing
- **Duplicate Detection**: Smart detection of duplicate punches

**Tech Stack:**
- Frontend: Next.js 15, React 19, TailwindCSS
- Backend: Appwrite (Database, Auth)
- Deployment: Vercel
- Automation: cron-job.org (for auto-punches)

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
│  - /api/cron (auto-punch endpoint)                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│            Appwrite Cloud (Database + Auth)              │
│  - Stores all punch records                              │
│  - User authentication                                   │
│  - Real-time subscriptions                               │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │
┌───────────────────────┴─────────────────────────────────┐
│                   cron-job.org                           │
│  - Calls /api/cron every 1 minute                        │
│  - Triggers auto lunch/EOD punches                       │
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
│   │   ├── api/
│   │   │   └── cron/
│   │   │       └── route.js        # Auto-punch API endpoint
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
CRON_SECRET=your_secure_random_secret_here
```

**Replace:**
- `your_project_id_here` → Your Appwrite Project ID (from Step 2)
- `your_database_id_here` → Your Appwrite Database ID (from Step 3)
- `your_secure_random_secret_here` → Any random string (e.g., `cdhpm_cron_secret_2024`)

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

## Cron Job Configuration

The automatic lunch/EOD punches require a background scheduler to call `/api/cron` every minute.

### Step 1: Create cron-job.org Account

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for a free account
3. Verify your email
4. Login to dashboard

### Step 2: Create First Cron Job (Keep Appwrite Alive)

1. Click **Create Cronjob**
2. Fill in:
   - **Title**: `Appwrite Keep Alive`
   - **Address**: `https://fra.cloud.appwrite.io/v1/locale/countries`
   - **Schedule**: Every day at **8:00** AM
   - **Headers**: 
     - Name: `X-Appwrite-Project`
     - Value: `your_project_id`
3. Click **Create**

> This prevents Appwrite free tier from pausing after 7 days of inactivity

### Step 3: Create Second Cron Job (Auto Punches)

1. Click **Create Cronjob**
2. Fill in:
   - **Title**: `Movement Register Auto Punch`
   - **Address**: `https://your-vercel-url.vercel.app/api/cron?secret=your_cron_secret`
   - **Schedule**: **Every 1 minute**
   - **Request Method**: GET
3. Click **Create**

**Important:** Replace:
- `your-vercel-url.vercel.app` → Your actual Vercel domain
- `your_cron_secret` → Same value you used in `CRON_SECRET` env variable

### Step 4: Test Cron Job

1. In cron-job.org dashboard, find your auto-punch job
2. Click the **▶ Run now** button
3. Click **Logs** tab
4. You should see status **200** with JSON response showing today's schedules

Example response:
```json
{
  "success": true,
  "timeChecked": "14:23 IST",
  "date": "2026-11-21",
  "schedules": {
    "manohar": {
      "lunchOut": {"hour": 12, "minute": 43},
      "lunchIn": {"hour": 13, "minute": 36},
      "eod": {"hour": 17, "minute": 10}
    },
    ...
  },
  "processed": []
}
```

---

## Environment Variables Reference

### Required Variables

| Variable | Example Value | Where to Find |
|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Based on Appwrite region |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `69e6f9d80027facb390e` | Appwrite → Project → Settings → Project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | `69e6fa5e003ce889edc0` | Appwrite → Databases → Your DB → ID below name |
| `NEXT_PUBLIC_APPWRITE_COLLECTION_ID` | `moment_register` | Appwrite → Database → Collection → ID below name |
| `CRON_SECRET` | `cdhpm_cron_secret_2024` | Any random string you create |

### Local Development (.env.local)

Create a file named `.env.local` in project root:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=69e6f9d80027facb390e
NEXT_PUBLIC_APPWRITE_DATABASE_ID=69e6fa5e003ce889edc0
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=moment_register
CRON_SECRET=my_local_test_secret
```

---

## Auto-Punch System Explained

### How It Works

1. **Morning Manual Punch**: User manually punches in between 8-10 AM
2. **Cron Trigger**: Every minute, cron-job.org calls `/api/cron`
3. **Schedule Generation**: Server calculates random times for today based on date seed
4. **Smart Detection**: Checks if scheduled time has passed AND user needs that punch
5. **Auto Insertion**: Creates new punch record in Appwrite with exact coordinates from morning

### Users Affected

Only 3 users get auto-punches (detected by first name match):
- **Manohar** (any last name)
- **Shrinivas** (any last name)
- **Aarsha** (any last name)

### Timing Rules

| Event | Manohar & Shrinivas | Aarsha |
|---|---|---|
| **Lunch Out** | 12:40 - 12:50 PM (random) | 12:00 - 12:30 PM (random) |
| **Lunch In** | 1:30 - 1:45 PM (random) | 2:00 - 2:30 PM (random) |
| **EOD Out** | 5:05 - 5:15 PM (Aarsha first, then Shrinivas, then Manohar, 2-4 min gaps) |

### Manual Punches Don't Break Auto-Punches

Example scenario:
```
9:00 AM  → Manual Punch IN
11:00 AM → Manual Punch OUT (personal break)
11:30 AM → Manual Punch IN
12:43 PM → AUTO Lunch Punch OUT ✅ (still fires correctly)
1:36 PM  → AUTO Lunch Punch IN ✅
3:00 PM  → Manual Punch OUT (another break)
3:30 PM  → Manual Punch IN
5:10 PM  → AUTO EOD Punch OUT ✅
```

The system checks if a lunch/EOD punch already exists **at or after the scheduled time window**, not total punch count.

### Self-Healing for Late Arrivals

If a user punches in at 2:00 PM (past both lunch windows):
1. Next cron run creates lunch-out immediately
2. Following cron run creates lunch-in immediately
3. System waits for 5:05 PM to create EOD punch

All auto-punches catch up in correct sequence.

---

## Testing & Verification

### Test 1: Manual Punch Flow

1. Visit `https://your-vercel-url.vercel.app`
2. Click **Sign Up**
3. Create account with email/password
4. Fill profile: Name = "Manohar Test", Designation = "Developer", Department = "IT"
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

### Test 3: Auto-Punch (Cron)

1. Login to cron-job.org
2. Find your auto-punch job
3. Click **▶ Run now**
4. Click **Logs** tab
5. Check response:
   - `success: true` ✅
   - `schedules` shows today's times ✅
   - `processed` array (empty if no punches due yet) ✅

### Test 4: iOS Persistence

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

### Issue: Auto-punches not firing

**Cause 1:** Cron job not calling endpoint

**Fix:**
1. Check cron-job.org logs for 200 status
2. Verify URL includes correct `?secret=` parameter
3. Make sure schedule is "Every 1 minute"

**Cause 2:** User name doesn't match

**Fix:**
1. User's first name must be exactly "manohar", "shrinivas", or "aarsha" (case insensitive)
2. Check Appwrite records - Name field should contain one of these words

**Cause 3:** No morning manual punch

**Fix:**
1. User must manually punch IN before auto-punches work
2. Check Appwrite - first punch of the day must have `moment: "in"`

### Issue: Vercel deployment fails

**Cause:** Missing environment variables or build errors

**Fix:**
1. Check Vercel deployment logs for specific error
2. Verify all 5 environment variables are set
3. Make sure Node.js version is 18+ (check `package.json` engines field)
4. Try redeploying: Vercel dashboard → Deployments → click "..." → Redeploy

### Issue: "Appwrite project paused"

**Cause:** Free tier projects pause after 7 days of inactivity

**Fix:**
1. Restore project in Appwrite dashboard
2. Make sure "Appwrite Keep Alive" cron job is running daily
3. Or upgrade to Pro plan ($15/month, no pausing)

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

### Add More Auto-Punch Users

Edit `src/app/api/cron/route.js` line 109:

```javascript
const targetKeys = ['manohar', 'shrinivas', 'aarsha', 'newuser'];
```

Add timing configuration in `getScheduleForDate()` function.

### Change Redirect After Punch

Edit `src/app/success/page.js` line 13:

```javascript
window.location.href = 'https://your-new-url.com'
```

### Customize Lunch Timing Ranges

Edit `src/app/api/cron/route.js` lines 24-58 in `getScheduleForDate()` function.

---

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use strong CRON_SECRET** - Random 32+ character string
3. **Enable Appwrite 2FA** - For admin account protection
4. **Use server API key** - Instead of "Any" permissions in production
5. **Rotate tokens regularly** - Change CRON_SECRET every 6 months
6. **Monitor logs** - Check Vercel and cron-job.org logs weekly
7. **Backup database** - Export Appwrite data monthly

---

## Support & Maintenance

### Regular Checks (Weekly)

- [ ] Verify cron job is running (check cron-job.org logs)
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
3. If auto-punch needed: Add name to `targetKeys` array
4. Redeploy

---

## Quick Reference

**Live URLs:**
- App: `https://your-vercel-url.vercel.app`
- Punch In: `https://your-vercel-url.vercel.app/In`
- Punch Out: `https://your-vercel-url.vercel.app/out`
- Logs: `https://your-vercel-url.vercel.app/logs`
- Cron Endpoint: `https://your-vercel-url.vercel.app/api/cron?secret=xxx`

**Admin Dashboards:**
- GitHub: https://github.com/webadmin-cdhpm/moment_register
- Vercel: https://vercel.com/dashboard
- Appwrite: https://cloud.appwrite.io
- Cron: https://cron-job.org

**Key Files:**
- Manual punch logic: `src/app/actions/moment.js`
- Auto-punch logic: `src/app/api/cron/route.js`
- Auth & persistence: `src/lib/AuthCheck.js`
- Logs viewer: `src/app/logs/page.js`

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2026  
**Author:** CDHPM Development Team
