import { Link } from 'react-router-dom';
import { usePlantPots } from '@/hooks/usePlantPots';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { extractTasks, formatDuration } from '@/lib/plantUtils';
import { Sprout } from 'lucide-react';

export function PlantPotList() {
  const { data: plantPots, isLoading } = usePlantPots();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
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
        const tasks = extractTasks(pot);

        return (
          <Link key={pot.id} to={`/pot/${identifier}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">{identifier}</CardTitle>
                </div>
                <CardDescription>
                  {tasks.length > 0 ? `${tasks.length} pending task${tasks.length !== 1 ? 's' : ''}` : 'No tasks'}
                </CardDescription>
                {/* Debug info */}
                <div className="text-xs text-muted-foreground mt-2 font-mono break-all">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(pot, null, 2)}</pre>
                </div>
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
        );
      })}
    </div>
  );
}
