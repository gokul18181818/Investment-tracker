import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// @ts-ignore - no types for worker file
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import Tesseract from 'tesseract.js';
import { Contribution, ContributionType, PaystubRecord, TaxAmount } from '../types';

GlobalWorkerOptions.workerSrc = workerSrc;

export type { Contribution, ContributionType, PaystubRecord }; // re-export for convenience

export interface ParseResult {
  contributions: Contribution[];
  paystub: PaystubRecord;
}

/**
 * Parse a File and return contributions + detailed paystub record.
 */
export async function parsePaystub(file: File): Promise<ParseResult> {
  let text = '';
  if (file.type === 'application/pdf') {
    text = await extractPdfText(file);
  } else {
    text = await extractImageText(file);
  }

  const contributions = extractContributions(text);
  const paystub = extractPaystubDetails(text);
  return { contributions, paystub };
}

async function extractPdfText(file: File): Promise<string> {
  const typedArray = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data: typedArray }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((i: any) => i.str).join(' ') + '\n';
  }
  return text;
}

async function extractImageText(file: File): Promise<string> {
  // @ts-ignore - tesseract types mismatch with ArrayBuffer
  const { data } = await Tesseract.recognize(await file.arrayBuffer(), 'eng');
  return data.text;
}

function extractContributions(text: string): Contribution[] {
  const contributions: Contribution[] = [];

  let payDate = new Date().toISOString().slice(0, 10);
  const checkMatch = text.match(/Check Date\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  if (checkMatch) {
    payDate = new Date(checkMatch[1]).toISOString().slice(0, 10);
  } else {
    const dateMatch = text.match(/Period End Date\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
    if (dateMatch) payDate = new Date(dateMatch[1]).toISOString().slice(0, 10);
  }

  const patterns: { regex: RegExp; type: ContributionType; isEmployee: boolean }[] = [
    { regex: /ROTH \(AFTER-TAX\)\s+[-]?([\d,]+\.\d{2})/i, type: 'Roth 401k', isEmployee: true },
    { regex: /401K EMPLOYER MATCH\s+[-]?([\d,]+\.\d{2})/i, type: '401k Match', isEmployee: false },
    { regex: /AFTER-TAX 401K\s+[-]?([\d,]+\.\d{2})/i, type: 'After-tax 401k', isEmployee: true },
    { regex: /401K \(AFTER-TAX\)\s+[-]?([\d,]+\.\d{2})/i, type: 'After-tax 401k', isEmployee: true },
    { regex: /HSA EMPLOYEE CONT\s+[-]?([\d,]+\.\d{2})/i, type: 'HSA Employee', isEmployee: true },
    {
      // Capture FIRST numeric value after the label (current-period amount).
      // Use a lazy match so we don't skip over the 0.00 current column and grab the YTD value.
      regex: /HSA EMPLOYER[^\d\n-]*?(-?[\d,]+\.\d{2})/i,
      type: 'HSA Employer',
      isEmployee: false,
    },
  ];

  patterns.forEach(p => {
    const m = text.match(p.regex);
    if (m) {
      const amt = Math.abs(parseFloat(m[1].replace(/,/g, '')));
      contributions.push({
        payDate,
        type: p.type,
        employee: p.isEmployee ? amt : 0,
        employer: p.isEmployee ? 0 : amt,
      });
    }
  });

  return contributions;
}

function extractPaystubDetails(text: string): PaystubRecord {
  const getMoney = (regex: RegExp): number => {
    const m = text.match(regex);
    if (!m) return 0;
    return parseFloat(m[1].replace(/,/g, ''));
  };

  const payDateMatch = text.match(/Check Date\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const checkNumMatchRaw = text.match(/Check Number[\s:]*([A-Za-z0-9#-]+)/i);
  let checkNumber: string | undefined = undefined;
  if (checkNumMatchRaw) {
    const candidate = checkNumMatchRaw[1];
    // Accept only if it contains at least one digit
    if (/\d/.test(candidate)) {
      checkNumber = candidate.replace(/^#+/, ''); // strip leading #
    }
  }
  const payDate = payDateMatch ? new Date(payDateMatch[1]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const grossCur = getMoney(/GROSS PAY[^\d-]*?([\d,]+\.\d{2})/i);
  const grossYtd = getMoney(/GROSS PAY[^\n]+?([\d,]+\.\d{2})\s*$/im);

  const netCur = getMoney(/NET PAY[^\d-]*?([\d,]+\.\d{2})/i);
  const netYtd = getMoney(/NET PAY[^\n]+?([\d,]+\.\d{2})\s*$/im);

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const buildTax = (label: string): TaxAmount | undefined => {
    /**
     * Try to locate two monetary values (current & YTD) that appear after the label.
     * There can be any amount of whitespace/new-lines and an optional negative sign or
     * parentheses surrounding the number.
     */
    const re = new RegExp(
      `${escape(label)}[\s\S]{0,60}?(-?[\d,]+\\.\\d{2}|\\([\d,]+\\.\\d{2}\\))[\s\S]{0,20}?(-?[\d,]+\\.\\d{2}|\\([\d,]+\\.\\d{2}\\))`,
      'i'
    );
    const m = text.match(re);
    if (!m) return undefined;

    const parseVal = (s: string): number => {
      // drop parentheses if present and treat as negative
      let valStr = s.replace(/[()]/g, '');
      let num = parseFloat(valStr.replace(/,/g, ''));
      if (s.includes('(') && s.includes(')')) num = -num;
      return Math.abs(num);
    };

    const cur = parseVal(m[1]);
    const ytd = parseVal(m[2]);
    return { cur, ytd };
  };

  const record: PaystubRecord = {
    payDate,
    checkNumber,
    gross: { cur: grossCur, ytd: grossYtd },
    net: { cur: netCur, ytd: netYtd },
    taxFederal: buildTax('FEDERAL INCOME TAX'),
    taxState: buildTax('WITHHOLDING - NEW YORK'),
    taxCity: buildTax('WITHHOLDING - NEW YORK CITY'),
    taxSocialSecurity: buildTax('SOCIAL SECURITY TAX'),
    taxMedicare: buildTax('MEDICARE TAX'),
    taxDisability: buildTax('DISABILITY TAX') || buildTax('DISABILITY TAX - NEW YORK'),
    taxFli: buildTax('FAMILY LEAVE'),
    rawText: text,
    afterTax401kCur: getMoney(/401K \(AFTER-TAX\)\s+(-?[\d,]+\.\d{2})/i),
    esppCur: getMoney(/ESPP\s+(-?[\d,]+\.\d{2})/i),

    // aggregate taxes
    taxesCur: 0,
    taxesYtd: 0,
  };

  // compute taxesCur/Ytd by summing available
  const allTaxFields: (keyof PaystubRecord)[] = [
    'taxFederal',
    'taxState',
    'taxCity',
    'taxSocialSecurity',
    'taxMedicare',
    'taxDisability',
    'taxFli',
  ];
  let curSum = 0;
  let ytdSum = 0;
  allTaxFields.forEach(k => {
    const t = (record as any)[k] as TaxAmount | undefined;
    if (t) {
      curSum += Math.abs(t.cur);
      ytdSum += Math.abs(t.ytd);
    }
  });
  record.taxesCur = curSum;
  record.taxesYtd = ytdSum;

  // Fallback: if we failed to capture individual tax lines, attempt to use the consolidated "TAXES WITHHELD" line.
  if (record.taxesCur === 0) {
    const tw = text.match(/TAXES WITHHELD[\s\S]{0,40}?(-?[\d,]+\.\d{2})[\s\S]{0,20}?(-?[\d,]+\.\d{2})/i);
    if (tw) {
      const cur = Math.abs(parseFloat(tw[1].replace(/,/g, '')));
      const ytd = Math.abs(parseFloat(tw[2].replace(/,/g, '')));
      record.taxesCur = cur;
      record.taxesYtd = ytd;
    }
  }

  return record;
} 