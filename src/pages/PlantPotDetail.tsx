import { useParams, Link } from 'react-router-dom';
import { usePlantPot } from '@/hooks/usePlantPots';
import { usePlantLogs } from '@/hooks/usePlantLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  EyeOff,
  Lock
} from 'lucide-react';
import { extractTasks, formatDuration, formatRelativeTime, generatePlantPotNaddr } from '@/lib/plantUtils';
import { useState } from 'react';
import { nip19 } from 'nostr-tools';

export function PlantPotDetail() {
  const { identifier } = useParams<{ identifier: string }>();
  const { data: plantPot, isLoading: isPotLoading } = usePlantPot(identifier);
  const { data: logs, isLoading: isLogsLoading } = usePlantLogs(identifier);
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [copied, setCopied] = useState(false);
  const [decryptedHex, setDecryptedHex] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useSeoMeta({
    title: `Plant Pot: ${identifier || 'Loading...'}`,
    description: 'Manage your plant pot and view watering logs',
  });

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
      if (!user.signer.nip44) {
        toast({
          title: 'Error',
          description: 'Please upgrade your signer extension to support NIP-44 encryption',
          variant: 'destructive',
        });
        return;
      }

      const decrypted = await user.signer.nip44.decrypt(user.pubkey, plantPot.content);
      console.log('Decrypted secret key (hex):', decrypted);
      setDecryptedHex(decrypted);
      toast({
        title: 'Decrypted!',
        description: 'Private key decrypted successfully',
      });
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
        description: 'Private key (hex) copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy private key',
        variant: 'destructive',
      });
    }
  };

  const handleCopyNsec = async () => {
    if (!decryptedHex) return;

    try {
      const nsec = nip19.nsecEncode(decryptedHex);
      await navigator.clipboard.writeText(nsec);
      toast({
        title: 'Copied!',
        description: 'Private key (nsec) copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy nsec',
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
          <ConnectionStatus />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Plant Pot Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{identifier}</CardTitle>
                    <CardDescription>Plant Pot</CardDescription>
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

                  {/* Display encrypted/decrypted private key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        IoT Private Key
                      </span>
                      {!decryptedHex ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDecryptKey}
                          disabled={isDecrypting}
                          className="gap-2 h-8"
                        >
                          <Eye className="h-4 w-4" />
                          {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowKey(!showKey)}
                          className="gap-2 h-8"
                        >
                          {showKey ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              Show
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {!decryptedHex ? (
                      <div className="p-3 rounded-lg bg-muted border">
                        <code className="text-xs break-all text-muted-foreground">
                          {plantPot.content.substring(0, 50)}...{plantPot.content.substring(plantPot.content.length - 10)} (encrypted)
                        </code>
                      </div>
                    ) : (
                      <>
                        {/* Hex format */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Hex Format</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyHex}
                              className="gap-2 h-7 text-xs"
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </Button>
                          </div>
                          <div className="p-3 rounded-lg bg-muted border">
                            <code className="text-xs break-all">
                              {showKey ? (
                                <span className="font-mono">{decryptedHex}</span>
                              ) : (
                                <span className="text-muted-foreground">••••••••••••••••••••••••••••••••</span>
                              )}
                            </code>
                          </div>
                        </div>

                        {/* nsec format */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">nsec Format</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyNsec}
                              className="gap-2 h-7 text-xs"
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </Button>
                          </div>
                          <div className="p-3 rounded-lg bg-muted border">
                            <code className="text-xs break-all">
                              {showKey ? (
                                <span className="font-mono">{nip19.nsecEncode(decryptedHex)}</span>
                              ) : (
                                <span className="text-muted-foreground">••••••••••••••••••••••••••••••••</span>
                              )}
                            </code>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Pending Tasks</h3>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending tasks</p>
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
                </div>
                <div className="pt-4">
                  <AddWaterTaskDialog plantPotIdentifier={identifier!} />
                </div>
              </CardContent>
            </Card>

            {/* Logs Section */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Recent watering activities from your IoT device
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLogsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !logs || logs.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      No activity logs yet. Tasks will appear here after completion.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const logTasks = extractTasks(log);
                      return (
                        <div
                          key={log.id}
                          className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCheck className="h-5 w-5 text-green-600" />
                              <span className="font-medium">Task Completed</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(log.created_at)}
                            </div>
                          </div>
                          <div className="space-y-1 ml-7">
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">IoT Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use the <strong>Replaceable Event ID</strong> displayed above to configure
                    your IoT device. Click <strong>Copy</strong> to copy it to your clipboard.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Relay Configuration</p>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="text-xs font-mono break-all">
                      wss://relay.samt.st
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <p>Add water tasks with duration in seconds</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <p>IoT device watches for updates via WebSocket</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <p>Device completes task and publishes log event</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground">4.</span>
                  <p>Task is removed from pending list automatically</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
