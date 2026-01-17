import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePlantPot } from '@/hooks/usePlantPots';
import { useNostr } from '@nostrify/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { Droplet } from 'lucide-react';
import { extractTasks } from '@/lib/plantUtils';
import { nip19 } from 'nostr-tools';
import { NSecSigner } from '@nostrify/nostrify';

interface AddWaterTaskDialogProps {
  plantPotIdentifier: string;
}

export function AddWaterTaskDialog({ plantPotIdentifier }: AddWaterTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState('30');
  const [isPending, setIsPending] = useState(false);
  const { data: plantPot } = usePlantPot(plantPotIdentifier);
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const secondsNum = parseInt(seconds);
    if (isNaN(secondsNum) || secondsNum <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid number of seconds',
        variant: 'destructive',
      });
      return;
    }

    if (!plantPot) {
      toast({
        title: 'Error',
        description: 'Plant pot not found',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.signer?.nip44) {
      toast({
        title: 'Error',
        description: 'Signer not available or does not support NIP-44',
        variant: 'destructive',
      });
      return;
    }

    setIsPending(true);

    try {
      // Decrypt the plant pot's nsec
      const encryptedNsec = plantPot.content;
      const decryptedNsec = await user.signer.nip44.decrypt(user.pubkey, encryptedNsec);

      // Decode nsec to get secret key
      const { type, data: secretKey } = nip19.decode(decryptedNsec);
      if (type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }

      // Create signer from plant pot's secret key
      const plantPotSigner = new NSecSigner(secretKey as Uint8Array);

      // Get existing tasks
      const existingTasks = extractTasks(plantPot);

      // Add new water task
      const newTasks = [...existingTasks, { type: 'water', seconds: seconds.trim() }];

      // Get owner pubkey from p tag
      const ownerPubkey = plantPot.tags.find(([name]) => name === 'p')?.[1];

      // Create updated plant pot event with all tasks
      const tags: string[][] = [
        ['d', plantPotIdentifier],
        ['p', ownerPubkey || user.pubkey],
        ['client', window.location.hostname],
        ...newTasks.map(task => ['task', task.type, task.seconds]),
      ];

      const unsignedEvent = {
        kind: 30000,
        content: encryptedNsec, // Keep the encrypted nsec in content
        tags,
        created_at: Math.floor(Date.now() / 1000),
        pubkey: plantPot.pubkey, // Use plant pot's pubkey
      };

      // Sign with plant pot's signer
      const signedEvent = await plantPotSigner.signEvent(unsignedEvent);

      // Publish the event
      await nostr.event(signedEvent, { pow: 0 });

      toast({
        title: 'Success',
        description: 'Water task added successfully!',
      });
      setOpen(false);
      setSeconds('30');
    } catch (error) {
      console.error('Failed to add water task:', error);
      toast({
        title: 'Error',
        description: `Failed to add water task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Droplet className="mr-2 h-4 w-4" />
          Add Water Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Water Task</DialogTitle>
            <DialogDescription>
              Set how long the IoT device should water this plant pot.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="seconds">Duration (seconds)</Label>
            <Input
              id="seconds"
              type="number"
              min="1"
              placeholder="30"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              disabled={isPending}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter the number of seconds the plant should be watered for.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
