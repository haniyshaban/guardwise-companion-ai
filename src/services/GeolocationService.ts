// Geolocation Service for GPS-based features
import { PatrolPoint, PatrolLog, LocationPing } from '@/types/guard';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeofenceCheckResult {
  isWithinGeofence: boolean;
  distance: number;
  nearestPoint?: PatrolPoint;
}

// Calculate distance between two coordinates using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Get current position with Promise wrapper
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

// Check if position is within a geofence (single point)
export const checkGeofence = (
  position: GeolocationPosition,
  center: { latitude: number; longitude: number },
  radiusMeters: number
): boolean => {
  const distance = calculateDistance(
    position.latitude,
    position.longitude,
    center.latitude,
    center.longitude
  );
  return distance <= radiusMeters;
};

// Check if position is near any patrol point
export const checkPatrolPoint = (
  position: GeolocationPosition,
  patrolPoints: PatrolPoint[]
): GeofenceCheckResult => {
  let nearestPoint: PatrolPoint | undefined;
  let minDistance = Infinity;

  for (const point of patrolPoints) {
    const distance = calculateDistance(
      position.latitude,
      position.longitude,
      point.latitude,
      point.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
    }
  }

  const isWithin = nearestPoint ? minDistance <= nearestPoint.radiusMeters : false;

  return {
    isWithinGeofence: isWithin,
    distance: Math.round(minDistance),
    nearestPoint,
  };
};

// Location watcher for continuous tracking
export class LocationWatcher {
  private watchId: number | null = null;
  private callbacks: ((position: GeolocationPosition) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  start(
    onPosition: (position: GeolocationPosition) => void,
    intervalMs: number = 30000
  ): void {
    this.callbacks.push(onPosition);

    // Use watchPosition for continuous tracking
    if (this.watchId === null) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const pos: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          this.callbacks.forEach((cb) => cb(pos));
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: intervalMs,
        }
      );
    }
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callbacks = [];
  }

  isWatching(): boolean {
    return this.watchId !== null;
  }
}

// Singleton instance for app-wide location tracking
export const locationWatcher = new LocationWatcher();

// Mock patrol points for testing (Bangalore tech parks)
export const MOCK_PATROL_POINTS: PatrolPoint[] = [
  {
    id: 'pp1',
    siteId: 'site-1',
    name: 'Main Gate',
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 10,
    order: 1,
  },
  {
    id: 'pp2',
    siteId: 'site-1',
    name: 'Parking Area A',
    latitude: 12.9720,
    longitude: 77.5950,
    radiusMeters: 10,
    order: 2,
  },
  {
    id: 'pp3',
    siteId: 'site-1',
    name: 'Building A Entrance',
    latitude: 12.9725,
    longitude: 77.5955,
    radiusMeters: 10,
    order: 3,
  },
  {
    id: 'pp4',
    siteId: 'site-1',
    name: 'Fire Exit',
    latitude: 12.9718,
    longitude: 77.5960,
    radiusMeters: 10,
    order: 4,
  },
  {
    id: 'pp5',
    siteId: 'site-1',
    name: 'Loading Bay',
    latitude: 12.9712,
    longitude: 77.5952,
    radiusMeters: 10,
    order: 5,
  },
];

export default {
  getCurrentPosition,
  calculateDistance,
  checkGeofence,
  checkPatrolPoint,
  locationWatcher,
  MOCK_PATROL_POINTS,
};
