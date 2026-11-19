import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  ShieldAlert,
  Building2,
  FileSearch,
  CheckCircle2,
  Loader2,
  Upload,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  CityLocation,
  CivicTicket,
  EvidencePreset,
  LanguagePack,
} from '../types';
import { EVIDENCE_PRESETS } from '../data/presets';

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface EvidenceIntakePanelProps {
  activeCity: CityLocation;
  langPack: LanguagePack;
  selectedTicket: CivicTicket | null;
  isAuditing: boolean;
  auditStep: number;
  auditError: string | null;
  onRunAudit: (payload: {
    imageUrl: string;
    description: string;
    ignoredTicketId: string;
    presetId?: string;
  }) => Promise<void>;
}

export const EvidenceIntakePanel: React.FC<EvidenceIntakePanelProps> = ({
  activeCity,
  langPack,
  selectedTicket,
  isAuditing,
  auditStep,
  auditError,
  onRunAudit,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(EVIDENCE_PRESETS[0].imageUrl);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(
    EVIDENCE_PRESETS[0].id
  );
  const [description, setDescription] = useState<string>(EVIDENCE_PRESETS[0].description);
  const [ignoredTicketId, setIgnoredTicketId] = useState<string>(
    EVIDENCE_PRESETS[0].sampleTicketId
  );
  const [imgFailed, setImgFailed] = useState(false);

  // Voice SpeechRecognition state
  const [isListening, setIsListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup stop errors
        }
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSpeechNotice('Please select a valid JPG, PNG, or WebP photograph.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageUrl(result);
      setActivePresetId(undefined);
      setImgFailed(false);
      setSpeechNotice(null);
    };
    reader.readAsDataURL(file);
  };

  const applyPreset = (preset: EvidencePreset) => {
    setImageUrl(preset.imageUrl);
    setActivePresetId(preset.id);
    setDescription(preset.description);
    setIgnoredTicketId(preset.sampleTicketId);
    setImgFailed(false);
    setSpeechNotice(null);
  };

  const toggleVoiceInput = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setSpeechNotice(
        'Voice dictation is unavailable in this browser. Type your grievance below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = langPack.speechLocale;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcriptParts: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          transcriptParts.push(event.results[i][0].transcript);
        }
        const spokenText = transcriptParts.join(' ').trim();
        if (spokenText) {
          setDescription((prev) =>
            prev.trim() ? `${prev.trim()} ${spokenText}` : spokenText
          );
        }
      };

      recognition.onerror = (evt) => {
        setSpeechNotice(
          evt.error === 'not-allowed'
            ? 'Microphone permission denied. Please allow mic access or type directly.'
            : `Voice recognition paused (${evt.error}). Try speaking clearly again.`
        );
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setSpeechNotice(null);
      setIsListening(true);
      recognition.start();
    } catch {
      setSpeechNotice('Could not start microphone capture. Please type your grievance.');
      setIsListening(false);
    }
  };

  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl && !description.trim()) return;
    await onRunAudit({
      imageUrl,
      description: description.trim(),
      ignoredTicketId: ignoredTicketId.trim(),
      presetId: activePresetId,
    });
  };

  const audit = selectedTicket?.audit;

  return (
    <aside className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {langPack.leftPanelTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {activeCity.name}, {activeCity.state} · PIN {activeCity.pinCode}
          </p>
        </div>
        <FileSearch className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
      </div>

      <div className="p-4 space-y-5 overflow-y-auto civic-scroll">
        {/* Form Section */}
        <form onSubmit={handleSubmitAudit} className="space-y-4">
          {/* 3 Instant Demo Presets */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">
              {langPack.presetsHeading}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {EVIDENCE_PRESETS.map((preset, idx) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono opacity-75 mr-1.5">0{idx + 1}.</span>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Preview + Upload Control */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {langPack.uploadLabel}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload infrastructure photo"
            />

            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3]">
              {imageUrl && !imgFailed ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Submitted civic infrastructure evidence"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-white truncate">
                      {activePresetId
                        ? EVIDENCE_PRESETS.find((p) => p.id === activePresetId)?.shortLabel
                        : 'Uploaded Citizen Site Photo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Replace
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-4 text-center hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    {langPack.uploadLabel}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    {langPack.uploadSubtext}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Voice + Text Grievance Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="grievance-input"
                className="text-xs font-semibold text-slate-700"
              >
                Citizen Complaint / Field Note
              </label>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>{langPack.voiceStop}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>{langPack.voiceStart}</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="grievance-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={langPack.voicePlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 resize-none leading-relaxed"
            />
            {speechNotice && (
              <div className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2">
                <span>{speechNotice}</span>
                <button
                  type="button"
                  onClick={() => setSpeechNotice(null)}
                  aria-label="Dismiss voice notice"
                  className="text-amber-700 hover:text-amber-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Optional Ignored Ticket / CPGRAMS ID */}
          <div>
            <label
              htmlFor="cpgrams-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {langPack.ticketIdLabel}
            </label>
            <input
              id="cpgrams-input"
              type="text"
              value={ignoredTicketId}
              onChange={(e) => setIgnoredTicketId(e.target.value)}
              placeholder="e.g. CPGRAMS/OD/2026/08412"
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isAuditing || (!imageUrl && !description.trim())}
            className="w-full h-11 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isAuditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{langPack.auditingBtn}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>{langPack.runAuditBtn}</span>
              </>
            )}
          </button>

          {/* 3-Step Live Audit Progress */}
          {isAuditing && (
            <div className="pt-2 space-y-2 border-t border-slate-100">
              {[langPack.step1Title, langPack.step2Title, langPack.step3Title].map(
                (label, idx) => {
                  const stepNum = idx + 1;
                  const done = auditStep > stepNum;
                  const active = auditStep === stepNum;
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs"
                    >
                      <span
                        className={
                          active
                            ? 'font-semibold text-slate-900'
                            : done
                              ? 'text-emerald-700 font-medium'
                              : 'text-slate-400'
                        }
                      >
                        {label}
                      </span>
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <span className="text-[11px] text-slate-300 font-mono">
                          Queued
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {auditError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{auditError}</span>
            </div>
          )}
        </form>

        {/* Active 3-Step Audit Output */}
        {audit && selectedTicket && (
          <div className="pt-4 border-t border-slate-200 space-y-5">
            {/* Step 1: Severity Triage */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900">
                  {langPack.step1Title}
                </h3>
                <span
                  className={`text-xs font-mono font-semibold ${
                    audit.safetyScore >= 7
                      ? 'text-rose-700'
                      : audit.safetyScore >= 4
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  Safety Score {audit.safetyScore}/10
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    audit.safetyScore >= 7
                      ? 'bg-rose-600'
                      : audit.safetyScore >= 4
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, audit.safetyScore * 10))}%` }}
                />
              </div>

              <div className="text-xs font-semibold text-slate-900">
                {audit.hazardCategory}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {audit.engineeringFindings}
              </p>
              <p className="text-xs text-rose-700 mt-1.5 font-medium leading-relaxed">
                Public Risk: {audit.immediateRisk}
              </p>
            </section>

            {/* Step 2: Contractor Warranty (Defect Liability Period) Card */}
            <section className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 mb-2.5">
                {langPack.step2Title}
              </h3>

              {/* Bold Active Warranty Banner */}
              <div
                className={`px-3 py-2.5 rounded-lg text-[11px] font-bold tracking-tight leading-snug mb-3 border ${
                  selectedTicket.status === 'verified_repaired'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-700 text-white border-rose-800'
                }`}
              >
                {selectedTicket.status === 'verified_repaired'
                  ? 'WARRANTY FULFILLED — VERIFIED REPAIRED AT ₹0 PUBLIC COST'
                  : langPack.activeWarrantyBanner}
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                <div className="col-span-2">
                  <dt className="text-slate-500">Contractor Entity</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {audit.contractorName}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Project Work ID</dt>
                  <dd className="font-mono font-medium text-slate-900 mt-0.5 break-all">
                    {audit.projectWorkId}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Sanctioned Tax Funds</dt>
                  <dd className="font-mono font-bold text-slate-900 mt-0.5">
                    {audit.sanctionedAmount}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Completion Date</dt>
                  <dd className="font-mono text-slate-800 mt-0.5">
                    {audit.completionDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Warranty Expiry</dt>
                  <dd className="font-mono font-semibold text-emerald-700 mt-0.5">
                    {audit.warrantyExpiryDate}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Invoked Contract Clause</dt>
                  <dd className="text-slate-700 mt-0.5 leading-snug">
                    {audit.violationClause}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Step 3: Jurisdiction & PIO Lookup */}
            <section className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <h3 className="text-xs font-bold text-slate-900">
                  {langPack.step3Title}
                </h3>
              </div>

              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-slate-500">Responsible Department</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {audit.departmentName}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Public Information Officer (PIO)</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {audit.pioDesignation}
                  </dd>
                  <dd className="text-slate-600 mt-0.5 leading-snug">
                    {audit.pioOfficeAddress}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>First Appellate Authority</span>
                  <span className="font-mono text-slate-700">
                    SLA: {audit.statutorySlaDays} Days
                  </span>
                </div>
                <div className="text-xs text-slate-700">{audit.appellateAuthority}</div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
};
