import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect } from 'react';

/**
 * Validator function for plant pot events (kind 30000)
 * Plant pots must have:
 * - d tag (identifier)
 * - p tag (owner pubkey)
 * - content (encrypted nsec)
 */
function validatePlantPot(event: NostrEvent): boolean {
  if (event.kind !== 30000) return false;

  // Check for required 'd' tag (identifier)
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  if (!d) return false;

  // Check for required 'p' tag (owner pubkey) - this distinguishes plant pots from other kind 30000 events
  const p = event.tags.find(([name]) => name === 'p')?.[1];
  if (!p) return false;

  return true;
}

/**
 * Hook to fetch all plant pots for the current user (by owner p tag)
 */
export function usePlantPots() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['plant-pots', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Connect to only the custom relay
      const relay = nostr.relay('wss://relay.samt.st');
      
      // Fetch plant pots
      const events = await relay.query(
        [
          {
            kinds: [30000],
            '#p': [user.pubkey], // Query by owner pubkey
          },
        ],
        { signal }
      );

      // Fetch deletion events (kind 5) from the user
      const deletions = await relay.query(
        [
          {
            kinds: [5],
            authors: [user.pubkey],
          },
        ],
        { signal }
      );

      // Extract deleted event IDs and addressable coordinates
      const deletedIds = new Set<string>();
      const deletedCoords = new Set<string>();
      
      for (const deletion of deletions) {
        // Check for 'e' tags (event IDs)
        deletion.tags.forEach(([tag, value]) => {
          if (tag === 'e') deletedIds.add(value);
          if (tag === 'a') deletedCoords.add(value);
        });
      }

      // Filter out deleted events
      const validEvents = events.filter(event => {
        if (deletedIds.has(event.id)) return false;
        
        const d = event.tags.find(([name]) => name === 'd')?.[1];
        const coord = `30000:${event.pubkey}:${d}`;
        if (deletedCoords.has(coord)) return false;
        
        return true;
      });

      return validEvents.filter(validatePlantPot).sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey,
  });

  // Subscribe to real-time updates for all plant pots
  useEffect(() => {
    if (!user?.pubkey) return;

    const relay = nostr.relay('wss://relay.samt.st');
    const controller = new AbortController();

    (async () => {
      try {
        const sub = await relay.req(
          [
            {
              kinds: [30000],
              '#p': [user.pubkey],
            },
          ],
          { signal: controller.signal }
        );

        for await (const event of sub) {
          if (validatePlantPot(event)) {
            queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Subscription error:', error);
        }
      }
    })();

    return () => controller.abort();
  }, [user?.pubkey, nostr, queryClient]);

  return query;
}

/**
 * Hook to fetch a single plant pot by its 'd' tag identifier
 */
export function usePlantPot(identifier: string | undefined) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['plant-pot', user?.pubkey, identifier],
    queryFn: async (c) => {
      if (!user?.pubkey || !identifier) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Connect to only the custom relay
      const relay = nostr.relay('wss://relay.samt.st');
      const events = await relay.query(
        [
          {
            kinds: [30000],
            '#p': [user.pubkey], // Query by owner pubkey
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

  // Subscribe to real-time updates for this specific plant pot
  useEffect(() => {
    if (!user?.pubkey || !identifier) return;

    const relay = nostr.relay('wss://relay.samt.st');
    const controller = new AbortController();

    (async () => {
      try {
        const sub = await relay.req(
          [
            {
              kinds: [30000],
              '#p': [user.pubkey],
              '#d': [identifier],
            },
          ],
          { signal: controller.signal }
        );

        for await (const event of sub) {
          if (validatePlantPot(event)) {
            queryClient.setQueryData(['plant-pot', user.pubkey, identifier], event);
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Subscription error:', error);
        }
      }
    })();

    return () => controller.abort();
  }, [user?.pubkey, identifier, nostr, queryClient]);

  return query;
}
