import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ThumbsUp,
  Share2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Users,
  IndianRupee,
} from 'lucide-react';
import {
  CityLocation,
  CivicTicket,
  LanguagePack,
  TicketStatus,
} from '../types';

interface AccountabilityMapPanelProps {
  activeCity: CityLocation;
  tickets: CivicTicket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  onUpvoteTicket: (ticketId: string) => void;
  onOpenShareCard: (ticket: CivicTicket) => void;
  langPack: LanguagePack;
}

const PIN_COLORS: Record<TicketStatus, { fill: string; stroke: string; label: string }> = {
  warranty_failure: {
    fill: '#DC2626',
    stroke: '#7F1D1D',
    label: 'Warranty Failure',
  },
  rti_escalated: {
    fill: '#7C3AED',
    stroke: '#4C1D95',
    label: 'RTI Escalated',
  },
  verified_repaired: {
    fill: '#059669',
    stroke: '#064E3B',
    label: 'Verified Repaired',
  },
  under_audit: {
    fill: '#D97706',
    stroke: '#78350F',
    label: 'Under Warranty Audit',
  },
};

function createCivicPinIcon(status: TicketStatus, isSelected: boolean): L.DivIcon {
  const { fill, stroke } = PIN_COLORS[status];
  const size = isSelected ? 38 : 30;
  const ring = isSelected
    ? `<circle cx="19" cy="17" r="15" fill="none" stroke="${fill}" stroke-opacity="0.32" stroke-width="4" />`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 38 46">
      ${ring}
      <path d="M19 3C11.27 3 5 9.27 5 17c0 10.2 14 25 14 25s14-14.8 14-25C33 9.27 26.73 3 19 3z"
        fill="${fill}" stroke="${stroke}" stroke-width="2" />
      <circle cx="19" cy="17" r="5.5" fill="#FFFFFF" />
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-civic-pin',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 2)],
  });
}

const MapViewController: React.FC<{ lat: number; lng: number; zoom?: number }> = ({
  lat,
  lng,
  zoom = 12,
}) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.9 });
  }, [lat, lng, zoom, map]);
  return null;
};

