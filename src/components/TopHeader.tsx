import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  Globe,
  Scale,
  Database,
  Loader2,
  X,
} from 'lucide-react';
import { CityLocation, LanguagePack, SupportedLanguage } from '../types';
import { CITY_PRESETS, LANGUAGE_PACKS } from '../data/presets';

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  postcodes?: string[];
}

interface TopHeaderProps {
  activeCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  langPack: LanguagePack;
  onOpenWebhookModal: () => void;
  webhookConfigured: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeCity,
  onSelectCity,
  language,
  onChangeLanguage,
  langPack,
  onOpenWebhookModal,
  webhookConfigured,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setDropdownOpen(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setDropdownOpen(true);

    try {
      let geocodeQuery = trimmed;
      let resolvedPin = '';
      let resolvedStateHint = '';

      // Support 6-digit Indian PIN code lookups via India Post API before geocoding coordinates
      if (/^\d{6}$/.test(trimmed)) {
        resolvedPin = trimmed;
        try {
          const pinRes = await fetch(`https://api.postalpincode.in/pincode/${trimmed}`);
          const pinJson = await pinRes.json();
          const office = pinJson?.[0]?.PostOffice?.[0];
          if (office?.District) {
            geocodeQuery = office.District;
            resolvedStateHint = office.State || '';
          }
        } catch {
          // Fall back directly to Open-Meteo search if postal API is unavailable
        }
      }

      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        geocodeQuery
      )}&count=5&language=en&format=json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Geocoding service temporarily unavailable.');
      }
      const data = (await response.json()) as { results?: OpenMeteoResult[] };
      const rawList = data.results || [];

      // Prioritize Indian locations while allowing any match
      const indianMatches = rawList.filter((r) => r.country_code === 'IN');
      const finalPool = indianMatches.length > 0 ? indianMatches : rawList;

      if (finalPool.length === 0) {
        setResults([]);
        setSearchError(`No Indian city or PIN match found for "${trimmed}".`);
        return;
      }

      const mapped: CityLocation[] = finalPool.map((item) => {
        const stateName = resolvedStateHint || item.admin1 || item.country || 'India';
        const pin =
          resolvedPin ||
          item.postcodes?.[0] ||
          `${Math.floor(110001 + Math.abs(Math.round(item.latitude * 1000)) % 790000)}`;
        return {
          id: `geo-${item.id}`,
          name: item.name,
          state: stateName,
          pinCode: pin,
          lat: item.latitude,
          lng: item.longitude,
          label: `${item.name} (${stateName})`,
        };
      });

      setResults(mapped);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Unable to geocode location right now.'
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocation(query);
  };

  const handlePickResult = (city: CityLocation) => {
    onSelectCity(city);
    setQuery(city.label);
    setDropdownOpen(false);
  };

  return (
    <header className="w-full sticky top-0 z-40">
      {/* Primary Deep Navy Governance Command Bar */}
      <div className="bg-[#0F172A] text-white border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 lg:gap-6">
          {/* Brand Title */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-amber-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                JawabDe AI
              </h1>
              <span className="hidden sm:inline text-slate-600 select-none" aria-hidden="true">
                |
              </span>
              <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[340px]">
                {langPack.brandSubtitle}
              </span>
            </div>
          </div>

          {/* All-India City / PIN Search Bar (Open-Meteo Geocoding API) */}
          <div ref={searchBoxRef} className="relative flex-1 min-w-[260px] max-w-xl order-3 lg:order-2">
            <form onSubmit={handleSubmit} className="flex items-center">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    if (results.length > 0 || searchError) setDropdownOpen(true);
                  }}
                  placeholder={langPack.searchPlaceholder}
                  aria-label="Search any Indian city, district, or PIN code"
                  className="w-full h-10 pl-10 pr-9 rounded-l-lg bg-slate-800/90 border border-slate-700 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-slate-800 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setSearchError(null);
                      setDropdownOpen(false);
                    }}
                    aria-label="Clear location search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searching}
                className="h-10 px-4 rounded-r-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{langPack.searchButton}</span>
                )}
              </button>
            </form>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white text-slate-900 rounded-lg border border-slate-200 shadow-xl overflow-hidden z-50">
                {searching && (
                  <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                    Geocoding via Open-Meteo India index...
                  </div>
                )}
                {!searching && searchError && (
                  <div className="px-4 py-3 text-xs text-rose-700 bg-rose-50">
                    {searchError}
                  </div>
                )}
                {!searching &&
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePickResult(item)}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {item.state} · PIN {item.pinCode}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                        {item.lat.toFixed(2)}°N, {item.lng.toFixed(2)}°E
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2.5 shrink-0 order-2 lg:order-3">
            <label htmlFor="language-select" className="sr-only">
              Select interface language
            </label>
            <div className="relative flex items-center">
              <Globe
                className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="language-select"
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
                className="h-10 pl-9 pr-8 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {(Object.keys(LANGUAGE_PACKS) as SupportedLanguage[]).map((code) => (
                  <option key={code} value={code} className="bg-slate-900 text-white">
                    {LANGUAGE_PACKS[code].nativeLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick City Presets & Persistence Strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-xs font-semibold text-slate-500 mr-1.5 whitespace-nowrap shrink-0">
              Quick Jurisdictions:
            </span>
            {CITY_PRESETS.map((city) => {
              const isActive =
                activeCity.name.toLowerCase() === city.name.toLowerCase();
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    onSelectCity(city);
                    setQuery('');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {city.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
            <div className="hidden md:flex items-center gap-2 font-mono">
              <span className="text-slate-500">Active Zone:</span>
              <span className="font-semibold text-slate-900">
                {activeCity.name}, {activeCity.state}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-700">PIN {activeCity.pinCode}</span>
            </div>

            <button
              type="button"
              onClick={onOpenWebhookModal}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {webhookConfigured ? 'Sheets Webhook Active' : 'Local Sync / Webhook'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
