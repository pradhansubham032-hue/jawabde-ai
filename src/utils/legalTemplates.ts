import { CivicTicket, SupportedLanguage } from '../types';

export function formatCurrentIndianDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function generateRtiApplication(
  ticket: CivicTicket,
  bplExempt: boolean,
  language: SupportedLanguage
): string {
  const dateStr = formatCurrentIndianDate();
  const feeClause = bplExempt
    ? 'APPLICATION FEE: ₹0 (EXEMPTED) — The applicant belongs to the Below Poverty Line (BPL) category and is exempted from paying the application fee under Section 7(5) of the Right to Information Act, 2005. BPL Ration Card / Antyodaya proof is attached for verification.'
    : 'APPLICATION FEE: ₹10 — Paid via Indian Postal Order (IPO) / Court Fee Stamp / Online RTI Portal Receipt as prescribed under Section 6(1) read with Right to Information Rules, 2012.';

  const priorGrievanceLine = ticket.ignoredTicketId
    ? `Reference Prior Unresolved Grievance / CPGRAMS ID: ${ticket.ignoredTicketId} (Pending / Ignored for ${ticket.daysIgnored} days)`
    : `Site Location Coordinates: ${ticket.lat.toFixed(5)}°N, ${ticket.lng.toFixed(5)}°E (${ticket.audit.wardLabel})`;

  const petitionLine =
    ticket.upvotes >= 10
      ? `Community Verification Status: MASS CITIZEN PETITION — Independently verified on-ground by ${ticket.upvotes} local residents.`
      : `Community Verification Count: Confirmed on-ground by ${ticket.upvotes} local citizen(s).`;

  if (language === 'hi') {
    const hiFee = bplExempt
      ? 'आवेदन शुल्क: ₹0 (पूर्ण छूट) — आवेदक बीपीएल (BPL) श्रेणी के अंतर्गत आता है एवं सूचना का अधिकार अधिनियम, 2005 की धारा 7(5) के तहत शुल्क से मुक्त है।'
      : 'आवेदन शुल्क: ₹10 — भारतीय पोस्टल ऑर्डर (IPO) / कोर्ट फीस स्टाम्प / ऑनलाइन RTI पोर्टल के माध्यम से संलग्न।';

    return `सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत आवेदन
दिनांक: ${dateStr}

सेवा में,
लोक सूचना अधिकारी (PIO)
${ticket.audit.pioDesignation}
${ticket.audit.departmentName}
${ticket.audit.pioOfficeAddress}

विषय: कार्य आदेश संख्या ${ticket.audit.projectWorkId} (${ticket.audit.wardLabel}, ${ticket.city} - ${ticket.pinCode}) के अंतर्गत दोष दायित्व अवधि (Defect Liability Period / वारंटी) में हुई निर्माण विफलता एवं गुणवत्ता जांच संबंधी सूचना।

महोदय/महोदया,
${priorGrievanceLine}
${petitionLine}

उक्त लोक निर्माण कार्य (स्वीकृत राशि: ${ticket.audit.sanctionedAmount}, ठेकेदार: ${ticket.audit.contractorName}, पूर्णता तिथि: ${ticket.audit.completionDate}, वारंटी समाप्ति: ${ticket.audit.warrantyExpiryDate}) में समय से पूर्व गंभीर क्षति पाई गई है (${ticket.audit.hazardCategory}, सुरक्षा जोखिम स्कोर: ${ticket.audit.safetyScore}/10)।

अतः सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत निम्नलिखित प्रमाणित प्रतियां एवं सूचनाएं 30 दिनों के भीतर (तथा जीवन एवं सुरक्षा से जुड़े मामले में धारा 7(1) के तहत 48 घंटे में) उपलब्ध कराएं:

1. कार्य आदेश (${ticket.audit.projectWorkId}), स्वीकृत निविदा अनुबंध एवं Bill of Quantities (BOQ) की प्रमाणित प्रति।
2. निर्माण सामग्री की थर्ड-पार्टी गुणवत्ता प्रयोगशाला रिपोर्ट (Bitumen/Concrete Core Test & Compaction Report) तथा अंतिम बिल भुगतान प्रमाणित करने वाले कनिष्ठ/सहायक अभियंता का नाम व पदनाम।
3. सक्रिय दोष दायित्व अवधि (${ticket.audit.dlpMonths} माह — ${ticket.audit.violationClause}) के अंतर्गत ठेकेदार ${ticket.audit.contractorName} को ₹0 सरकारी व्यय पर मरम्मत हेतु जारी नोटिस एवं की गई कार्रवाई रिपोर्ट (ATR)।
4. यदि ठेकेदार द्वारा तय समय-सीमा (${ticket.audit.statutorySlaDays} दिवस) में मरम्मत नहीं की गई है, तो Performance Security जब्त करने व ब्लैकलिस्टिंग की वर्तमान स्थिति।

${hiFee}

प्रथम अपीलीय प्राधिकारी (धारा 19(1)): ${ticket.audit.appellateAuthority}

भवदीय,
चिंतित नागरिक (JawabDe AI नागरिक जवाबदेही मंच के माध्यम से)
शहर / पिन: ${ticket.city}, ${ticket.state} - ${ticket.pinCode}`;
  }

  const regionalPreface: Record<SupportedLanguage, string> = {
    en: '',
    hi: '',
    or: `[ଓଡ଼ିଆ ସାରାଂଶ: ସୂଚନା ଅଧିକାର ଆଇନ ୨୦୦୫ ଧାରା ୬(୧) ଅନୁଯାୟୀ ${ticket.audit.projectWorkId} କାର୍ଯ୍ୟର ୱାରେଣ୍ଟି ମରାମତି ଓ ଗୁଣବତ୍ତା ରିପୋର୍ଟ ଦାବି]\n\n`,
    bn: `[বাংলা সারসংক্ষেপ: তথ্য অধিকার আইন ২০০৫-এর ধারা ৬(১) অনুযায়ী ${ticket.audit.projectWorkId} কাজের ওয়ারেন্টি মেরামত ও মান পরীক্ষার রিপোর্টের আবেদন]\n\n`,
    ta: `[தமிழ் சுருக்கம்: தகவல் அறியும் உரிமைச் சட்டம் 2005 பிரிவு 6(1) கீழ் ${ticket.audit.projectWorkId} பணியின் உத்தரவாத பழுதுபார்ப்பு மற்றும் தர அறிக்கை கோரிக்கை]\n\n`,
  };

  return `${regionalPreface[language]}APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005
Date: ${dateStr}

To,
The Public Information Officer (PIO),
${ticket.audit.pioDesignation},
${ticket.audit.departmentName},
${ticket.audit.pioOfficeAddress}

Subject: Request for certified Work Order, Quality Lab Reports, and Defect Liability Period (Warranty) enforcement records for ${ticket.audit.projectWorkId} — ${ticket.audit.wardLabel}, ${ticket.city} (${ticket.pinCode}).

Sir / Madam,

${priorGrievanceLine}
${petitionLine}

Factual Background:
${ticket.audit.defectSummaryForLegal}
Observed Hazard Category: ${ticket.audit.hazardCategory} (Public Safety Risk Score: ${ticket.audit.safetyScore}/10).
Recorded Contractor: ${ticket.audit.contractorName} | Sanctioned Public Tax Funds: ${ticket.audit.sanctionedAmount} | Active Warranty Valid Until: ${ticket.audit.warrantyExpiryDate}.

Under Section 6(1) of the Right to Information Act, 2005, kindly provide point-wise certified information within the statutory period of 30 days (and within 48 hours under the proviso to Section 7(1) concerning immediate life and public safety hazards):

1. Certified copy of the Complete Work Order, Tender Agreement, Defect Liability Period (DLP) Clause (${ticket.audit.violationClause}), and Measurement Book (MB) entries for Work ID ${ticket.audit.projectWorkId}.
2. Certified copies of all pre-payment Material Testing & Third-Party Quality Assurance Lab Reports (bitumen extraction/concrete cube strength/compaction density) submitted prior to releasing ${ticket.audit.sanctionedAmount}.
3. Name and designation of the Junior Engineer (JE) and Assistant Engineer (AE) who inspected and certified completion on ${ticket.audit.completionDate}.
4. Certified copy of the Rectification Notice issued to ${ticket.audit.contractorName} mandating repair at ₹0 cost to taxpayers under the active ${ticket.audit.dlpMonths}-month warranty, along with the timeline for Performance Bank Guarantee forfeiture if unrectified within ${ticket.audit.statutorySlaDays} days.

${feeClause}

Notice of First Appeal: Failure to furnish complete certified records within statutory timelines will compel a First Appeal under Section 19(1) before the ${ticket.audit.appellateAuthority}.

Yours faithfully,
Concerned Citizen of ${ticket.city}
PIN Code: ${ticket.pinCode}, ${ticket.state}
Generated via JawabDe AI Civic Accountability Platform`;
}

