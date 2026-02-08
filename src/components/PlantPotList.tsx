import { Link } from 'react-router-dom';
import { usePlantPots } from '@/hooks/usePlantPots';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { extractTasks, formatDuration } from '@/lib/plantUtils';
import { Sprout, Trash2 } from 'lucide-react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';

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
          ['a', `30000:${pot.pubkey}:${dTag}`],
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
      {plantPots.map((pot) => {
        const identifier = pot.tags.find(([name]) => name === 'd')?.[1] || 'unknown';
        const name = pot.tags.find(([name]) => name === 'name')?.[1] || identifier;
        const tasks = extractTasks(pot);

        return (
          <div key={pot.id} className="relative">
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
                      onClick={(e) => handleDelete(e, pot)}
                      disabled={deletingId === pot.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {tasks.length > 0 ? `${tasks.length} pending task${tasks.length !== 1 ? 's' : ''}` : 'No tasks'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
