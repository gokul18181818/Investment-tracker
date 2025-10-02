import React, { useMemo } from 'react';
import { PaystubRecord, Contribution } from '../types';
import { $ } from '../utils/format';
import './PaycheckTable.css';

interface Props {
  paystubs: PaystubRecord[];
  entries: Contribution[];
}

export default function PaycheckSummaryPanel({ paystubs, entries }: Props) {
  const { gross, taxes, investments } = useMemo(() => {
    let g = 0,
      t = 0;

    paystubs.forEach(p => {
      g += p.gross.cur;
      t += p.taxesCur || 0;
    });

    // Sum only payroll-deducted contributions (employee portions) & ESPP
    const stubDates = new Set(paystubs.map(p => p.payDate));
    let inv = 0;
    entries.forEach(e => {
      if (stubDates.has(e.payDate)) {
        inv += e.employee; // employer part is not deducted
      }
    });
    // ESPP is treated as part of take-home, not an investment deduction.

    return { gross: g, taxes: t, investments: inv };
  }, [paystubs, entries]);

  const afterInvest = gross - taxes - investments;

  // Total ESPP withheld
  const esppTotal = useMemo(() => paystubs.reduce((sum, p) => sum + Math.abs(p.esppCur || 0), 0), [paystubs]);

  const taxRate = gross ? (taxes / gross) * 100 : 0;
  const investRate = gross ? (investments / gross) * 100 : 0;
  const netRate = gross ? (afterInvest / gross) * 100 : 0;

  return (
    <div className="summary-card" style={{ marginTop: 8 }}>
      <h3>💵 Paycheck Summary</h3>
      <div><strong>Gross Pay:</strong> {$(gross)}</div>
      <div><strong>Total Taxes:</strong> {$(taxes)} ({taxRate.toFixed(1)}%)</div>
      <div><strong>Total Investments:</strong> {$(investments)} ({investRate.toFixed(1)}%)</div>
      <div>
        <strong>Left After Investments:</strong> {$(afterInvest)}{' '}
        <span style={{ color: '#6b7280', fontSize: '0.85em' }}>
          (ESPP withheld {$(esppTotal)})
        </span>
      </div>

      {/* Segmented bar */}
      <div style={{ marginTop: 10, height: 14, background: '#e5e7eb', borderRadius: 6, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: `${taxRate}%`, background: '#f87171' }} />
        <div style={{ width: `${investRate}%`, background: '#fbbf24' }} />
        <div style={{ width: `${netRate}%`, background: '#34d399' }} />
      </div>
      <div style={{ display: 'flex', fontSize: 12, marginTop: 4, justifyContent: 'space-between' }}>
        <span style={{ color: '#f87171' }}>Taxes</span>
        <span style={{ color: '#fbbf24' }}>Investments</span>
        <span style={{ color: '#34d399' }}>Take-home</span>
      </div>
    </div>
  );
} 