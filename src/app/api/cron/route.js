import { NextResponse } from 'next/server';
import { databases } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

// Helper to generate a hash seed number from a string
function getSeedNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate random number within a range (min, max) deterministically based on seed string
function getDeterministicRandom(seedStr, min, max) {
  const seed = getSeedNumber(seedStr);
  const range = max - min + 1;
  return min + (seed % range);
}

// Calculates deterministic times for a specific date in YYYY-MM-DD format
export function getScheduleForDate(dateStr) {
  // Manohar & Shrinivas Lunch Out (12:40 PM - 12:50 PM)
  const lunchOutStart = getDeterministicRandom(`lunch-out-start-${dateStr}`, 40, 44);
  const lunchOutGap = getDeterministicRandom(`lunch-out-gap-${dateStr}`, 2, 5); // 2 to 5 mins gap
  const isManoharFirstLunchOut = getDeterministicRandom(`lunch-out-order-${dateStr}`, 0, 1) === 0;
  const manoharLunchOutMin = isManoharFirstLunchOut ? lunchOutStart : lunchOutStart + lunchOutGap;
  const shrinivasLunchOutMin = isManoharFirstLunchOut ? lunchOutStart + lunchOutGap : lunchOutStart;

  // Manohar & Shrinivas Lunch In (1:30 PM - 1:45 PM)
  const lunchInStart = getDeterministicRandom(`lunch-in-start-${dateStr}`, 30, 38);
  const lunchInGap = getDeterministicRandom(`lunch-in-gap-${dateStr}`, 2, 6); // 2 to 6 mins gap
  const isManoharFirstLunchIn = getDeterministicRandom(`lunch-in-order-${dateStr}`, 0, 1) === 0;
  const manoharLunchInMin = isManoharFirstLunchIn ? lunchInStart : lunchInStart + lunchInGap;
  const shrinivasLunchInMin = isManoharFirstLunchIn ? lunchInStart + lunchInGap : lunchInStart;

  // Aarsha Lunch Out (12:00 PM - 12:30 PM)
  const aarshaLunchOutMin = getDeterministicRandom(`aarsha-lunch-out-${dateStr}`, 0, 30);
  
  // Aarsha Lunch In (2:00 PM - 2:30 PM)
  const aarshaLunchInMin = getDeterministicRandom(`aarsha-lunch-in-${dateStr}`, 0, 30);

  // EOD Punch Out (5:05 PM - 5:15 PM)
  // Aarsha first, then Shrinivas, then Manohar
  const aarshaEodMin = getDeterministicRandom(`aarsha-eod-${dateStr}`, 5, 7);
  const gap1 = getDeterministicRandom(`eod-gap1-${dateStr}`, 2, 4); // 2 to 4 mins gap
  const shrinivasEodMin = aarshaEodMin + gap1;
  const gap2 = getDeterministicRandom(`eod-gap2-${dateStr}`, 2, 4); // 2 to 4 mins gap
  const manoharEodMin = shrinivasEodMin + gap2;

  return {
    manohar: {
      lunchOut: { hour: 12, minute: manoharLunchOutMin },
      lunchIn: { hour: 13, minute: manoharLunchInMin },
      eod: { hour: 17, minute: manoharEodMin }
    },
    shrinivas: {
      lunchOut: { hour: 12, minute: shrinivasLunchOutMin },
      lunchIn: { hour: 13, minute: shrinivasLunchInMin },
      eod: { hour: 17, minute: shrinivasEodMin }
    },
    aarsha: {
      lunchOut: { hour: 12, minute: aarshaLunchOutMin },
      lunchIn: { hour: 14, minute: aarshaLunchInMin },
      eod: { hour: 17, minute: aarshaEodMin }
    }
  };
}

// Get the ISO string of the start of today in Asia/Kolkata timezone
function getIstStartOfDayIso(now) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istTime = new Date(utcTime + istOffset);
  
  istTime.setHours(0, 0, 0, 0);
  
  const startOfDayUtc = new Date(istTime.getTime() - istOffset);
  return startOfDayUtc.toISOString();
}

