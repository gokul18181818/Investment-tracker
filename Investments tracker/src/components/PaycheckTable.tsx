import React, { useMemo } from 'react';
import { PaystubRecord } from '../types';
import { $ } from '../utils/format';
import './PaycheckTable.css';
import { Contribution } from '../utils/parsePaystub';

interface Props {
  paystubs: PaystubRecord[];
  files: { id: string; url: string }[];
  entries: Contribution[];
}

export default function PaycheckTable({ paystubs, files, entries }: Props) {
  const fileMap = useMemo(() => {
    const m: Record<string, string> = {};
    files.forEach(f => (m[f.id] = f.url));
    return m;
  }, [files]);

  const contribBreakdown = useMemo(() => {
    const map: Record<string, Partial<Record<string, number>>> = {};
    entries.forEach(e => {
      const amt = e.employee + e.employer;
      if (!map[e.payDate]) map[e.payDate] = {};
      map[e.payDate][e.type] = (map[e.payDate][e.type] || 0) + amt;
    });
    return map;
  }, [entries]);

  const rows = useMemo(() => {
    return paystubs
      .filter(p => p.fileId && fileMap[p.fileId])
      .sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime())
      .map(p => {
        const taxes = p.taxesCur ?? 0;
        const contrib = contribBreakdown[p.payDate] || {};
        // Sum employee-side contributions only (types that deduct from paycheck)
        const employeeTypes = ['Roth 401k','After-tax 401k','HSA Employee'];
        let investCore = 0;
        employeeTypes.forEach(t=>{ investCore += (contrib as any)[t] || 0; });
        const esppVal = Math.abs(p.esppCur || 0);
        const investTotal = investCore; // Excludes ESPP which is treated as take-home cash
        const net = p.net.cur;
        const postTax = p.gross.cur - taxes;
        const computedTake = Math.max(postTax - investTotal, 0);
        const diff = p.gross.cur - taxes - investTotal - esppVal - net;
        const taxPct = p.gross.cur ? (taxes / p.gross.cur) * 100 : 0;

        return { ...p, taxes, contrib, espp: esppVal, investTotal, diff, taxPct };
      });
  }, [paystubs, fileMap, contribBreakdown]);

  return (
    <div className="paycheck-wrapper">
      <div className="legend">
        <span className="num-red">Taxes</span>
        <span className="num-yellow">Investments</span>
        <span className="num-green">Take-home</span>
      </div>
      <table className="paycheck-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Chk #</th>
            <th className="group-left">Gross</th>
            <th>Taxes</th>
            <th className="group-right">Post-Tax</th>
            <th className="group-left">Invest</th>
            <th>Roth</th>
            <th>Match</th>
            <th>Aft 401k</th>
            <th>HSA Emp</th>
            <th className="group-right">HSA Er</th>
            <th>ESPP</th>
            <th className="group-right">Take-home</th>
            <th title="Gross - (Taxes + Investments + Net)">Δ</th>
            <th>Tax %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.payDate}>
              <td style={{ textAlign: 'left' }}>
                <a href={fileMap[r.fileId!]} target="_blank" rel="noopener noreferrer">
                  {new Date(r.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </a>
              </td>
              <td>{r.checkNumber || rows.length - idx}</td>
              <td className="group-left num-grey">{$ (r.gross.cur)}</td>
              <td className="num-red">{$ (r.taxes)}</td>
              <td className="group-right num-grey">{$ (r.gross.cur - r.taxes)}</td>
              <td className={r.investTotal ? 'num-yellow' : 'num-grey'}>{$ (r.investTotal)}</td>
              <td className={(r.contrib['Roth 401k'] || 0) ? 'num-yellow' : 'num-grey'}>{$ (r.contrib['Roth 401k'] || 0)}</td>
              <td className={(r.contrib['401k Match'] || 0) ? 'num-yellow' : 'num-grey'}>{$ (r.contrib['401k Match'] || 0)}</td>
              <td className={(r.contrib['After-tax 401k'] || 0) ? 'num-yellow' : 'num-grey'}>{$ (r.contrib['After-tax 401k'] || 0)}</td>
              <td className={(r.contrib['HSA Employee'] || 0) ? 'num-yellow' : 'num-grey'}>{$ (r.contrib['HSA Employee'] || 0)}</td>
              <td className={`group-right ${(r.contrib['HSA Employer'] || 0) ? 'num-yellow' : 'num-grey'}`}>{$ (r.contrib['HSA Employer'] || 0)}</td>
              <td className="group-left ${r.espp ? 'num-green' : 'num-grey'}">{$ (r.espp)}</td>
              <td className={`group-right ${r.net.cur > 0 ? 'num-green' : 'num-grey'}`}>{$ (r.net.cur)}</td>
              <td className={Math.abs(r.diff) < 0.01 ? 'num-green' : 'num-red'}>{$ (r.diff)}</td>
              <td>{r.taxPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 