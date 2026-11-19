import React, { useState } from 'react';
import { X, Copy, Check, Download, Share2, Users, ShieldCheck, AlertOctagon } from 'lucide-react';
import { CivicTicket } from '../types';
import { downloadShareableCardPng } from '../utils/legalTemplates';

interface ShareCardModalProps {
  ticket: CivicTicket | null;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  ticket,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!ticket) return null;

  const isRepaired = ticket.status === 'verified_repaired';

  const whatsappSummary = [
    `JAWABDE AI — PUBLIC INFRASTRUCTURE WARRANTY AUDIT`,
    `Location: ${ticket.audit.wardLabel}, ${ticket.city}, ${ticket.state} (PIN ${ticket.pinCode})`,
    `Issue: ${ticket.audit.title} (Safety Score: ${ticket.audit.safetyScore}/10)`,
    `Work Order ID: ${ticket.audit.projectWorkId}`,
    `Contractor: ${ticket.audit.contractorName}`,
    `Public Tax Funds Sanctioned: ${ticket.audit.sanctionedAmount}`,
    `Warranty Valid Until: ${ticket.audit.warrantyExpiryDate} (${ticket.audit.dlpMonths} Months DLP)`,
    isRepaired
      ? `Status: VERIFIED REPAIRED — Closure authenticated via AI visual comparison.`
      : `Status: ACTIVE WARRANTY — Contractor MUST repair at ₹0 taxpayer cost!`,
    `Responsible Authority: ${ticket.audit.departmentName}`,
    `Citizen Confirmations: ${ticket.upvotes}${
      ticket.upvotes >= 10 ? ' (MASS CITIZEN PETITION)' : ''
    }`,
    `#JawabDeAI #PublicAccountability #RTI2005 #${ticket.city.replace(/\s+/g, '')}`,
  ].join('\n');

  const handleCopyPost = async () => {
    try {
      await navigator.clipboard.writeText(whatsappSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const el = document.createElement('textarea');
      el.value = whatsappSummary;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      await downloadShareableCardPng(ticket);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-heading"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
            <h2
              id="share-card-heading"
              className="text-sm font-bold tracking-tight truncate"
            >
              Shareable Citizen Accountability Card
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share card modal"
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Share Card Preview */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto civic-scroll">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            {/* Evidence Photo */}
            <div className="relative aspect-[16/10] bg-slate-100">
              <img
                src={ticket.imageUrl}
                alt={ticket.audit.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent p-3.5 text-white">
                <div className="text-[11px] font-mono text-slate-200">
                  {ticket.city}, {ticket.state} · PIN {ticket.pinCode} ·{' '}
                  {ticket.audit.projectWorkId}
                </div>
                <div className="text-base font-bold leading-snug mt-0.5">
                  {ticket.audit.title}
                </div>
              </div>
            </div>

            {/* Bold Warranty Status Bar */}
            <div
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${
                isRepaired
                  ? 'bg-emerald-700 text-white'
                  : 'bg-rose-700 text-white'
              }`}
            >
              {isRepaired ? (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>VERIFIED REPAIRED — CLOSURE AUTHENTICATED</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>ACTIVE WARRANTY — CONTRACTOR MUST REPAIR AT ₹0 COST</span>
                </>
              )}
            </div>

            {/* Accountability Metadata Grid */}
            <div className="p-4 grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <div className="text-slate-500">Contractor Responsible</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {ticket.audit.contractorName}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Sanctioned Funds</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {ticket.audit.sanctionedAmount}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Warranty Expiry</div>
                <div className="font-mono font-semibold text-emerald-700 mt-0.5">
                  {ticket.audit.warrantyExpiryDate}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Safety Hazard</div>
                <div className="font-mono font-bold text-rose-700 mt-0.5">
                  {ticket.audit.safetyScore}/10
                </div>
              </div>
              <div>
                <div className="text-slate-500">Citizen Verification</div>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-mono">{ticket.upvotes}</span>
                  {ticket.upvotes >= 10 && (
                    <span className="text-amber-800 font-bold">· Petition</span>
                  )}
                </div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                Authority: {ticket.audit.departmentName}
              </div>
            </div>
          </div>

          {/* WhatsApp / Social Text Box */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              WhatsApp / X (Twitter) Accountability Post
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto civic-scroll">
              {whatsappSummary}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyPost}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied for WhatsApp / Social</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy Share Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{downloading ? 'Rendering PNG...' : 'Download Card (PNG)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
