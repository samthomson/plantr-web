import { useWeatherStations, useWeatherReadings, getTemperature, getHumidity } from '@/hooks/useWeatherStations';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Thermometer, Droplets, MapPin } from 'lucide-react';

interface WeatherStationSelectProps {
  value: string | undefined;
  onChange: (pubkey: string) => void;
}

function WeatherStationOption({ station }: { station: any }) {
  const { data: reading } = useWeatherReadings(station.pubkey);
  const name = station.tags.find(([t]: string[]) => t === 'name')?.[1] || 'Unknown Station';
  const description = station.tags.find(([t]: string[]) => t === 'description')?.[1];
  const geohash = station.tags.find(([t]: string[]) => t === 'g')?.[1];
  const temp = getTemperature(reading);
  const humidity = getHumidity(reading);

  return (
    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted cursor-pointer">
      <RadioGroupItem value={station.pubkey} id={station.pubkey} />
      <label htmlFor={station.pubkey} className="flex-1 cursor-pointer">
        <div className="font-medium text-sm">{name}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
        <div className="flex items-center gap-3 mt-1">
          {geohash && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {geohash}
            </div>
          )}
          {temp && (
            <div className="flex items-center gap-1 text-xs">
              <Thermometer className="h-3 w-3 text-orange-500" />
              <span className="font-medium">{temp}°C</span>
            </div>
          )}
          {humidity && (
            <div className="flex items-center gap-1 text-xs">
              <Droplets className="h-3 w-3 text-blue-500" />
              <span className="font-medium">{humidity}%</span>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

export function WeatherStationSelect({ value, onChange }: WeatherStationSelectProps) {
  const { data: stations, isLoading } = useWeatherStations();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Weather Station (Optional)</Label>
        <p className="text-xs text-muted-foreground">Loading weather stations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Weather Station (Optional)</Label>
      <Card className="p-2 max-h-64 overflow-y-auto">
        <RadioGroup value={value || 'none'} onValueChange={onChange}>
          <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted cursor-pointer">
            <RadioGroupItem value="none" id="none" />
            <label htmlFor="none" className="cursor-pointer text-sm font-medium">
              None
            </label>
          </div>
          
          {stations?.map((station) => (
            <WeatherStationOption key={station.pubkey} station={station} />
          ))}
        </RadioGroup>
      </Card>
    </div>
  );
}
