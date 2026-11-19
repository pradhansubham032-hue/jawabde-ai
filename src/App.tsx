/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import {
  CityLocation,
  CivicTicket,
  ClosureAuditResult,
  SupportedLanguage,
} from './types';
import {
  CITY_PRESETS,
  INITIAL_CIVIC_TICKETS,
  LANGUAGE_PACKS,
} from './data/presets';
import { urlToBase64Parts } from './utils/legalTemplates';
import { TopHeader } from './components/TopHeader';
import { EvidenceIntakePanel } from './components/EvidenceIntakePanel';
import { AccountabilityMapPanel } from './components/AccountabilityMapPanel';
import { LegalEnginePanel } from './components/LegalEnginePanel';
import { ShareCardModal } from './components/ShareCardModal';
import { WebhookModal } from './components/WebhookModal';

const STORAGE_TICKETS_KEY = 'jawabde_ai_tickets_v1';
const STORAGE_WEBHOOK_KEY = 'jawabde_ai_webhook_url_v1';
const STORAGE_LANG_KEY = 'jawabde_ai_lang_v1';

function loadStoredTickets(): CivicTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_TICKETS_KEY);
    if (!raw) return INITIAL_CIVIC_TICKETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_CIVIC_TICKETS;
  } catch {
    return INITIAL_CIVIC_TICKETS;
  }
}

