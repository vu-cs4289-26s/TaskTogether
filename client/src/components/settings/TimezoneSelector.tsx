'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface TimezoneOption {
  value: string;
  label: string;
  region: string;
  currentTime: string;
  offset: string;
}

interface TimezoneSelectorProps {
  value: string | null;
  autoDetect: boolean;
  onChange: (timezone: string | null, autoDetect: boolean) => void;
}

// Group timezones by region
const TIMEZONE_GROUPS: Record<string, string[]> = {
  'Americas': [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'America/Honolulu', 'America/Phoenix', 'America/Toronto',
    'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
    'America/Santiago', 'America/Lima', 'America/Bogota'
  ],
  'Europe': [
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
    'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna', 'Europe/Zurich',
    'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki',
    'Europe/Moscow', 'Europe/Istanbul', 'Europe/Athens', 'Europe/Warsaw', 'Europe/Prague',
    'Europe/Budapest', 'Europe/Dublin', 'Europe/Lisbon'
  ],
  'Asia': [
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul',
    'Asia/Taipei', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Kuala_Lumpur', 'Asia/Manila',
    'Asia/Hanoi', 'Asia/Kolkata', 'Asia/Mumbai', 'Asia/Dubai', 'Asia/Tehran',
    'Asia/Baghdad', 'Asia/Riyadh', 'Asia/Jerusalem', 'Asia/Beirut', 'Asia/Amman',
    'Asia/Bangkok', 'Asia/Dhaka', 'Asia/Karachi', 'Asia/Kathmandu'
  ],
  'Pacific': [
    'Pacific/Auckland', 'Pacific/Sydney', 'Pacific/Melbourne', 'Pacific/Brisbane',
    'Pacific/Perth', 'Pacific/Adelaide', 'Pacific/Honolulu', 'Pacific/Fiji',
    'Pacific/Guam', 'Pacific/Port_Moresby', 'Pacific/Tahiti', 'Pacific/Noumea'
  ],
  'Africa': [
    'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
    'Africa/Casablanca', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Accra',
    'Africa/Dakar', 'Africa/Addis_Ababa', 'Africa/Kampala', 'Africa/Dar_es_Salaam'
  ],
  'Atlantic': [
    'Atlantic/Reykjavik', 'Atlantic/Azores', 'Atlantic/Bermuda', 'Atlantic/Canary',
    'Atlantic/Cape_Verde', 'Atlantic/Faroe', 'Atlantic/Madeira', 'Atlantic/South_Georgia'
  ]
};

function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

function getCurrentTime(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
}

function getRegionLabel(region: string): string {
  const labels: Record<string, string> = {
    'Americas': '🌎 Americas',
    'Europe': '🌍 Europe',
    'Asia': '🌏 Asia',
    'Pacific': '🌏 Pacific',
    'Africa': '🌍 Africa',
    'Atlantic': '🌊 Atlantic'
  };
  return labels[region] || region;
}

function getTimezoneDisplayName(timezone: string): string {
  // Convert "America/New_York" to "New York" or "Eastern Time"
  const parts = timezone.split('/');
  if (parts.length === 2) {
    const city = parts[1].replace(/_/g, ' ');
    return city;
  }
  return timezone.replace(/_/g, ' ');
}

export default function TimezoneSelector({ value, autoDetect, onChange }: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect user's timezone
  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);

  // Build timezone options
  const timezoneOptions = useMemo<TimezoneOption[]>(() => {
    const options: TimezoneOption[] = [];
    
    Object.entries(TIMEZONE_GROUPS).forEach(([region, timezones]) => {
      timezones.forEach(tz => {
        options.push({
          value: tz,
          label: getTimezoneDisplayName(tz),
          region: getRegionLabel(region),
          currentTime: getCurrentTime(tz),
          offset: getTimezoneOffset(tz)
        });
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return timezoneOptions;
    const term = searchTerm.toLowerCase();
    return timezoneOptions.filter(option => 
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term) ||
      option.region.toLowerCase().includes(term)
    );
  }, [timezoneOptions, searchTerm]);

  // Group filtered options by region
  const groupedOptions = useMemo(() => {
    const groups: Record<string, TimezoneOption[]> = {};
    filteredOptions.forEach(option => {
      if (!groups[option.region]) {
        groups[option.region] = [];
      }
      groups[option.region].push(option);
    });
    return groups;
  }, [filteredOptions]);

  // Handle auto-detect toggle
  const handleAutoToggle = useCallback(() => {
    const newAutoDetect = !autoDetect;
    if (newAutoDetect) {
      onChange(detectedTimezone, true);
    } else {
      onChange(value || detectedTimezone, false);
    }
  }, [autoDetect, detectedTimezone, value, onChange]);

  // Handle timezone selection
  const handleSelect = useCallback((timezoneValue: string) => {
    onChange(timezoneValue, false);
    setIsOpen(false);
    setSearchTerm('');
  }, [onChange]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Get display value
  const displayValue = useMemo(() => {
    if (autoDetect) {
      return `Auto-detect (${getTimezoneDisplayName(detectedTimezone)})`;
    }
    if (value) {
      const option = timezoneOptions.find(opt => opt.value === value);
      if (option) {
        return `${option.label} (${option.currentTime})`;
      }
      return getTimezoneDisplayName(value);
    }
    return 'Select timezone...';
  }, [autoDetect, detectedTimezone, value, timezoneOptions]);

  return (
    <div ref={containerRef} className="relative">
      {/* Auto-detect toggle */}
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={handleAutoToggle}
          className={[
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2',
            autoDetect ? 'bg-sage' : 'bg-gray-300'
          ].join(' ')}
          aria-pressed={autoDetect}
        >
          <span
            className={[
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
              autoDetect ? 'translate-x-5' : 'translate-x-0.5'
            ].join(' ')}
          />
        </button>
        <span className="text-sm text-text-primary">
          Auto-detect timezone
        </span>
      </div>

      {/* Timezone selector dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={autoDetect}
          className={[
            'w-full min-w-[280px] px-4 py-2.5 rounded-md border text-left text-sm transition-colors focus:outline-none focus:border-sage',
            autoDetect 
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-surface border-divider text-text-primary hover:border-sage'
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{displayValue}</span>
            {!autoDetect && (
              <svg 
                className={['w-4 h-4 text-text-secondary transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </button>

        {/* Dropdown menu */}
        {isOpen && !autoDetect && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-divider rounded-md shadow-lg max-h-[400px] overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-divider">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search timezones..."
                  className="w-full px-3 py-1.5 pl-9 text-sm border border-divider rounded-sm bg-base text-text-primary placeholder-text-secondary focus:outline-none focus:border-sage"
                />
                <svg 
                  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto max-h-[320px]">
              {Object.entries(groupedOptions).map(([region, options]) => (
                <div key={region}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-text-secondary bg-soft-highlight uppercase tracking-wide">
                    {region}
                  </div>
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={[
                        'w-full px-3 py-2 text-left text-sm hover:bg-soft-highlight transition-colors flex items-center justify-between',
                        value === option.value ? 'bg-sage/10 text-sage' : 'text-text-primary'
                      ].join(' ')}
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-text-secondary">{option.offset}</div>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {option.currentTime}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-4 text-sm text-text-secondary text-center">
                  No timezones found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Current timezone hint */}
      <div className="mt-2 text-xs text-text-secondary">
        {autoDetect ? (
          <span>Using detected timezone: <strong>{detectedTimezone}</strong></span>
        ) : value ? (
          <span>Selected timezone: <strong>{value}</strong></span>
        ) : (
          <span>No timezone selected</span>
        )}
      </div>
    </div>
  );
}
