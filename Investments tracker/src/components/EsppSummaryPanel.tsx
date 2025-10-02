import React, { useMemo } from 'react';
import { PaystubRecord } from '../types';
import { $ } from '../utils/format';

interface Props {
  paystubs: PaystubRecord[];
}

export default function EsppSummaryPanel({ paystubs }: Props) {
  const quarters = useMemo(() => {
    const map: Record<string, number> = {
      'Q1 (Jan-Mar)': 0,
      'Q2 (Apr-Jun)': 0,
      'Q3 (Jul-Sep)': 0,
      'Q4 (Oct-Dec)': 0,
    };

    paystubs.forEach(p => {
      if (!p.esppCur) return;
      const amt = Math.abs(p.esppCur);
      const month = new Date(p.payDate).getMonth(); // 0-11
      if (month <= 2) map['Q1 (Jan-Mar)'] += amt;
      else if (month <= 5) map['Q2 (Apr-Jun)'] += amt;
      else if (month <= 8) map['Q3 (Jul-Sep)'] += amt;
      else map['Q4 (Oct-Dec)'] += amt;
    });

    return map;
  }, [paystubs]);

  return (
    <div className="summary-card" style={{ marginTop: 8 }}>
      <h3>📈 ESPP Contributions by Offering Period</h3>
      <ul>
        {Object.entries(quarters).map(([label, val]) => (
          <li key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <span>{$ (val)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 