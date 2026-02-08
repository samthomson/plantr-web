import { useNostr } from '@nostrify/react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to subscribe to real-time updates for plant pots and logs
 * This establishes a WebSocket connection and invalidates queries when new events arrive
 */
export function usePlantPotSubscription() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.pubkey) return;

    const controller = new AbortController();

    // Connect to only the custom relay
    const relay = nostr.relay('wss://relay.samt.st');

    // Subscribe to plant pot events (kind 34419) for the current user (by owner p tag)
    relay.req(
      [
        {
          kinds: [34419],
          '#p': [user.pubkey], // Subscribe by owner pubkey
        },
      ],
      {
        signal: controller.signal,
        onevent(event: NostrEvent) {
          // Invalidate plant pots query to refetch
          queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });

          // Also invalidate specific plant pot query
          const identifier = event.tags.find(([name]) => name === 'd')?.[1];
          if (identifier) {
            queryClient.invalidateQueries({ queryKey: ['plant-pot', user.pubkey, identifier] });
          }
        },
      }
    );

    // Subscribe to plant log events (kind 30001)
    relay.req(
      [
        {
          kinds: [30001],
          '#a': [`34419:${user.pubkey}:`], // This will match all logs for user's plant pots
        },
      ],
      {
        signal: controller.signal,
        onevent(event: NostrEvent) {
          // Extract plant pot identifier from the 'a' tag
          const aTag = event.tags.find(([name]) => name === 'a')?.[1];
          if (aTag) {
            const parts = aTag.split(':');
            if (parts.length === 3) {
              const plantPotIdentifier = parts[2];
              // Invalidate logs query for this specific plant pot
              queryClient.invalidateQueries({
                queryKey: ['plant-logs', user.pubkey, plantPotIdentifier]
              });
            }
          }
        },
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      controller.abort();
    };
  }, [nostr, user?.pubkey, queryClient]);
}
