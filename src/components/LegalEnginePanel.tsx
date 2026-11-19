import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Scale,
  ScanSearch,
  Volume2,
  Square,
  Copy,
  Check,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Send,
} from 'lucide-react';
import {
  CivicTicket,
  ClosureAuditResult,
  LanguagePack,
  SupportedLanguage,
} from '../types';
import { ASSET_PATHS } from '../data/presets';
import {
  downloadTextFile,
  generateRtiApplication,
  generateWarrantyDemandNotice,
  urlToBase64Parts,
} from '../utils/legalTemplates';

interface LegalEnginePanelProps {
  ticket: CivicTicket | null;
  language: SupportedLanguage;
  langPack: LanguagePack;
  onMarkRtiEscalated: (ticketId: string) => void;
  onClosureAuditComplete: (
    ticketId: string,
    result: ClosureAuditResult
  ) => void;
}

type LegalTab = 'rti' | 'demand' | 'closure';

export const LegalEnginePanel: React.FC<LegalEnginePanelProps> = ({
  ticket,
  language,
  langPack,
  onMarkRtiEscalated,
  onClosureAuditComplete,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>('rti');
  const [bplExempt, setBplExempt] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Tab 3: Before vs. After Closure Auditor state
  const [afterImageUrl, setAfterImageUrl] = useState<string>(
    ASSET_PATHS.repairedRoadAfter
  );
  const [afterPresetMode, setAfterPresetMode] = useState<
    'genuine' | 'fake' | 'custom'
  >('genuine');
  const [isVerifyingClosure, setIsVerifyingClosure] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);
  const afterFileRef = useRef<HTMLInputElement>(null);

  // Stop speech synthesis on unmount or tab/ticket switch
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setClosureError(null);
  }, [ticket?.id, activeTab, language]);

  if (!ticket) {
    return (
      <aside className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center text-sm text-slate-500">
        Select an audited infrastructure case to generate RTI Act 2005 filings,
        Warranty Demand Notices, or run Before-vs-After Closure Verification.
      </aside>
    );
  }

  const rtiDraft = generateRtiApplication(ticket, bplExempt, language);
  const demandNoticeDraft = generateWarrantyDemandNotice(ticket, language);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback copy via textarea
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleToggleSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langPack.speechLocale;
    utterance.rate = 0.96;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleAfterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAfterImageUrl(reader.result as string);
      setAfterPresetMode('custom');
      setClosureError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunClosureAudit = async () => {
    setIsVerifyingClosure(true);
    setClosureError(null);
    try {
      const [beforeParts, afterParts] = await Promise.all([
        urlToBase64Parts(ticket.imageUrl),
        urlToBase64Parts(afterImageUrl),
      ]);

      const response = await fetch('/api/verify-closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeImageBase64: beforeParts.base64,
          beforeMimeType: beforeParts.mimeType,
          afterImageBase64: afterParts.base64,
          afterMimeType: afterParts.mimeType,
          issueTitle: ticket.audit.title,
          locationLabel: `${ticket.audit.wardLabel}, ${ticket.city}, ${ticket.state} (${ticket.pinCode})`,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Visual closure audit failed.');
      }

      const raw = data.result;
      const result: ClosureAuditResult = {
        verdict:
          raw.verdict === 'APPROVED_REPAIR'
            ? 'APPROVED_REPAIR'
            : 'REJECTED_FAKE_CLOSURE',
        confidenceScore: Number(raw.confidenceScore) || 92,
        landmarkMatch: Boolean(raw.landmarkMatch),
        geometryMatch: Boolean(raw.geometryMatch),
        defectResolved: Boolean(raw.defectResolved),
        headline:
          raw.headline ||
          (raw.verdict === 'APPROVED_REPAIR'
            ? 'Verified Repaired — Closure Approved'
            : 'Landmark & Geometry Mismatch — Fake Closure Blocked'),
        detailedAnalysis: raw.detailedAnalysis || '',
        recommendedAction: raw.recommendedAction || '',
        checkedAt: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        afterImageUrl,
      };

      onClosureAuditComplete(ticket.id, result);
    } catch (err) {
      setClosureError(
        err instanceof Error
          ? err.message
          : 'Could not complete Before vs. After AI comparison.'
      );
    } finally {
      setIsVerifyingClosure(false);
    }
  };

  const closureResult = ticket.closureAudit;

  return (
    <aside className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900">
          Autonomous Legal & Verification Engine
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 truncate font-mono">
          {ticket.audit.projectWorkId} · {ticket.city} ({ticket.pinCode})
        </p>
      </div>

      {/* 3-Tab Segmented Navigation */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-50/70">
        <div
          className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-lg"
          role="tablist"
          aria-label="Legal and verification tools"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rti'}
            onClick={() => setActiveTab('rti')}
            className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'rti'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{langPack.tabRti}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'demand'}
            onClick={() => setActiveTab('demand')}
            className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'demand'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{langPack.tabDemand}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'closure'}
            onClick={() => setActiveTab('closure')}
            className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'closure'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanSearch className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{langPack.tabClosure}</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto civic-scroll">
        {/* TAB 1: Legal RTI Generator (Section 6(1), RTI Act 2005) */}
        {activeTab === 'rti' && (
          <>
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Formal RTI Application — Section 6(1), RTI Act 2005
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Addressed to: {ticket.audit.pioDesignation}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-900 whitespace-nowrap shrink-0">
                  {bplExempt ? 'Fee: ₹0' : 'Fee: ₹10'}
                </span>
              </div>

              {/* BPL Fee Exemption Toggle */}
              <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">
                    {langPack.bplLabel}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {bplExempt
                      ? 'Exempt under Sec 7(5) — ₹0 fee clause active'
                      : 'Standard ₹10 IPO / Court Fee Stamp active'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={bplExempt}
                  onClick={() => setBplExempt((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                    bplExempt ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      bplExempt ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Formal RTI Document Viewer */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 max-h-[380px] overflow-y-auto civic-scroll">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                {rtiDraft}
              </pre>
            </div>

            {/* Action Buttons: Listen Out Loud, Copy, Download, Escalate */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSpeech(rtiDraft)}
                  className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    isSpeaking
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>{langPack.stopAudioBtn}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>{langPack.listenBtn}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(rtiDraft, 'rti')}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedKey === 'rti' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">{langPack.copiedBtn}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>{langPack.copyBtn}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(`RTI-Sec6-${ticket.id}.txt`, rtiDraft)
                  }
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>{langPack.downloadBtn}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onMarkRtiEscalated(ticket.id)}
                disabled={ticket.status === 'rti_escalated' || ticket.status === 'verified_repaired'}
                className="w-full h-10 px-4 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {ticket.status === 'rti_escalated'
                    ? 'RTI Escalated (Pin Marked Purple on Map)'
                    : ticket.status === 'verified_repaired'
                      ? 'Already Verified Repaired'
                      : langPack.escalateRtiBtn}
                </span>
              </button>
            </div>
          </>
        )}

        {/* TAB 2: Contractor Warranty Demand Notice */}
        {activeTab === 'demand' && (
          <>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Defect Liability Period — Zero-Cost Rectification Demand
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Formal legal notice to {ticket.audit.contractorName} (Valid until{' '}
                <span className="font-mono">{ticket.audit.warrantyExpiryDate}</span>)
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 max-h-[410px] overflow-y-auto civic-scroll">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                {demandNoticeDraft}
              </pre>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleToggleSpeech(demandNoticeDraft)}
                className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>{langPack.stopAudioBtn}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>{langPack.listenBtn}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(demandNoticeDraft, 'demand')}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'demand' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{langPack.copiedBtn}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>{langPack.copyBtn}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    `Warranty-Demand-${ticket.id}.txt`,
                    demandNoticeDraft
                  )
                }
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>{langPack.downloadBtn}</span>
              </button>
            </div>
          </>
        )}

        {/* TAB 3: AI "Before vs. After" Closure Auditor */}
        {activeTab === 'closure' && (
          <>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                AI Forensic "Before vs. After" Closure Auditor
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Compare original evidence against the contractor&apos;s closure photo.
                Genuine repairs turn the map pin Emerald; mismatched photos are blocked.
              </p>
            </div>

            {/* Quick Judge Test Presets + Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  Select Contractor Closure Submission:
                </span>
                <button
                  type="button"
                  onClick={() => afterFileRef.current?.click()}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload After Photo</span>
                </button>
                <input
                  ref={afterFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAfterFileUpload}
                  className="hidden"
                  aria-label="Upload contractor after repair photo"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAfterImageUrl(ASSET_PATHS.repairedRoadAfter);
                    setAfterPresetMode('genuine');
                    setClosureError(null);
                  }}
                  className={`px-2.5 py-2 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer ${
                    afterPresetMode === 'genuine'
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Test: Repaired Road
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAfterImageUrl(ASSET_PATHS.fakeLocationAfter);
                    setAfterPresetMode('fake');
                    setClosureError(null);
                  }}
                  className={`px-2.5 py-2 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer ${
                    afterPresetMode === 'fake'
                      ? 'bg-rose-900 text-white border-rose-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Test: Fake / Wrong Location
                </button>
              </div>
            </div>

            {/* Side-by-Side Before & After Visual Frames */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-600">
                  Before (Original)
                </div>
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={ticket.imageUrl}
                    alt="Original reported infrastructure defect"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-600">
                  After (Submitted)
                </div>
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={afterImageUrl}
                    alt="Contractor submitted closure evidence"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Run Closure Audit CTA */}
            <button
              type="button"
              onClick={handleRunClosureAudit}
              disabled={isVerifyingClosure}
              className="w-full h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isVerifyingClosure ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Landmarks & Surface Geometry...</span>
                </>
              ) : (
                <>
                  <ScanSearch className="w-4 h-4 text-amber-400" />
                  <span>{langPack.runClosureBtn}</span>
                </>
              )}
            </button>

            {closureError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{closureError}</span>
              </div>
            )}

            {/* Forensic Verdict Output */}
            {closureResult && (
              <div
                className={`p-3.5 rounded-lg border space-y-3 ${
                  closureResult.verdict === 'APPROVED_REPAIR'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {closureResult.verdict === 'APPROVED_REPAIR' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div
                        className={`text-xs font-bold ${
                          closureResult.verdict === 'APPROVED_REPAIR'
                            ? 'text-emerald-950'
                            : 'text-rose-950'
                        }`}
                      >
                        {closureResult.headline}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                        Confidence: {closureResult.confidenceScore}% · Audited{' '}
                        {closureResult.checkedAt}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Forensic Checklist */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-white/80 rounded-md p-2 border border-slate-200/70">
                    <div className="text-slate-500">Landmarks</div>
                    <div
                      className={`font-semibold mt-0.5 flex items-center gap-1 ${
                        closureResult.landmarkMatch
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {closureResult.landmarkMatch ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {closureResult.landmarkMatch ? 'Match' : 'Mismatch'}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-md p-2 border border-slate-200/70">
                    <div className="text-slate-500">Geometry</div>
                    <div
                      className={`font-semibold mt-0.5 flex items-center gap-1 ${
                        closureResult.geometryMatch
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {closureResult.geometryMatch ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {closureResult.geometryMatch ? 'Match' : 'Mismatch'}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-md p-2 border border-slate-200/70">
                    <div className="text-slate-500">Repair</div>
                    <div
                      className={`font-semibold mt-0.5 flex items-center gap-1 ${
                        closureResult.defectResolved
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {closureResult.defectResolved ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {closureResult.defectResolved ? 'Verified' : 'Failed'}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed">
                  {closureResult.detailedAnalysis}
                </p>
                <div className="text-[11px] font-medium text-slate-700 pt-1 border-t border-slate-200/60">
                  Next Action: {closureResult.recommendedAction}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
