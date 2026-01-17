import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validator function for plant pot events (kind 30000)
 */
function validatePlantPot(event: NostrEvent): boolean {
  if (event.kind !== 30000) return false;

  // Check for required 'd' tag
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  if (!d) return false;

  return true;
}

/**
 * Hook to fetch all plant pots for the current user
 */
export function usePlantPots() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['plant-pots', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [
          {
            kinds: [30000],
            authors: [user.pubkey],
          },
        ],
        { signal }
      );

      return events.filter(validatePlantPot).sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey,
  });
}

/**
 * Hook to fetch a single plant pot by its 'd' tag identifier
 */
export function usePlantPot(identifier: string | undefined) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['plant-pot', user?.pubkey, identifier],
    queryFn: async (c) => {
      if (!user?.pubkey || !identifier) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [
          {
            kinds: [30000],
            authors: [user.pubkey],
            '#d': [identifier],
          },
        ],
        { signal }
      );

      const validEvents = events.filter(validatePlantPot);
      return validEvents.length > 0 ? validEvents[0] : null;
    },
    enabled: !!user?.pubkey && !!identifier,
  });
}