export function generateWarrantyDemandNotice(
  ticket: CivicTicket,
  language: SupportedLanguage
): string {
  const dateStr = formatCurrentIndianDate();

  if (language === 'hi') {
    return `दोष दायित्व अवधि (DEFECT LIABILITY PERIOD) के अंतर्गत निशुल्क मरम्मत हेतु विधिक मांग नोटिस
दिनांक: ${dateStr} | संदर्भ संख्या: ${ticket.id}

प्रति,
प्रबंध निदेशक / अधिकृत हस्ताक्षरकर्ता,
${ticket.audit.contractorName}

प्रतिलिपि सूचनार्थ एवं आवश्यक कार्यवाही हेतु:
1. ${ticket.audit.pioDesignation}, ${ticket.audit.departmentName}
2. ${ticket.audit.appellateAuthority} (सतर्कता एवं गुणवत्ता नियंत्रण प्रकोष्ठ)

विषय: कार्य आदेश ${ticket.audit.projectWorkId} (${ticket.audit.wardLabel}, ${ticket.city} - ${ticket.pinCode}) में समय-पूर्व क्षति की ₹0 लागत पर अनिवार्य मरम्मत।

महोदय,
नागरिक स्थल निरीक्षण एवं फोटोग्राफिक साक्ष्य के अनुसार आपके द्वारा निष्पादित कार्य (${ticket.audit.sanctionedAmount}, पूर्णता तिथि: ${ticket.audit.completionDate}) में मात्र ${ticket.audit.daysSinceCompletion} दिनों के भीतर गंभीर तकनीकी विफलता (${ticket.audit.hazardCategory}) उत्पन्न हो गई है।

यह कार्य ${ticket.audit.warrantyExpiryDate} तक सक्रिय ${ticket.audit.dlpMonths}-माह की दोष दायित्व अवधि (${ticket.audit.violationClause}) के अंतर्गत है। अतः आपको सूचित किया जाता है कि:
1. आगामी ${ticket.audit.statutorySlaDays} कार्यदिवसों के भीतर मानक विनिर्देशों के अनुरूप पूर्ण मरम्मत ₹0 अतिरिक्त सरकारी व्यय पर सुनिश्चित करें।
2. मरम्मत के उपरांत जियो-टैग्ड "Before vs. After" फोटोग्राफिक साक्ष्य जमा करें।
3. समय-सीमा में अनुपालन न होने पर अनुबंध की शर्तों के अनुसार Performance Security / Retention Money जब्त करने, ठेकेदार को डिबार (Blacklist) करने एवं CPGRAMS/लोकायुक्त में शिकायत दर्ज करने की प्रक्रिया प्रारंभ की जाएगी।

नागरिक निगरानी समिति — ${ticket.audit.wardLabel}, ${ticket.city} (${ticket.upvotes} नागरिकों द्वारा सत्यापित)`;
  }

  return `FORMAL DEFECT LIABILITY PERIOD (WARRANTY) RECTIFICATION DEMAND NOTICE
Date: ${dateStr}
Audit Tracking Reference: ${ticket.id}
Work Order / Contract ID: ${ticket.audit.projectWorkId}

TO:
The Managing Director / Authorized Signatory,
${ticket.audit.contractorName}

COPY FOR ENFORCEMENT & VIGILANCE ACTION TO:
1. ${ticket.audit.pioDesignation}, ${ticket.audit.departmentName}
2. ${ticket.audit.appellateAuthority}

SUBJECT: Mandatory Zero-Cost (₹0) Rectification of Premature Infrastructure Failure under Active ${ticket.audit.dlpMonths}-Month Defect Liability Period — ${ticket.audit.wardLabel}, ${ticket.city} (${ticket.pinCode}).

Dear Sir / Madam,

1. NOTICE OF DEFECT DURING ACTIVE WARRANTY:
You are hereby placed on formal notice that the public infrastructure work executed by your firm under Contract/Work Order ${ticket.audit.projectWorkId} (Sanctioned Public Value: ${ticket.audit.sanctionedAmount}; Recorded Completion Date: ${ticket.audit.completionDate}) has suffered severe premature failure within ${ticket.audit.daysSinceCompletion} days of completion.

2. DOCUMENTED ENGINEERING DEFICIENCIES:
- Defect Classification: ${ticket.audit.hazardCategory} (Public Safety Score: ${ticket.audit.safetyScore}/10)
- Field Audit Observations: ${ticket.audit.engineeringFindings}
- Citizen Verification: Confirmed by ${ticket.upvotes} local resident(s)${ticket.upvotes >= 10 ? ' (QUALIFIES AS MASS CITIZEN PETITION)' : ''}.
- Applicable Contractual Provision: ${ticket.audit.violationClause}
- Active Warranty Expiry Date: ${ticket.audit.warrantyExpiryDate}

3. STATUTORY DEMAND FOR RECTIFICATION AT ₹0 TAXPAYER COST:
Because the defect has manifested squarely within the binding ${ticket.audit.dlpMonths}-month Defect Liability Period, you are contractually obligated to mobilize manpower and standard-grade materials to permanently rectify the entire affected stretch at ₹0 additional cost to the public exchequer within ${ticket.audit.statutorySlaDays} calendar days of this notice.

4. CONSEQUENCES OF NON-COMPLIANCE OR FAKE CLOSURE:
Please note that superficial patching or submission of mismatched closure photographs will be flagged via forensic Before-vs-After verification. Failure to complete genuine rectification within ${ticket.audit.statutorySlaDays} days will trigger:
  (a) Formal petition for forfeiture of your Retention Money & Performance Bank Guarantee;
  (b) Escalation under Section 6(1) RTI Act 2005 for Third-Party Quality Lab audit and Engineer accountability; and
  (c) Recommendation for contractor debarment/blacklisting on State e-Procurement portals and CPGRAMS.

Issued in Public Interest by Citizens of ${ticket.audit.wardLabel}, ${ticket.city} (${ticket.pinCode})`;
}

