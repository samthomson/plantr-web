import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validator for weather station metadata events (kind 16158)
 */
function validateWeatherStation(event: NostrEvent): boolean {
  if (event.kind !== 16158) return false;
  
  // Should have a name tag
  const name = event.tags.find(([t]) => t === 'name')?.[1];
  if (!name) return false;
  
  return true;
}

/**
 * Hook to fetch all available weather stations
 */
export function useWeatherStations() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['weather-stations'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{
          kinds: [16158],
          limit: 50,
        }],
        { signal }
      );

      return events.filter(validateWeatherStation).sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Validator for weather reading events (kind 4223)
 */
function validateWeatherReading(event: NostrEvent): boolean {
  if (event.kind !== 4223) return false;
  return true;
}

/**
 * Hook to fetch latest weather readings from a specific station
 */
export function useWeatherReadings(stationPubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['weather-readings', stationPubkey],
    queryFn: async (c) => {
      if (!stationPubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{
          kinds: [4223],
          authors: [stationPubkey],
          limit: 1, // Just get the latest reading
        }],
        { signal }
      );

      const validEvents = events.filter(validateWeatherReading);
      return validEvents.length > 0 ? validEvents[0] : null;
    },
    enabled: !!stationPubkey,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Extract temperature from weather reading event
 */
export function getTemperature(reading: NostrEvent | null | undefined): string | null {
  if (!reading) return null;
  const temp = reading.tags.find(([t]) => t === 'temp')?.[1];
  return temp || null;
}

/**
 * Extract humidity from weather reading event
 */
export function getHumidity(reading: NostrEvent | null | undefined): string | null {
  if (!reading) return null;
  const humidity = reading.tags.find(([t]) => t === 'humidity')?.[1];
  return humidity || null;
}
