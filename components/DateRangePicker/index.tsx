'use client';
import { useState } from 'react';
import Button from '@/components/Button';

interface DateRangePickerProps {
  onRangeChange: (start: string | null, end: string | null) => void;
  defaultPreset?: string;
}

const presets = [
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 30 Days', value: '30d', days: 30 },
  { label: 'Last 3 Months', value: '3m', days: 90 },
  { label: 'Last 6 Months', value: '6m', days: 180 },
  { label: 'Last Year', value: '1y', days: 365 },
  { label: 'All Time', value: 'all', days: null },
];

export default function DateRangePicker({ onRangeChange, defaultPreset = '30d' }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(defaultPreset);

  const handlePresetClick = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.value);

    const end = new Date().toISOString();
    let start: string | null = null;

    if (preset.days !== null) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - preset.days);
      start = startDate.toISOString();
    }
    // If preset.days is null, it's "All Time" - start will be null

    onRangeChange(start, end);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {presets.map((preset) => (
        <Button
          key={preset.value}
          variant="secondary"
          size="sm"
          isActive={selectedPreset === preset.value}
          onClick={() => handlePresetClick(preset)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}