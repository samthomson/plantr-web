import { useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { usePlantPot } from '@/hooks/usePlantPots';
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

interface AddWaterTaskDialogProps {
  plantPotIdentifier: string;
}

export function AddWaterTaskDialog({ plantPotIdentifier }: AddWaterTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState('30');
  const { data: plantPot } = usePlantPot(plantPotIdentifier);
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
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

    // Get existing tasks
    const existingTasks = extractTasks(plantPot);

    // Add new water task
    const newTasks = [...existingTasks, { type: 'water', seconds: seconds.trim() }];

    // Create updated plant pot event with all tasks
    const tags: string[][] = [
      ['d', plantPotIdentifier],
      ...newTasks.map(task => ['task', task.type, task.seconds]),
    ];

    createEvent(
      {
        kind: 30000,
        content: '',
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Water task added successfully!',
          });
          setOpen(false);
          setSeconds('30');
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: `Failed to add water task: ${error.message}`,
            variant: 'destructive',
          });
        },
      }
    );
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
