import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validator function for plant log events (kind 30001)
 */
function validatePlantLog(event: NostrEvent): boolean {
  if (event.kind !== 30001) return false;

  // Check for required 'a' tag
  const a = event.tags.find(([name]) => name === 'a')?.[1];
  if (!a) return false;

  return true;
}

/**
 * Hook to fetch logs for a specific plant pot
 * @param plantPotIdentifier - The 'd' tag identifier of the plant pot
 */
export function usePlantLogs(plantPotIdentifier: string | undefined) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['plant-logs', user?.pubkey, plantPotIdentifier],
    queryFn: async (c) => {
      if (!user?.pubkey || !plantPotIdentifier) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Connect to only the custom relay
      const relay = nostr.relay('wss://relay.samt.st');

      // Query logs that reference this specific plant pot
      const aTag = `30000:${user.pubkey}:${plantPotIdentifier}`;
      const events = await relay.query(
        [
          {
            kinds: [30001],
            '#a': [aTag],
          },
        ],
        { signal }
      );

      return events.filter(validatePlantLog).sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey && !!plantPotIdentifier,
    refetchInterval: 5000, // Refetch logs every 5 seconds for real-time updates
  });
}
