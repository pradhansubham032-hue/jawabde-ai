import React, { useState } from 'react';
import { X, Database, Check, Copy, RotateCcw, Send, Loader2 } from 'lucide-react';

interface WebhookModalProps {
  open: boolean;
  webhookUrl: string;
  ticketCount: number;
  lastSyncMessage: string | null;
  onSaveWebhook: (url: string) => void;
  onResetDemoData: () => void;
  onClose: () => void;
}

const SAMPLE_APPS_SCRIPT = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    data.id,
    data.city,
    data.state,
    data.pinCode,
    data.status,
    data.contractorName,
    data.projectWorkId,
    data.sanctionedAmount,
    data.safetyScore,
    data.upvotes
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const WebhookModal: React.FC<WebhookModalProps> = ({
  open,
  webhookUrl,
  ticketCount,
  lastSyncMessage,
  onSaveWebhook,
  onResetDemoData,
  onClose,
}) => {
  const [draftUrl, setDraftUrl] = useState(webhookUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWebhook(draftUrl.trim());
    setTestResult(
      draftUrl.trim()
        ? 'Webhook URL saved to localStorage. New audits will sync automatically.'
        : 'Webhook cleared. Local browser storage remains active.'
    );
  };

  const handleTestWebhook = async () => {
    const trimmed = draftUrl.trim();
    if (!trimmed) {
      setTestResult('Enter a valid https://script.google.com/... Web App URL first.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhook-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: trimmed,
          payload: {
            event: 'JAWABDE_TEST_PING',
            id: 'TEST-PING',
            city: 'Bhubaneswar',
            state: 'Odisha',
            pinCode: '751001',
            status: 'under_audit',
            contractorName: 'Demo Test Verification',
            projectWorkId: 'TEST/2026/001',
            sanctionedAmount: '₹0',
            safetyScore: 5,
            upvotes: 1,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Webhook ping failed.');
      }
      setTestResult(`Webhook responded with HTTP ${data.status}. Sync verified.`);
    } catch (err) {
      setTestResult(
        err instanceof Error ? err.message : 'Unable to reach webhook URL.'
      );
    } finally {
      setTesting(false);
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_APPS_SCRIPT);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="webhook-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="bg-[#0F172A] text-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h2 id="webhook-modal-title" className="text-sm font-bold">
              Zero-Cost Persistence & Google Apps Script Sync
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sync settings"
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto civic-scroll">
          {/* LocalStorage Status */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Browser Local Persistence Active
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                <span className="font-mono font-semibold">{ticketCount}</span> audited
                tickets, upvotes, RTI escalations, and closure verifications stored locally.
              </div>
              {lastSyncMessage && (
                <div className="text-[11px] text-emerald-700 mt-1">
                  {lastSyncMessage}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onResetDemoData();
                setTestResult('Demo dataset restored to initial Pan-India records.');
              }}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>
          </div>

          {/* Google Apps Script Webhook Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label
                htmlFor="apps-script-url"
                className="block text-xs font-bold text-slate-900 mb-1"
              >
                Optional Google Apps Script Web App URL
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Paste a deployed Google Apps Script URL (`https://script.google.com/macros/s/.../exec`)
                to mirror every new audit directly into a Google Sheet.
              </p>
              <input
                id="apps-script-url"
                type="url"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Save Webhook URL
              </button>
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testing}
                className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Test Ping</span>
              </button>
            </div>

            {testResult && (
              <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                {testResult}
              </div>
            )}
          </form>

          {/* Ready-to-paste Apps Script Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Google Apps Script Receiver Snippet (`Code.gs`)
              </span>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto leading-relaxed">
              {SAMPLE_APPS_SCRIPT}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
