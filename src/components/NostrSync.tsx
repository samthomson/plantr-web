/**
 * NostrSync - Syncs user's Nostr data
 *
 * This component is disabled for Plantr to force usage of the custom relay only.
 * In a typical Nostr app, this would sync NIP-65 relay lists, but Plantr
 * requires all data to go through wss://relay.samt.st
 */
export function NostrSync() {
  // Disabled: We want to force only wss://relay.samt.st for Plantr
  return null;
}