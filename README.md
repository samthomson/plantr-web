# Plantr - IoT Plant Pot Manager

A smart plant pot management application built with Nostr protocol integration for real-time IoT communication. Manage your smart plant pots, schedule watering tasks, and monitor activity logs with live WebSocket updates.

## Features

- 🌱 **Plant Pot Management**: Create and organize smart plant pots with unique identifiers
- 💧 **Task Scheduling**: Add water tasks with custom durations (in seconds)
- 📊 **Activity Logs**: View real-time logs of completed watering tasks
- 🔄 **Live Updates**: WebSocket-powered real-time synchronization with IoT devices
- 🔐 **Nostr Authentication**: Secure login with Nostr keys (NIP-07 browser extension or nsec)
- 📋 **Easy IoT Setup**: Copy naddr identifiers for IoT device configuration

## How It Works

1. **Create Plant Pots**: Add plant pots with unique identifiers (e.g., `plant-pot-1`, `tomato-01`)
2. **Add Water Tasks**: Schedule watering tasks with duration in seconds
3. **IoT Integration**: Configure your IoT device with the plant pot's naddr identifier
4. **Real-time Sync**: Watch as IoT devices complete tasks and update automatically
5. **View Logs**: Track all watering activities with timestamped logs

## Event Structure

### Plant Pot (Kind 30000)
Replaceable event that stores plant pot information and pending tasks:

```json
{
  "kind": 30000,
  "tags": [
    ["d", "plant-pot-1"],
    ["task", "water", "30"]
  ],
  "content": ""
}
```

### Log (Kind 30001)
Replaceable event that records completed tasks:

```json
{
  "kind": 30001,
  "tags": [
    ["a", "30000:<pubkey>:plant-pot-1"],
    ["task", "water", "30"]
  ],
  "content": ""
}
```

## IoT Device Setup

1. **Get Plant Pot ID**: Click the "Copy ID" button on any plant pot detail page
2. **Configure Relay**: Connect to `wss://relay.samt.st`
3. **Watch for Updates**: Subscribe to plant pot events using the naddr identifier
4. **Complete Tasks**: When a task is completed, publish a log event (kind 30001)
5. **Update Plant Pot**: Remove completed tasks from the plant pot event

## Technology Stack

- **React 18**: Modern UI framework with hooks
- **Nostr Protocol**: Decentralized real-time communication
- **TailwindCSS**: Utility-first styling
- **Nostrify**: Nostr protocol implementation
- **TanStack Query**: Data fetching and caching
- **shadcn/ui**: Accessible UI components

## Development

```bash
# Install dependencies and start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Relay Configuration

The app uses a single relay for optimal performance:
- **Default Relay**: `wss://relay.samt.st`

You can manage relay connections through the app's relay settings interface.

## Real-time Updates

The app maintains active WebSocket connections to relays and automatically:
- Updates plant pot lists when new pots are created
- Refreshes task lists when tasks are added
- Shows new logs as IoT devices complete tasks
- Removes completed tasks from the pending list

## Architecture

### Hooks
- `usePlantPots`: Fetch all plant pots for current user
- `usePlantPot`: Fetch a single plant pot by identifier
- `usePlantLogs`: Fetch activity logs for a plant pot
- `usePlantPotSubscription`: Subscribe to real-time updates via WebSocket

### Components
- `PlantPotList`: Grid view of all plant pots
- `PlantPotDetail`: Detailed view with tasks and logs
- `CreatePlantPotDialog`: Form to create new plant pots
- `AddWaterTaskDialog`: Form to add water tasks
- `ConnectionStatus`: Live connection indicator

### Utilities
- `plantUtils.ts`: Helper functions for formatting and naddr generation

## License

This project is vibed with [Shakespeare](https://shakespeare.diy) - an AI-powered website builder.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
