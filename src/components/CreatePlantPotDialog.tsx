import { useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
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
import { Plus } from 'lucide-react';

export function CreatePlantPotDialog() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a plant pot identifier',
        variant: 'destructive',
      });
      return;
    }

    createEvent(
      {
        kind: 30000,
        content: '',
        tags: [['d', identifier.trim()]],
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Plant pot created successfully!',
          });
          setOpen(false);
          setIdentifier('');
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: `Failed to create plant pot: ${error.message}`,
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
          <Plus className="mr-2 h-4 w-4" />
          New Plant Pot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Plant Pot</DialogTitle>
            <DialogDescription>
              Add a new plant pot to your collection. Give it a unique identifier.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="identifier">Identifier</Label>
            <Input
              id="identifier"
              placeholder="e.g., plant-pot-1, tomato-01, basil-kitchen"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isPending}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use a unique identifier to distinguish this plant pot from others.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
