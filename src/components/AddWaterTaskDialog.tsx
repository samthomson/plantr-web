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
import { NSecSigner } from '@nostrify/nostrify';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

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
      // Decrypt the plant pot's secret key (hex format)
      const encryptedSecretKey = plantPot.content;
      const decryptedSecretKeyHex = await user.signer.nip44.decrypt(user.pubkey, encryptedSecretKey);

      // Convert hex string to Uint8Array
      const secretKey = new Uint8Array(
        decryptedSecretKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      // Create signer from plant pot's secret key
      const plantPotSigner = new NSecSigner(secretKey);

      // Get existing tasks
      const existingTasks = extractTasks(plantPot);

      // Add new water task
      const newTasks = [...existingTasks, { type: 'water', seconds: seconds.trim() }];

      // Get owner pubkey and name from tags
      const ownerPubkey = plantPot.tags.find(([name]) => name === 'p')?.[1];
      const plantName = plantPot.tags.find(([name]) => name === 'name')?.[1];

      // Create updated plant pot event with all tasks
      const tags: string[][] = [
        ['d', plantPotIdentifier],
        ['p', ownerPubkey || user.pubkey],
        ['client', window.location.hostname],
        ...newTasks.map(task => ['task', task.type, task.seconds]),
      ];

      // Add name tag if it exists
      if (plantName) {
        tags.splice(1, 0, ['name', plantName]);
      }

      const unsignedEvent = {
        kind: 30000,
        content: encryptedSecretKey, // Keep the encrypted hex secret key in content
        tags,
        created_at: Math.floor(Date.now() / 1000),
        pubkey: plantPot.pubkey, // Use plant pot's pubkey
      };

      // Sign with plant pot's signer
      const signedEvent = await plantPotSigner.signEvent(unsignedEvent);

      // Publish to only the custom relay
      const relay = nostr.relay('wss://relay.samt.st');
      await relay.event(signedEvent, { pow: 0 });

      // Invalidate queries to refetch immediately
      queryClient.invalidateQueries({ queryKey: ['plant-pot', user.pubkey, plantPotIdentifier] });
      queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });

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

  const presets = [
    { label: 'Quick', seconds: 1, icon: '💧' },
    { label: 'Short', seconds: 2, icon: '💦' },
    { label: 'Normal', seconds: 3, icon: '🌊' },
    { label: 'Long', seconds: 5, icon: '🌧️' },
    { label: 'Deep', seconds: 8, icon: '⛲' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Droplet className="mr-2 h-4 w-4" />
          Add Water Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl">💧 Water Your Plant</DialogTitle>
            <DialogDescription>
              Choose a duration or enter a custom time
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            {/* Preset buttons */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Quick Select</Label>
              <div className="grid grid-cols-5 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => setSeconds(preset.seconds.toString())}
                    disabled={isPending}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                      ${seconds === preset.seconds.toString() 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <span className="text-2xl mb-1">{preset.icon}</span>
                    <span className="text-xs font-medium">{preset.label}</span>
                    <span className="text-xs text-muted-foreground">{preset.seconds}s</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div className="space-y-2">
              <Label htmlFor="seconds" className="text-sm font-semibold">Custom Duration</Label>
              <div className="flex gap-2">
                <Input
                  id="seconds"
                  type="number"
                  min="1"
                  placeholder="Enter seconds..."
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  disabled={isPending}
                  className="font-mono"
                />
                <div className="flex items-center px-3 rounded-md border bg-muted">
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