export async function urlToBase64Parts(
  imageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid image data URL.');
    }
    return { mimeType: match[1], base64: match[2] };
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error('Could not load image asset for AI analysis.');
  }
  const blob = await res.blob();
  const mimeType = blob.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to encode image to base64.'));
        return;
      }
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(blob);
  });
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadShareableCardPng(ticket: CivicTicket): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  // Header band
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('JawabDe AI — Citizen Accountability Audit', 48, 72);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '22px monospace';
  ctx.fillText(
    `${ticket.city.toUpperCase()}, ${ticket.state.toUpperCase()} · PIN ${ticket.pinCode} · ${ticket.audit.projectWorkId}`,
    48,
    112
  );

  // White card body
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(40, 144, width - 80, height - 220);

  // Load and draw evidence photo
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = ticket.imageUrl;
    });
    const imgX = 68;
    const imgY = 172;
    const imgW = width - 136;
    const imgH = 440;
    ctx.save();
    ctx.beginPath();
    ctx.rect(imgX, imgY, imgW, imgH);
    ctx.clip();
    const scale = Math.max(imgW / img.width, imgH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, imgX + (imgW - drawW) / 2, imgY + (imgH - drawH) / 2, drawW, drawH);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(68, 172, width - 136, 440);
  }

  // Warranty status strip
  const isRepaired = ticket.status === 'verified_repaired';
  ctx.fillStyle = isRepaired ? '#059669' : '#B91C1C';
  ctx.fillRect(68, 632, width - 136, 56);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 23px sans-serif';
  ctx.fillText(
    isRepaired
      ? 'VERIFIED REPAIRED — CLOSURE AUTHENTICATED BY AI AUDIT'
      : 'ACTIVE WARRANTY — CONTRACTOR MUST REPAIR AT ₹0 TAXPAYER COST',
    92,
    668
  );

  // Issue Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(ticket.audit.title.slice(0, 52), 68, 742);

  // Key Accountability Grid
  const rows: Array<[string, string]> = [
    ['Contractor Responsible:', ticket.audit.contractorName],
    ['Sanctioned Public Funds:', `${ticket.audit.sanctionedAmount} (Completed: ${ticket.audit.completionDate})`],
    ['Defect Liability Expiry:', `${ticket.audit.warrantyExpiryDate} (${ticket.audit.dlpMonths} Months DLP)`],
    ['Responsible Authority:', ticket.audit.departmentName],
    ['Citizen Verifications:', `${ticket.upvotes} Confirmed${ticket.upvotes >= 10 ? ' — MASS CITIZEN PETITION' : ''}`],
    ['Safety Hazard Score:', `${ticket.audit.safetyScore}/10 · ${ticket.audit.hazardCategory}`],
  ];

  let y = 800;
  for (const [label, value] of rows) {
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(label, 68, y);
    ctx.fillStyle = '#0F172A';
    ctx.font = '22px sans-serif';
    ctx.fillText(value.slice(0, 56), 360, y);
    y += 48;
  }

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px monospace';
  ctx.fillText(
    `RTI Act 2005 Sec 6(1) Ready · Generated via JawabDe AI · ${formatCurrentIndianDate()}`,
    48,
    height - 32
  );

  const link = document.createElement('a');
  link.download = `JawabDe-Accountability-${ticket.id}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
