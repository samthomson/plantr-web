import { useSeoMeta } from '@unhead/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePlantPotSubscription } from '@/hooks/usePlantPotSubscription';
import { PlantPotList } from '@/components/PlantPotList';
import { CreatePlantPotDialog } from '@/components/CreatePlantPotDialog';
import { LoginArea } from '@/components/auth/LoginArea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sprout, Droplet, Activity } from 'lucide-react';

const Index = () => {
  const { user } = useCurrentUser();

  // Subscribe to real-time updates
  usePlantPotSubscription();

  useSeoMeta({
    title: 'Plantr - IoT Plant Pot Manager',
    description: 'Manage your smart plant pots and watering tasks with real-time IoT integration',
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-100 dark:bg-green-900 mb-6">
              <Sprout className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Plantr
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Smart plant pot management with real-time IoT integration.
              Monitor, schedule, and automate your plant care effortlessly.
            </p>
            <div className="flex justify-center">
              <LoginArea className="max-w-60" />
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 w-fit mb-3">
                  <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Manage Plant Pots</CardTitle>
                <CardDescription>
                  Create and organize your smart plant pots with unique identifiers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 w-fit mb-3">
                  <Droplet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Schedule Tasks</CardTitle>
                <CardDescription>
                  Add watering tasks with custom durations for each plant pot
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 w-fit mb-3">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Real-time Updates</CardTitle>
                <CardDescription>
                  Watch IoT devices complete tasks with live WebSocket updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center text-sm text-muted-foreground">
            <p>
              Vibed with{' '}
              <a
                href="https://shakespeare.diy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                Shakespeare
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sprout className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl font-bold">My Plant Pots</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your smart plant pots and watering schedules
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CreatePlantPotDialog />
            <LoginArea className="max-w-60" />
          </div>
        </div>

        {/* Plant Pot List */}
        <PlantPotList />

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            Vibed with{' '}
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Shakespeare
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
