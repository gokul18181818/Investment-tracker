export interface TaxAmount {
  cur: number; // current period
  ytd: number; // year-to-date
}

export interface PaystubRecord {
  payDate: string;
  periodBegin?: string;
  periodEnd?: string;

  gross: TaxAmount; // gross pay current + ytd
  net: TaxAmount;   // net pay current + ytd

  taxFederal?: TaxAmount;
  taxState?: TaxAmount;
  taxCity?: TaxAmount;
  taxSocialSecurity?: TaxAmount;
  taxMedicare?: TaxAmount;
  taxDisability?: TaxAmount;
  taxFli?: TaxAmount;

  rawText: string; // full extracted text for future parsing
  fileId?: string;
  checkNumber?: string;

  afterTax401kCur?: number;
  esppCur?: number;

  taxesCur?: number;
  taxesYtd?: number;
}

export type ContributionType = 'Roth 401k' | '401k Match' | 'After-tax 401k' | 'HSA Employee' | 'HSA Employer' | 'Crypto';

export interface Contribution {
  payDate: string;
  type: ContributionType;
  employee: number;
  employer: number;
  fileId?: string | null;
  afterTax401kCur?: number;
  esppCur?: number;
} 