export const AccountabilityMapPanel: React.FC<AccountabilityMapPanelProps> = ({
  activeCity,
  tickets,
  selectedTicketId,
  onSelectTicket,
  onUpvoteTicket,
  onOpenShareCard,
  langPack,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [cardImgError, setCardImgError] = useState(false);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null,
    [tickets, selectedTicketId]
  );

  useEffect(() => {
    setCardImgError(false);
  }, [selectedTicket?.id, selectedTicket?.imageUrl]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const totalSanctionedLakhs = useMemo(
    () => tickets.reduce((sum, t) => sum + (t.audit.sanctionedLakhs || 0), 0),
    [tickets]
  );

  const verifiedCount = useMemo(
    () => tickets.filter((t) => t.status === 'verified_repaired').length,
    [tickets]
  );

  const rtiCount = useMemo(
    () => tickets.filter((t) => t.status === 'rti_escalated').length,
    [tickets]
  );

  const renderStatusBadge = (status: TicketStatus) => {
    const label = langPack.statusLabels[status];
    if (status === 'verified_repaired') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {label}
        </span>
      );
    }
    if (status === 'rti_escalated') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
          <FileText className="w-3.5 h-3.5" />
          {label}
        </span>
      );
    }
    if (status === 'under_audit') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" />
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
        <AlertOctagon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  return (
    <section className="flex flex-col gap-4 min-w-0">
      {/* Compact Pan-India Metrics Row (Single Flat Elevation) */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="pr-3 pb-2 sm:pb-0">
          <div className="text-[11px] font-medium text-slate-500">Tracked Audits</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {tickets.length}
          </div>
        </div>
        <div className="pl-3 sm:px-4 pb-2 sm:pb-0">
          <div className="text-[11px] font-medium text-slate-500">Funds Under DLP</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            ₹{totalSanctionedLakhs.toFixed(1)}L
          </div>
        </div>
        <div className="pr-3 pt-2 sm:pt-0 sm:px-4">
          <div className="text-[11px] font-medium text-slate-500">RTI Escalated</div>
          <div className="text-lg font-bold font-mono text-purple-700 mt-0.5">
            {rtiCount}
          </div>
        </div>
        <div className="pl-3 pt-2 sm:pt-0 sm:pl-4">
          <div className="text-[11px] font-medium text-slate-500">Verified Repaired</div>
          <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
            {verifiedCount}
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Accountability Map Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        {/* Map Toolbar & Filter Controls */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {langPack.mapTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any pin to inspect contractor warranty, confirm issue (+1), or file RTI
            </p>
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
            role="tablist"
            aria-label="Filter map pins by status"
          >
            {(
              [
                ['all', 'All'],
                ['warranty_failure', 'Warranty Failure'],
                ['rti_escalated', 'RTI Escalated'],
                ['verified_repaired', 'Repaired'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={statusFilter === key}
                onClick={() => setStatusFilter(key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaflet Map Viewport */}
        <div className="relative h-[380px] sm:h-[420px] w-full">
          <MapContainer
            center={[activeCity.lat, activeCity.lng]}
            zoom={12}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewController lat={activeCity.lat} lng={activeCity.lng} />

            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <Marker
                  key={ticket.id}
                  position={[ticket.lat, ticket.lng]}
                  icon={createCivicPinIcon(ticket.status, isSelected)}
                  eventHandlers={{
                    click: () => onSelectTicket(ticket.id),
                  }}
                >
                  <Popup>
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900 leading-snug pr-4">
                          {ticket.audit.title}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>
                          <span className="font-semibold text-slate-800">Contractor:</span>{' '}
                          {ticket.audit.contractorName}
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span>Tender: {ticket.audit.sanctionedAmount}</span>
                          <span>
                            {ticket.daysIgnored > 0
                              ? `${ticket.daysIgnored}d ignored`
                              : 'Resolved'}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpvoteTicket(ticket.id);
                          }}
                          className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>+1 ({ticket.upvotes})</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(ticket.id);
                            onOpenShareCard(ticket);
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share Card</span>
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Clean Color Legend Footer (Text + Swatch, Never Color-Only) */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
              Warranty Failure
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
              RTI Escalated
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              Verified Repaired
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Under Audit
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Showing {filteredTickets.length} of {tickets.length} audits
          </span>
        </div>
      </div>

      {/* Selected Civic Accountability Card */}
      {selectedTicket ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Evidence Thumbnail */}
            <div className="sm:w-44 aspect-[4/3] sm:aspect-auto sm:h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
              {!cardImgError ? (
                <img
                  src={selectedTicket.imageUrl}
                  alt={selectedTicket.audit.title}
                  referrerPolicy="no-referrer"
                  onError={() => setCardImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-2 text-center">
                  Site Photo Evidence
                </div>
              )}
            </div>

            {/* Ticket Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>{selectedTicket.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedTicket.city}, {selectedTicket.state} ({selectedTicket.pinCode})
                  </span>
                </div>
                {renderStatusBadge(selectedTicket.status)}
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {selectedTicket.audit.title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div>
                  <div className="text-slate-500">Contractor</div>
                  <div className="font-semibold text-slate-900 truncate">
                    {selectedTicket.audit.contractorName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    Tender Value
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {selectedTicket.audit.sanctionedAmount}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Days Ignored
                  </div>
                  <div className="font-mono font-semibold text-rose-700">
                    {selectedTicket.status === 'verified_repaired'
                      ? '0 Days (Closed)'
                      : `${selectedTicket.daysIgnored} Days`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Verification & Share Actions */}
          <div className="pt-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onUpvoteTicket(selectedTicket.id)}
                className="h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                <span>{langPack.confirmIssueBtn}</span>
                <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                  {selectedTicket.upvotes}
                </span>
              </button>

              {selectedTicket.upvotes >= 10 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>{langPack.massPetitionLabel}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-mono">
                  {10 - selectedTicket.upvotes} more to trigger Mass Citizen Petition
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenShareCard(selectedTicket)}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{langPack.shareCardBtn}</span>
            </button>
          </div>

          {/* Quick Ticket Switcher for All Tracked Pins */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-2">
              Pan-India Tracked Audits ({tickets.length})
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {tickets.map((t) => {
                const active = t.id === selectedTicket.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTicket(t.id)}
                    className={`px-2.5 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3 h-3 opacity-70" />
                    <span>{t.city}</span>
                    <span className="font-mono text-[10px] opacity-75">
                      · {t.upvotes}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
          Select a pin on the map or run a new Contractor Warranty Audit to inspect details.
        </div>
      )}
    </section>
  );
};
