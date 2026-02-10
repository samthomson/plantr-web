import { useParams, Link } from 'react-router-dom';
import { usePlantPot } from '@/hooks/usePlantPots';
import { usePlantLogs } from '@/hooks/usePlantLogs';
import { useWeatherReadings, getTemperature, getHumidity } from '@/hooks/useWeatherStations';
import { WeatherStationSelect } from '@/components/WeatherStationSelect';
import { useNostr } from '@nostrify/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddWaterTaskDialog } from '@/components/AddWaterTaskDialog';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSeoMeta } from '@unhead/react';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  ArrowLeft,
  Sprout,
  Droplet,
  Copy,
  CheckCheck,
  Calendar,
  Clock,
  Eye,
  Lock,
  RefreshCw,
  Pencil,
  Check,
  X,
  Thermometer,
  Droplets
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { extractTasks, formatDuration, formatRelativeTime, generatePlantPotNaddr } from '@/lib/plantUtils';
import { useState } from 'react';
import { nip19 } from 'nostr-tools';

export function PlantPotDetail() {
  const { identifier } = useParams<{ identifier: string }>();
  const { data: plantPot, isLoading: isPotLoading, refetch: refetchPot } = usePlantPot(identifier);
  const { data: logs, isLoading: isLogsLoading, refetch: refetchLogs } = usePlantLogs(plantPot?.pubkey, identifier);
  const weatherStationPubkey = plantPot?.tags.find(([t]) => t === 'weather_station')?.[1];
  const { data: weatherReading } = useWeatherReadings(weatherStationPubkey);
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [decryptedHex, setDecryptedHex] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useSeoMeta({
    title: `Plant Pot: ${identifier || 'Loading...'}`,
    description: 'Manage your plant pot and view watering logs',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchPot(), refetchLogs()]);
      toast({
        title: 'Refreshed',
        description: 'Plant pot data updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyNaddr = async () => {
    if (!plantPot) {
      console.error('No plant pot data available');
      return;
    }

    try {
      const naddr = generatePlantPotNaddr(plantPot, ['wss://relay.samt.st']);
      console.log('Generated naddr:', naddr);

      await navigator.clipboard.writeText(naddr);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Plant pot identifier copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to copy identifier',
        variant: 'destructive',
      });
    }
  };

  const handleDecryptKey = async () => {
    if (!plantPot || !user?.signer) return;

    setIsDecrypting(true);
    try {
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, plantPot.content);
      console.log('Decrypted value:', decrypted);
      console.log('Length:', decrypted.length);
      
      // Should always be 64-char hex
      if (!/^[0-9a-fA-F]{64}$/.test(decrypted)) {
        toast({
          title: 'Error',
          description: `Invalid private key format. Expected 64 hex characters, got ${decrypted.length}.`,
          variant: 'destructive',
        });
        return;
      }
      
      setDecryptedHex(decrypted.toLowerCase());
    } catch (error) {
      console.error('Decryption error:', error);
      toast({
        title: 'Error',
        description: 'Failed to decrypt private key',
        variant: 'destructive',
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopyHex = async () => {
    if (!decryptedHex) return;
    try {
      await navigator.clipboard.writeText(decryptedHex);
      toast({
        title: 'Copied!',
        description: 'Private key copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

  const handleSaveName = async () => {
    if (!plantPot || !user?.signer || !editedName.trim()) return;

    try {
      // Decrypt plant pot's private key
      const decryptedKey = await user.signer.nip44.decrypt(user.pubkey, plantPot.content);
      const hexKey = /^[0-9a-fA-F]{64}$/.test(decryptedKey) ? decryptedKey : '';
      
      if (!hexKey) {
        toast({
          title: 'Error',
          description: 'Cannot update name - plant pot has no valid private key',
          variant: 'destructive',
        });
        return;
      }

      // Convert hex to Uint8Array and create signer
      const secretKey = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const { NSecSigner } = await import('@nostrify/nostrify');
      const signer = new NSecSigner(secretKey);

      // Update event with new name
      const updatedTags = plantPot.tags.filter(([t]) => t !== 'name');
      updatedTags.splice(1, 0, ['name', editedName.trim()]);

      const unsignedEvent = {
        kind: 34419,
        content: plantPot.content,
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000),
        pubkey: plantPot.pubkey,
      };

      const signedEvent = await signer.signEvent(unsignedEvent);
      const relay = nostr.relay('wss://relay.samt.st');
      await relay.event(signedEvent, { pow: 0 });

      queryClient.invalidateQueries({ queryKey: ['plant-pot', user.pubkey, identifier] });
      queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });

      setIsEditingName(false);
      toast({
        title: 'Updated',
        description: 'Plant pot name updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update name',
        variant: 'destructive',
      });
    }
  };

  const handleWeatherStationChange = async (stationPubkey: string) => {
    if (!plantPot || !user?.signer) return;

    try {
      const decryptedKey = await user.signer.nip44.decrypt(user.pubkey, plantPot.content);
      const hexKey = /^[0-9a-fA-F]{64}$/.test(decryptedKey) ? decryptedKey : '';
      
      if (!hexKey) return;

      const secretKey = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const { NSecSigner } = await import('@nostrify/nostrify');
      const signer = new NSecSigner(secretKey);

      // Update tags with weather station
      const updatedTags = plantPot.tags.filter(([t]) => t !== 'weather_station');
      if (stationPubkey !== 'none') {
        updatedTags.push(['weather_station', stationPubkey]);
      }

      const unsignedEvent = {
        kind: 34419,
        content: plantPot.content,
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000),
        pubkey: plantPot.pubkey,
      };

      const signedEvent = await signer.signEvent(unsignedEvent);
      const relay = nostr.relay('wss://relay.samt.st');
      await relay.event(signedEvent, { pow: 0 });

      queryClient.invalidateQueries({ queryKey: ['plant-pot', user.pubkey, identifier] });
      queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });

      toast({
        title: 'Updated',
        description: 'Weather station updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update weather station',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <Sprout className="h-12 w-12 mx-auto text-green-600 mb-4" />
                <CardTitle>Login Required</CardTitle>
                <CardDescription>
                  Please login to view and manage your plant pots
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LoginArea className="max-w-60" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isPotLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plantPot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plant Pots
            </Button>
          </Link>
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-4">
                <Sprout className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Plant pot not found. It may have been deleted or does not exist.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tasks = extractTasks(plantPot);
  const name = plantPot.tags.find(([name]) => name === 'name')?.[1] || identifier;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plant Pots
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ConnectionStatus />
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Plant Pot Config */}
          <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="text-xl font-semibold h-10"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') setIsEditingName(false);
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveName}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl">{name}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditedName(name);
                            setIsEditingName(true);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <CardDescription>Plant Pot • {identifier}</CardDescription>
                  </div>
                </div>

                {/* Display naddr ID */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Replaceable Event ID (naddr)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyNaddr}
                        className="gap-2 h-8"
                      >
                        {copied ? (
                          <>
                            <CheckCheck className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3 rounded-lg bg-muted border">
                      <code className="text-xs break-all">
                        {generatePlantPotNaddr(plantPot, ['wss://relay.samt.st'])}
                      </code>
                    </div>
                  </div>

                  {/* Configuration fields */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Relay URL</Label>
                    <Input
                      value="wss://relay.samt.st"
                      readOnly
                      disabled
                      className="font-mono text-xs h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Plant Pot Pubkey</Label>
                    <Input
                      value={plantPot.pubkey}
                      readOnly
                      disabled
                      className="font-mono text-xs h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Identifier (d-tag)</Label>
                    <Input
                      value={identifier}
                      readOnly
                      disabled
                      className="font-mono text-xs h-9"
                    />
                  </div>

                  {/* Display encrypted/decrypted private key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        IoT Private Key
                      </Label>
                      {!decryptedHex && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDecryptKey}
                          disabled={isDecrypting}
                          className="gap-2 h-7 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                          {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={!decryptedHex ? '••••••••••••••••••••••••' : decryptedHex}
                        readOnly
                        disabled={!decryptedHex}
                        className="font-mono text-xs h-9"
                      />
                      {decryptedHex && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyHex}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Tasks Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
                <CardDescription>
                  Tasks queued for IoT device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-3">
                          <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-medium capitalize">{task.type}</p>
                            <p className="text-xs text-muted-foreground">
                              Duration: {formatDuration(parseInt(task.seconds))}
                            </p>
                          </div>
                        </div>
                        <Badge>Pending</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2">
                  <AddWaterTaskDialog plantPotIdentifier={identifier!} />
                </div>
              </CardContent>
            </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>
                Tasks queued for IoT device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center gap-3">
                        <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium capitalize">{task.type}</p>
                          <p className="text-xs text-muted-foreground">
                            Duration: {formatDuration(parseInt(task.seconds))}
                          </p>
                        </div>
                      </div>
                      <Badge>Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2">
                <AddWaterTaskDialog plantPotIdentifier={identifier!} />
              </div>
            </CardContent>
          </Card>

          {/* Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Recent watering activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLogsLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : !logs || logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const logTasks = extractTasks(log);
                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCheck className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                        <div className="ml-6">
                          {logTasks.map((task, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground">
                              <span className="capitalize">{task.type}</span> for{' '}
                              {formatDuration(parseInt(task.seconds))}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>
                Weather station and current conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weather Station Selection */}
              <WeatherStationSelect
                value={weatherStationPubkey}
                onChange={handleWeatherStationChange}
              />

              {/* Current Conditions */}
              {weatherReading && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/30 dark:border-orange-800/20">
                    <Thermometer className="h-4 w-4 text-orange-500/60" />
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-base font-semibold text-orange-600/80 dark:text-orange-400/80">
                        {getTemperature(weatherReading)}°C
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/30 dark:border-blue-800/20">
                    <Droplets className="h-4 w-4 text-blue-500/60" />
                    <div>
                      <p className="text-xs text-muted-foreground">Humidity</p>
                      <p className="text-base font-semibold text-blue-600/80 dark:text-blue-400/80">
                        {getHumidity(weatherReading)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
