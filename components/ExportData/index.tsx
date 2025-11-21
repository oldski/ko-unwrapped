'use client';
import { useState } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';

type ExportFormat = 'json' | 'csv';

export default function ExportData() {
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | '1y'>('all');

  const getDateRangeParams = () => {
    if (dateRange === 'all') return '';

    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return `start=${start.toISOString()}&end=${end.toISOString()}`;
  };

  const { data: historyData } = useSWR(
    `/api/stats/history?${getDateRangeParams()}&limit=10000`,
    fetcher
  );

  const { data: topTracksData } = useSWR(
    `/api/stats/top-tracks?${getDateRangeParams()}&limit=100`,
    fetcher
  );

  const { data: topArtistsData } = useSWR(
    `/api/stats/top-artists?${getDateRangeParams()}&limit=100`,
    fetcher
  );

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        // Escape quotes in strings
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: ExportFormat, dataType: 'history' | 'top-tracks' | 'top-artists') => {
    setIsExporting(true);

    try {
      let data;
      let filename = '';

      // Get the appropriate data
      switch (dataType) {
        case 'history':
          data = historyData?.data || [];
          filename = `listening-history-${dateRange}`;
          break;
        case 'top-tracks':
          data = topTracksData?.data || [];
          filename = `top-tracks-${dateRange}`;
          break;
        case 'top-artists':
          data = topArtistsData?.data || [];
          filename = `top-artists-${dateRange}`;
          break;
      }

      if (data.length === 0) {
        alert('No data available to export for this time period');
        setIsExporting(false);
        return;
      }

      // Export based on format
      if (format === 'json') {
        const content = JSON.stringify(data, null, 2);
        downloadFile(content, `${filename}.json`, 'application/json');
      } else {
        const content = convertToCSV(data);
        downloadFile(content, `${filename}.csv`, 'text/csv');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatedCard>
      <AnimatedCard.Header
        title="Export Your Data"
        description="Download your listening history in CSV or JSON format"
        icon="📊"
      />

      {/* Date Range Selector */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Time Period</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All Time' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
            { value: '1y', label: 'Last Year' },
          ].map((option) => (
            <Button
              key={option.value}
              variant="secondary"
              size="sm"
              isActive={dateRange === option.value}
              onClick={() => setDateRange(option.value as any)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        {/* Listening History */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">Listening History</h3>
              <p className="text-sm text-gray-400">
                Complete play-by-play history ({historyData?.count || 0} tracks)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              fullWidth
              loading={isExporting}
              onClick={() => handleExport('csv', 'history')}
            >
              Export CSV
            </Button>
            <Button
              variant="accent"
              size="sm"
              fullWidth
              loading={isExporting}
              onClick={() => handleExport('json', 'history')}
            >
              Export JSON
            </Button>
          </div>
        </div>

        {/* Top Tracks */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">Top Tracks</h3>
              <p className="text-sm text-gray-400">
                Most played tracks by play count ({topTracksData?.count || 0} tracks)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              fullWidth
              loading={isExporting}
              onClick={() => handleExport('csv', 'top-tracks')}
            >
              Export CSV
            </Button>
            <Button
              variant="accent"
              size="sm"
              fullWidth
              loading={isExporting}
              onClick={() => handleExport('json', 'top-tracks')}
            >
              Export JSON
            </Button>
          </div>
        </div>

        {/* Top Artists */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">Top Artists</h3>
              <p className="text-sm text-gray-400">
                Most played artists by play count ({topArtistsData?.count || 0} artists)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              fullWidth
              loading={isExporting}
              onClick={() => handleExport('csv', 'top-artists')}
            >
              Export CSV
            </Button>
            <Button
              variant="accent"
              size="sm"
              fullWidth
              loading={isExporting}
              onClick={() => handleExport('json', 'top-artists')}
            >
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <p className="text-cyan-300 text-sm">
          💡 <strong>Tip:</strong> Use CSV for spreadsheet analysis (Excel, Google Sheets) or JSON for
          programmatic access and data science projects.
        </p>
      </div>
    </AnimatedCard>
  );
}
