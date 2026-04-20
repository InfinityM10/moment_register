'use server'

import { databases } from '@/lib/appwrite'
import { ID } from 'appwrite'

// Calculate distance between two coordinates in meters using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export async function PuchIn(fingerPrint, Location, userData) {
  const { screen, cpuCore, memory, canvasHash, webGlHash } = fingerPrint
  const { Lat, Long } = Location
  const { name, designation, department } = userData
  const AceptalbeLocation = {
    lat: "13.249319",
    long: "79.113723"
  }

  // Only validate location if coordinates are provided
  if (Lat !== null && Long !== null) {
    const distance = calculateDistance(
      parseFloat(Lat),
      parseFloat(Long),
      parseFloat(AceptalbeLocation.lat),
      parseFloat(AceptalbeLocation.long)
    )

    if (distance > 200) {
      return {
        success: false,
        error: 'Location error: You must be within 300 meters of the office location'
      }
    }
  }

  // Create device fingerprint string (max 100 chars)
  const deviceFingerPrint = `${screen}_${cpuCore}_${memory}_${canvasHash}_${webGlHash}`.substring(
    0,
    100
  )

  try {
    const response = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID,
      ID.unique(),
      {
        Name: name.substring(0, 64),
        DeviceFingerPrint: deviceFingerPrint,
        Lat: Lat !== null ? parseFloat(Lat) : 0,
        Long: Long !== null ? parseFloat(Long) : 0,
        moment: 'in',
        designation: designation.substring(0, 128),
        department: department.substring(0, 128)
      }
    )

    return { success: true, data: response }
  } catch (error) {
    console.error('Error creating punch in record:', error)
    return { success: false, error: error.message }
  }
}

export async function PunchOut(fingerPrint, Location, userData) {
  const { screen, cpuCore, memory, canvasHash, webGlHash } = fingerPrint
  const { Lat, Long } = Location
  const { name, designation, department } = userData
  const AceptalbeLocation = {
    lat: "13.249319",
    long: "79.113723"
  }

  // Only validate location if coordinates are provided
  if (Lat !== null && Long !== null) {
    const distance = calculateDistance(
      parseFloat(Lat),
      parseFloat(Long),
      parseFloat(AceptalbeLocation.lat),
      parseFloat(AceptalbeLocation.long)
    )

    if (distance > 500) {
      return {
        success: false,
        error: 'Location error: You must be within 500 meters of the office location'
      }
    }
  }

  // Create device fingerprint string (max 100 chars)
  const deviceFingerPrint = `${screen}_${cpuCore}_${memory}_${canvasHash}_${webGlHash}`.substring(
    0,
    100
  )

  try {
    const response = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID,
      ID.unique(),
      {
        Name: name.substring(0, 64),
        DeviceFingerPrint: deviceFingerPrint,
        Lat: Lat !== null ? parseFloat(Lat) : 0,
        Long: Long !== null ? parseFloat(Long) : 0,
        moment: 'out',
        designation: designation.substring(0, 128),
        department: department.substring(0, 128)
      }
    )

    return { success: true, data: response }
  } catch (error) {
    console.error('Error creating punch out record:', error)
    return { success: false, error: error.message }
  }
}
