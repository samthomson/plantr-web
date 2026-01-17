import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  return (
    <Badge variant="outline" className={className}>
      <Activity className="h-3 w-3 mr-1 text-green-500 animate-pulse" />
      Live Updates
    </Badge>
  );
}
