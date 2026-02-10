import { Link } from 'react-router-dom';
import { usePlantPots } from '@/hooks/usePlantPots';
import { usePlantLogs } from '@/hooks/usePlantLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { extractTasks, formatDuration, formatRelativeTime } from '@/lib/plantUtils';
import { useWeatherReadings, getTemperature, getHumidity } from '@/hooks/useWeatherStations';
import { Sprout, Trash2, CheckCheck, Thermometer, Droplets } from 'lucide-react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';

function PlantPotCard({ pot, onDelete, deletingId }: { pot: any; onDelete: (e: React.MouseEvent, pot: any) => void; deletingId: string | null }) {
  const identifier = pot.tags.find(([name]: string[]) => name === 'd')?.[1] || 'unknown';
  const name = pot.tags.find(([name]: string[]) => name === 'name')?.[1] || identifier;
  const tasks = extractTasks(pot);
  const { data: logs } = usePlantLogs(pot.pubkey, identifier);
  const recentLogs = logs?.slice(0, 2) || [];
  
  const weatherStationPubkey = pot.tags.find(([t]: string[]) => t === 'weather_station')?.[1];
  const { data: weatherReading } = useWeatherReadings(weatherStationPubkey);

  return (
    <div className="relative">
      <Link to={`/pot/${identifier}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">{name}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => onDelete(e, pot)}
                disabled={deletingId === pot.id}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              {tasks.length > 0 ? `${tasks.length} pending task${tasks.length !== 1 ? 's' : ''}` : 'No pending tasks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Pending tasks */}
            {tasks.length > 0 && (
              <div className="space-y-2 mb-3">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">
                      {task.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(parseInt(task.seconds))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent activity logs */}
            {recentLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
                {recentLogs.map((log) => {
                  const logTasks = extractTasks(log);
                  return (
                    <div key={log.id} className="flex items-center gap-2 text-xs">
                      <CheckCheck className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <div className="text-muted-foreground">
                          {logTasks.map((task, idx) => (
                            <span key={idx}>
                              <span className="capitalize">{task.type}</span> {formatDuration(parseInt(task.seconds))}
                            </span>
                          ))}
                        </div>
                        <div className="text-muted-foreground/70 text-xs">
                          {formatRelativeTime(log.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tasks.length === 0 && recentLogs.length === 0 && !weatherReading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </p>
            )}

            {/* Environment conditions */}
            {weatherReading && (
              <div className={recentLogs.length > 0 ? 'pt-3 mt-2' : 'pt-3 border-t'}>
                <p className="text-xs font-medium text-muted-foreground mb-2">Environment</p>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-orange-500/70 dark:text-orange-400/70">
                    <Thermometer className="h-3.5 w-3.5" />
                    <span className="font-medium">{getTemperature(weatherReading)}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-500/70 dark:text-blue-400/70">
                    <Droplets className="h-3.5 w-3.5" />
                    <span className="font-medium">{getHumidity(weatherReading)}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export function PlantPotList() {
  const { data: plantPots, isLoading } = usePlantPots();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, pot: any) => {
    e.preventDefault(); // Prevent navigation to detail page
    e.stopPropagation();

    if (!user?.signer) return;

    setDeletingId(pot.id);
    try {
      const dTag = pot.tags.find(([t]: string[]) => t === 'd')?.[1];
      
      // Create deletion event (kind 5)
      const deletionEvent = {
        kind: 5,
        content: 'Deleting plant pot',
        tags: [
          ['e', pot.id],
          ['a', `34419:${pot.pubkey}:${dTag}`],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign with user's key
      const signedDeletion = await user.signer.signEvent(deletionEvent);

      // Publish deletion
      const relay = nostr.relay('wss://relay.samt.st');
      await relay.event(signedDeletion, { pow: 0 });

      // Immediately remove from UI
      queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });

      toast({
        title: 'Deleted',
        description: 'Plant pot deleted successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete plant pot',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Sprout className="h-8 w-8 mx-auto text-green-600 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading plant pots...</p>
        </div>
      </div>
    );
  }

  if (!plantPots || plantPots.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-4">
            <Sprout className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              No plant pots yet. Create your first plant pot to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plantPots.map((pot) => <PlantPotCard key={pot.id} pot={pot} onDelete={handleDelete} deletingId={deletingId} />)}
    </div>
  );
}
