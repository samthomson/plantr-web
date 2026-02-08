# NIP-XX: Plantr - IoT Plant Pot Management Protocol

## Abstract

This NIP defines event kinds for managing IoT-controlled plant pots using Nostr as the communication protocol. It enables users to create plant pot configurations, schedule watering tasks, and receive activity logs from IoT devices.

## Event Kinds

### Kind 34419: Plant Pot Configuration

A parameterized replaceable event representing a single IoT plant pot with its configuration and pending tasks.

**Structure:**
```json
{
  "kind": 34419,
  "pubkey": "<plant-pot-pubkey>",
  "content": "<encrypted-hex-private-key>",
  "tags": [
    ["d", "my-tomato-plant"],
    ["name", "My Tomato Plant"],
    ["p", "<owner-pubkey>"],
    ["task", "water", "3"],
    ["client", "plantr-web.shakespeare.wtf"],
    ["alt", "Plant pot configuration for IoT device control"]
  ]
}
```

**Tags:**
- `d` (required): Slugified identifier for the plant pot (used for replaceability)
- `name` (optional): Human-readable display name
- `p` (required): Owner's pubkey who created this plant pot
- `task` (optional): Pending tasks in format `["task", "water", "<seconds>"]`
- `client` (optional): Client application identifier
- `alt` (required): NIP-31 human-readable description

**Content:**
The plant pot's private key (64-character hex string) encrypted to the owner's pubkey using NIP-44 encryption. This allows the owner to share the private key with IoT devices without compromising their main identity.

**Replaceability:**
Events are unique per `plant-pot-pubkey + kind + d-tag`. Each plant pot generates its own keypair on creation and signs all updates with that key.

---

### Kind 4171: Plant Pot Activity Log

A regular event recording when an IoT device completes a task.

**Structure:**
```json
{
  "kind": 4171,
  "pubkey": "<plant-pot-pubkey>",
  "content": "",
  "tags": [
    ["a", "34419:<plant-pot-pubkey>:<d-tag>"],
    ["task", "water", "3"],
    ["client", "plantr-device"],
    ["alt", "Plant pot activity log - watering task completed"]
  ]
}
```

**Tags:**
- `a` (required): References the plant pot using addressable event coordinate
- `task` (required): Completed task details `["task", "water", "<seconds>"]`
- `client` (optional): IoT device identifier
- `alt` (required): NIP-31 human-readable description

**Published by:** IoT device (signed with plant pot's private key)

---

## Workflow

### Creating a Plant Pot (Web Application)

1. User creates plant pot with name "My Tomato Plant"
2. Application generates new keypair for the plant pot
3. Application encrypts plant pot's hex private key to user's pubkey (NIP-44)
4. Application publishes kind 34419 event signed with plant pot's key
5. Event includes `d` tag with slugified identifier and `name` tag with display name

### Adding Tasks (Web Application)

1. User adds water task "3 seconds"
2. Application decrypts plant pot's private key
3. Application fetches current kind 34419 event
4. Application adds new task tag
5. Application republishes kind 34419 event (replaces previous version)

### IoT Device Setup

1. User clicks "Decrypt" to reveal plant pot's hex private key
2. User copies hex private key and d-tag identifier
3. User configures IoT device with:
   - Relay URL
   - Plant pot private key (hex)
   - Plant pot d-tag identifier

### IoT Device Operation

1. IoT device subscribes to relay for kind 34419 events matching its pubkey + d-tag
2. IoT device receives events with pending tasks
3. IoT device executes tasks (e.g., activates water pump for 3 seconds)
4. After completion:
   - Publishes kind 4171 log event with completed task details
   - Fetches current kind 34419 event
   - Removes completed task from tags
   - Republishes kind 34419 event (replaces with updated task list)

### Viewing Activity Logs (Web Application)

1. Application queries kind 4171 events with `#a` tag matching plant pot coordinate
2. Displays completed tasks with timestamps
3. Auto-refreshes to show new logs in real-time

## Security Model

Each plant pot has its own keypair separate from the owner's identity:

- **Owner's key**: Creates and manages plant pots through web interface
- **Plant pot's key**: Signs all plant pot events and is shared with IoT devices
- **Benefit**: If IoT device is compromised, only that plant pot is affected, not the owner's main Nostr identity

The plant pot's private key is stored encrypted in the event content, only decryptable by the owner.

## Implementation Notes

- Plant pot identifiers (d-tags) should be automatically slugified (lowercase, hyphens only)
- IoT devices must preserve all tags when updating plant pot events (especially `p`, `name`, `content`)
- Activity logs use regular events (not replaceable) to maintain complete history
- Web applications should poll for updates every 1-2 seconds when tasks are pending

## References

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-31: Alt Tags](https://github.com/nostr-protocol/nips/blob/master/31.md)
- [NIP-44: Encrypted Payloads](https://github.com/nostr-protocol/nips/blob/master/44.md)