export default function App() {
  const [tickets, setTickets] = useState<CivicTicket[]>(loadStoredTickets);
  const [activeCity, setActiveCity] = useState<CityLocation>(CITY_PRESETS[0]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    () => loadStoredTickets()[0]?.id || null
  );
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY) as SupportedLanguage | null;
      return saved && saved in LANGUAGE_PACKS ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [shareModalTicket, setShareModalTicket] = useState<CivicTicket | null>(null);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_WEBHOOK_KEY) || '';
    } catch {
      return '';
    }
  });
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const langPack = LANGUAGE_PACKS[language];

  // Persist tickets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    } catch {
      // ignore storage quota errors on large custom photos
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, language);
    } catch {
      // ignore storage errors
    }
  }, [language]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null,
    [tickets, selectedTicketId]
  );

  const forwardToWebhook = async (ticket: CivicTicket, eventName: string) => {
    if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
      return;
    }
    try {
      const res = await fetch('/api/webhook-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          payload: {
            event: eventName,
            id: ticket.id,
            city: ticket.city,
            state: ticket.state,
            pinCode: ticket.pinCode,
            status: ticket.status,
            contractorName: ticket.audit.contractorName,
            projectWorkId: ticket.audit.projectWorkId,
            sanctionedAmount: ticket.audit.sanctionedAmount,
            safetyScore: ticket.audit.safetyScore,
            upvotes: ticket.upvotes,
          },
        }),
      });
      if (res.ok) {
        setLastSyncMessage(`Synced ${ticket.id} to Google Sheets webhook.`);
      }
    } catch {
      // Keep non-blocking for demo flow
    }
  };

  const handleSelectCity = (city: CityLocation) => {
    setActiveCity(city);
    // Automatically highlight an existing audit pin in that city if one exists
    const matchingTicket = tickets.find(
      (t) => t.city.toLowerCase() === city.name.toLowerCase()
    );
    if (matchingTicket) {
      setSelectedTicketId(matchingTicket.id);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const found = tickets.find((t) => t.id === ticketId);
    if (found) {
      setActiveCity({
        id: `ticket-loc-${found.id}`,
        name: found.city,
        state: found.state,
        pinCode: found.pinCode,
        lat: found.lat,
        lng: found.lng,
        label: `${found.city} (${found.state})`,
      });
    }
  };

  const handleRunAudit = async (payload: {
    imageUrl: string;
    description: string;
    ignoredTicketId: string;
    presetId?: string;
  }) => {
    setIsAuditing(true);
    setAuditStep(1);
    setAuditError(null);

    const step2Timer = setTimeout(() => setAuditStep(2), 900);
    const step3Timer = setTimeout(() => setAuditStep(3), 1900);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (payload.imageUrl) {
        const parts = await urlToBase64Parts(payload.imageUrl);
        imageBase64 = parts.base64;
        imageMimeType = parts.mimeType;
      }

      // Slight deterministic offset around active city center so newly added pins don't overlap identically
      const jitterLat = (Math.random() - 0.5) * 0.024;
      const jitterLng = (Math.random() - 0.5) * 0.024;
      const lat = activeCity.lat + jitterLat;
      const lng = activeCity.lng + jitterLng;

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: payload.description,
          imageBase64,
          imageMimeType,
          city: activeCity.name,
          state: activeCity.state,
          pinCode: activeCity.pinCode,
          lat,
          lng,
          ticketId: payload.ignoredTicketId,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI Warranty Audit request failed.');
      }

      setAuditStep(4);

      const cityCode = activeCity.name
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 3)
        .toUpperCase();
      const newId = `JDB-${cityCode}-${activeCity.pinCode.slice(-3)}-${String(
        tickets.length + 1
      ).padStart(2, '0')}`;

      const newTicket: CivicTicket = {
        id: newId,
        createdAt: new Date().toISOString(),
        city: activeCity.name,
        state: activeCity.state,
        pinCode: activeCity.pinCode,
        lat,
        lng,
        imageUrl: payload.imageUrl,
        description: payload.description,
        ignoredTicketId: payload.ignoredTicketId || undefined,
        status: 'warranty_failure',
        upvotes: 1,
        daysIgnored: payload.ignoredTicketId ? 18 : 7,
        audit: data.audit,
      };

      setTickets((prev) => [newTicket, ...prev]);
      setSelectedTicketId(newTicket.id);
      setActiveCity({
        ...activeCity,
        lat,
        lng,
      });

      void forwardToWebhook(newTicket, 'NEW_WARRANTY_AUDIT');
    } catch (err) {
      setAuditError(
        err instanceof Error
          ? err.message
          : 'Unable to complete AI Contractor Warranty Audit.'
      );
    } finally {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      setIsAuditing(false);
      setAuditStep(0);
    }
  };

  const handleUpvoteTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, upvotes: t.upvotes + 1 } : t
      )
    );
  };

  const handleMarkRtiEscalated = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const updated: CivicTicket = { ...t, status: 'rti_escalated' };
        void forwardToWebhook(updated, 'RTI_ESCALATED');
        return updated;
      })
    );
  };

  const handleClosureAuditComplete = (
    ticketId: string,
    result: ClosureAuditResult
  ) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const updated: CivicTicket = {
          ...t,
          closureAudit: result,
          status:
            result.verdict === 'APPROVED_REPAIR'
              ? 'verified_repaired'
              : 'warranty_failure',
          daysIgnored: result.verdict === 'APPROVED_REPAIR' ? 0 : t.daysIgnored,
        };
        void forwardToWebhook(
          updated,
          result.verdict === 'APPROVED_REPAIR'
            ? 'CLOSURE_VERIFIED_REPAIRED'
            : 'FAKE_CLOSURE_BLOCKED'
        );
        return updated;
      })
    );
  };

  const handleSaveWebhook = (url: string) => {
    setWebhookUrl(url);
    try {
      localStorage.setItem(STORAGE_WEBHOOK_KEY, url);
    } catch {
      // ignore storage errors
    }
  };

  const handleResetDemoData = () => {
    setTickets(INITIAL_CIVIC_TICKETS);
    setActiveCity(CITY_PRESETS[0]);
    setSelectedTicketId(INITIAL_CIVIC_TICKETS[0].id);
    try {
      localStorage.setItem(
        STORAGE_TICKETS_KEY,
        JSON.stringify(INITIAL_CIVIC_TICKETS)
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <TopHeader
        activeCity={activeCity}
        onSelectCity={handleSelectCity}
        language={language}
        onChangeLanguage={setLanguage}
        langPack={langPack}
        onOpenWebhookModal={() => setWebhookModalOpen(true)}
        webhookConfigured={Boolean(webhookUrl)}
      />

      {/* Responsive 3-Column Governance Workspace */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 lg:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Evidence Intake & Contractor Warranty Checker */}
          <div className="lg:col-span-4 xl:col-span-3">
            <EvidenceIntakePanel
              activeCity={activeCity}
              langPack={langPack}
              selectedTicket={selectedTicket}
              isAuditing={isAuditing}
              auditStep={auditStep}
              auditError={auditError}
              onRunAudit={handleRunAudit}
            />
          </div>

          {/* Center Stage: Live Pan-India Accountability Map & Community Upvotes */}
          <div className="lg:col-span-8 xl:col-span-5">
            <AccountabilityMapPanel
              activeCity={activeCity}
              tickets={tickets}
              selectedTicketId={selectedTicket?.id || null}
              onSelectTicket={handleSelectTicket}
              onUpvoteTicket={handleUpvoteTicket}
              onOpenShareCard={(t) => setShareModalTicket(t)}
              langPack={langPack}
            />
          </div>

          {/* Right Panel: 3-Tab Autonomous Legal & Verification Engine */}
          <div className="lg:col-span-12 xl:col-span-4">
            <LegalEnginePanel
              ticket={selectedTicket}
              language={language}
              langPack={langPack}
              onMarkRtiEscalated={handleMarkRtiEscalated}
              onClosureAuditComplete={handleClosureAuditComplete}
            />
          </div>
        </div>
      </main>

      {/* Quiet Governance Footer */}
      <footer className="border-t border-slate-200 bg-white mt-6">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            JawabDe AI — Pan-India Contractor Defect Liability Audit &amp; RTI Act 2005 Platform
          </span>
          <span>
            Geocoding by Open-Meteo · Cartography by OpenStreetMap contributors
          </span>
        </div>
      </footer>

      {/* Modals */}
      <ShareCardModal
        ticket={shareModalTicket}
        onClose={() => setShareModalTicket(null)}
      />

      <WebhookModal
        open={webhookModalOpen}
        webhookUrl={webhookUrl}
        ticketCount={tickets.length}
        lastSyncMessage={lastSyncMessage}
        onSaveWebhook={handleSaveWebhook}
        onResetDemoData={handleResetDemoData}
        onClose={() => setWebhookModalOpen(false)}
      />
    </div>
  );
}
