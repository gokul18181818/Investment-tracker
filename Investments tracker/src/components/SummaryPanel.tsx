import React, { useMemo } from 'react';
import { Contribution } from '../utils/parsePaystub';
import { $ } from '../utils/format';
import './SummaryPanel.css';

interface Props {
  entries: Contribution[];
}

export default function SummaryPanel({ entries }: Props) {
  const grouped = useMemo(() => {
    const data = {
      k401: {
        title: '💰 401(k)s',
        items: {
          'Roth 401k': 0,
          '401k Match': 0,
          'After-tax 401k': 0,
        } as Record<string, number>,
        total: 0,
      },
      hsa: {
        title: '🏥 HSA',
        items: {
          'HSA Employee': 0,
          'HSA Employer': 0,
        } as Record<string, number>,
        total: 0,
      },
      crypto: {
        title: '🪙 Crypto',
        items: {
          Crypto: 0,
        } as Record<string, number>,
        total: 0,
      },
    };

    entries.forEach(e => {
      if (e.type in data.k401.items) data.k401.items[e.type] += e.employee + e.employer;
      else if (e.type in data.hsa.items) data.hsa.items[e.type] += e.employee + e.employer;
      else data.crypto.items.Crypto += e.employee + e.employer;
    });

    // compute totals
    (Object.values(data) as any[]).forEach(g => {
      g.total = Object.values(g.items).reduce((acc: number, val) => acc + (val as number), 0);
    });

    return data;
  }, [entries]);

  const overallTotal = useMemo(() => {
    return Object.values(grouped).reduce((sum: number, g: any) => sum + (g as any).total, 0);
  }, [grouped]);

  return (
    <div className="summary">
      {Object.values(grouped).map(group => (
        <div key={group.title} className="summary-group">
          <h3>
            {group.title}{' '}
            <span className="group-total">{$(group.total)}</span>
          </h3>
          <ul>
            {Object.entries(group.items).map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <span>{$((v as number))}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="summary-overall">
        Overall Invested: <strong>{$((overallTotal))}</strong>
      </div>
    </div>
  );
} 