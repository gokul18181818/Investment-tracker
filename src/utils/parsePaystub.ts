import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import Tesseract from 'tesseract.js';

GlobalWorkerOptions.workerSrc = workerSrc;

export type ContributionType =
  | 'Roth 401k'
  | '401k Match'
  | 'After-tax 401k'
  | 'HSA Employee'
  | 'HSA Employer'
  | 'Crypto';

export interface Contribution {
  payDate: string; // ISO YYYY-MM-DD
  type: ContributionType;
  employee: number;
  employer: number;
  fileId?: string;
}

export async function parsePaystub(file: File): Promise<Contribution[]> {
  let text = '';
  if (file.type === 'application/pdf') {
    text = await extractPdfText(file);
  } else {
    text = await extractImageText(file);
  }
  return extractContributions(text);
}

async function extractPdfText(file: File): Promise<string> {
  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
  let combined = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    combined += tc.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return combined;
}

async function extractImageText(file: File): Promise<string> {
  // @ts-ignore mismatch types
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
    const periodMatch = text.match(/Period End Date\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
    if (periodMatch) payDate = new Date(periodMatch[1]).toISOString().slice(0, 10);
  }

  const patterns: { regex: RegExp; type: ContributionType; isEmp: boolean }[] = [
    { regex: /ROTH \(AFTER-TAX\)\s+-?([\d,]+\.\d{2})/i, type: 'Roth 401k', isEmp: true },
    { regex: /401K EMPLOYER MATCH\s+-?([\d,]+\.\d{2})/i, type: '401k Match', isEmp: false },
    { regex: /AFTER-TAX 401K\s+-?([\d,]+\.\d{2})/i, type: 'After-tax 401k', isEmp: true },
    { regex: /HSA EMPLOYEE CONT\s+-?([\d,]+\.\d{2})/i, type: 'HSA Employee', isEmp: true },
    { regex: /HSA EMPLOYER[^\n]*\s+-?([\d,]+\.\d{2})/i, type: 'HSA Employer', isEmp: false },
  ];

  patterns.forEach(p => {
    const m = text.match(p.regex);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      contributions.push({
        payDate,
        type: p.type,
        employee: p.isEmp ? val : 0,
        employer: p.isEmp ? 0 : val,
      });
    }
  });

  // Ensure date shows even if no contribution patterns matched
  if (contributions.length === 0) {
    contributions.push({ payDate, type: 'Roth 401k', employee: 0, employer: 0 });
  }

  return contributions;
} 