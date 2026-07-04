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
  // Generate 3 unique random minutes between 5 and 15 for EOD (5:05 PM - 5:15 PM)
  let eod1 = getDeterministicRandom(`eod-1-${dateStr}`, 5, 15);
  let eod2 = getDeterministicRandom(`eod-2-${dateStr}`, 5, 15);
  let eod3 = getDeterministicRandom(`eod-3-${dateStr}`, 5, 15);

  // Ensure they are unique
  let attempts = 0;
  while ((eod1 === eod2 || eod1 === eod3 || eod2 === eod3) && attempts < 50) {
    if (eod1 === eod2) eod2 = ((eod2 - 5 + 1) % 11) + 5;
    if (eod1 === eod3 || eod2 === eod3) eod3 = ((eod3 - 5 + 2) % 11) + 5;
    attempts++;
  }

  // Sort EOD minutes so Aarsha is first, Shrinivas is second, and Manohar is third
  const sortedEodMins = [eod1, eod2, eod3].sort((a, b) => a - b);
  const aarshaEodMin = sortedEodMins[0];
  const shrinivasEodMin = sortedEodMins[1];
  const manoharEodMin = sortedEodMins[2];

  // Manohar Lunch (12:40 PM - 12:50 PM & 1:30 PM - 1:45 PM)
  const manoharLunchOutMin = getDeterministicRandom(`manohar-lunch-out-${dateStr}`, 40, 50);
  const manoharLunchInMin = getDeterministicRandom(`manohar-lunch-in-${dateStr}`, 30, 45);

  // Shrinivas Lunch (Ensure at least 1-minute separation from Manohar)
  let shrinivasLunchOutMin = getDeterministicRandom(`shrinivas-lunch-out-${dateStr}`, 40, 50);
  if (shrinivasLunchOutMin === manoharLunchOutMin) {
    shrinivasLunchOutMin = shrinivasLunchOutMin >= 50 ? shrinivasLunchOutMin - 1 : shrinivasLunchOutMin + 1;
  }
  let shrinivasLunchInMin = getDeterministicRandom(`shrinivas-lunch-in-${dateStr}`, 30, 45);
  if (shrinivasLunchInMin === manoharLunchInMin) {
    shrinivasLunchInMin = shrinivasLunchInMin >= 45 ? shrinivasLunchInMin - 1 : shrinivasLunchInMin + 1;
  }

  // Aarsha
  const aarshaLunchOutMin = getDeterministicRandom(`aarsha-lunch-out-${dateStr}`, 0, 30);    // 12:00 - 12:30
  const aarshaLunchInMin = getDeterministicRandom(`aarsha-lunch-in-${dateStr}`, 0, 59);      // 2:00 - 2:59

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
