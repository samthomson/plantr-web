import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
import { Plus } from 'lucide-react';
import { generateSecretKey } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import { NSecSigner } from '@nostrify/nostrify';
import { useQueryClient } from '@tanstack/react-query';

export function CreatePlantPotDialog() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a plant pot identifier',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.signer) {
      toast({
        title: 'Error',
        description: 'User signer not available',
        variant: 'destructive',
      });
      return;
    }

    setIsPending(true);

    try {
      // Generate new keypair for this plant pot
      const plantPotSecretKey = generateSecretKey();
      const plantPotSigner = new NSecSigner(plantPotSecretKey);
      const plantPotPubkey = await plantPotSigner.getPublicKey();

      // Convert secret key to hex string
      const plantPotSecretKeyHex = Array.from(plantPotSecretKey)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('Generated plant pot keypair:', { plantPotPubkey, secretKeyHex: plantPotSecretKeyHex });

      // Encrypt the hex secret key to the logged-in user's pubkey
      if (!user.signer.nip44) {
        toast({
          title: 'Error',
          description: 'Please upgrade your signer extension to support NIP-44 encryption',
          variant: 'destructive',
        });
        setIsPending(false);
        return;
      }

      const encryptedSecretKey = await user.signer.nip44.encrypt(user.pubkey, plantPotSecretKeyHex);
      console.log('Encrypted secret key:', encryptedSecretKey);

      // Create the plant pot event signed by the PLANT POT's keypair
      const unsignedEvent = {
        kind: 30000,
        content: encryptedSecretKey, // Encrypted hex secret key
        tags: [
          ['d', identifier.trim()],
          ['p', user.pubkey], // Owner's pubkey
          ['client', window.location.hostname],
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: plantPotPubkey, // Event is authored by the plant pot itself
      };

      // Sign with plant pot's signer
      const signedEvent = await plantPotSigner.signEvent(unsignedEvent);
      console.log('Signed plant pot event:', signedEvent);

      // Publish to only the custom relay
      const relay = nostr.relay('wss://relay.samt.st');
      await relay.event(signedEvent, { pow: 0 });

      // Invalidate query to refetch immediately
      queryClient.invalidateQueries({ queryKey: ['plant-pots', user.pubkey] });

      toast({
        title: 'Success',
        description: 'Plant pot created successfully!',
      });
      setOpen(false);
      setIdentifier('');
    } catch (error) {
      console.error('Failed to create plant pot:', error);
      toast({
        title: 'Error',
        description: `Failed to create plant pot: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