const targetKeys = ['manohar', 'shrinivas', 'aarsha'];

// Match a target key word from the user's name case-insensitively
function getTargetKey(name) {
  if (!name) return null;
  const words = name.toLowerCase().trim().split(/\s+/);
  for (const word of words) {
    if (targetKeys.includes(word)) {
      return word;
    }
  }
  return null;
}

// Helper to verify if scheduled time has passed
function isTimePassed(scheduledTime, currentHour, currentMin) {
  if (currentHour > scheduledTime.hour) return true;
  if (currentHour === scheduledTime.hour && currentMin >= scheduledTime.minute) return true;
  return false;
}

export async function GET(request) {
  try {
    // 1. Authentication Check
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && secretParam !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Determine Current Time in IST
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const currentHour = parseInt(partMap.hour, 10);
    const currentMin = parseInt(partMap.minute, 10);

    const schedules = getScheduleForDate(dateStr);
    const startOfTodayIso = getIstStartOfDayIso(now);

    // 3. Fetch today's logs from Appwrite database
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID,
      [
        Query.greaterThanEqual('$createdAt', startOfTodayIso),
        Query.limit(100),
        Query.orderAsc('$createdAt')
      ]
    );

    const todaysLogs = response.documents;

    // Group logs by target user key
    const userLogs = {
      manohar: [],
      shrinivas: [],
      aarsha: []
    };

    for (const log of todaysLogs) {
      const key = getTargetKey(log.Name);
      if (key) {
        userLogs[key].push(log);
      }
    }

    const processedLogs = [];

    // 4. Process each target user
    for (const key of targetKeys) {
      const logs = userLogs[key];
      const schedule = schedules[key];

      // Skip if they haven't manually punched in today
      if (logs.length === 0 || logs[0].moment !== 'in') {
        continue;
      }

      const morningIn = logs[0];

      // Logic to find next scheduled punch:
      // Index 0: Morning In (already exists)
      // Index 1: Lunch Out (Auto)
      // Index 2: Lunch In (Auto)
      // Index 3: EOD Out (Auto)
      
      let nextAction = null;
      let nextMomentType = '';

      if (logs.length === 1) {
        if (isTimePassed(schedule.lunchOut, currentHour, currentMin)) {
          nextAction = schedule.lunchOut;
          nextMomentType = 'out';
        }
      } else if (logs.length === 2) {
        if (isTimePassed(schedule.lunchIn, currentHour, currentMin)) {
          nextAction = schedule.lunchIn;
          nextMomentType = 'in';
        }
      } else if (logs.length === 3) {
        if (isTimePassed(schedule.eod, currentHour, currentMin)) {
          nextAction = schedule.eod;
          nextMomentType = 'out';
        }
      }

      // If an action is due, perform the punch
      if (nextAction && nextMomentType) {
        // Copy the properties from their original manual punch-in
        const newPunch = {
          Name: morningIn.Name,
          DeviceFingerPrint: morningIn.DeviceFingerPrint,
          Lat: morningIn.Lat,
          Long: morningIn.Long,
          moment: nextMomentType,
          designation: morningIn.designation,
          department: morningIn.department
        };

        const docResponse = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID,
          ID.unique(),
          newPunch
        );

        processedLogs.push({
          user: key,
          action: nextMomentType,
          scheduledTime: `${nextAction.hour}:${nextAction.minute.toString().padStart(2, '0')}`,
          documentId: docResponse.$id
        });
      }
    }

    return NextResponse.json({
      success: true,
      timeChecked: `${currentHour}:${currentMin.toString().padStart(2, '0')} IST`,
      date: dateStr,
      schedules: schedules,
      processed: processedLogs
    });

  } catch (error) {
    console.error('Error in auto punch cron:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
