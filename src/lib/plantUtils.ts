import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Generate an naddr identifier for a plant pot event
 */
export function generatePlantPotNaddr(event: NostrEvent, relays: string[] = []): string {
  const identifier = event.tags.find(([name]) => name === 'd')?.[1];
  
  if (!identifier) {
    throw new Error('Plant pot event missing "d" tag');
  }

  return nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier,
    relays,
  });
}

/**
 * Extract task information from a plant pot or log event
 */
export function extractTasks(event: NostrEvent): Array<{ type: string; seconds: string }> {
  return event.tags
    .filter(([name]) => name === 'task')
    .map(([_, type, seconds]) => ({ type, seconds }));
}

/**
 * Format seconds into a human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) {
    return 'just now';
  }
  
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  }
  
  const days = Math.floor(diff / 86400);
  return `${days}d ago`;
}
