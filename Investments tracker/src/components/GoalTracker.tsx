import React, { useEffect, useMemo, useState } from 'react';
import { Contribution } from '../utils/parsePaystub';
import './GoalTracker.css';
import { $ } from '../utils/format';

const GOAL_KEY = 'investments-tracker-goal';

interface Props {
  entries: Contribution[];
}

export default function GoalTracker({ entries }: Props) {
  const [goal, setGoal] = useState<number>(() => {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? Number(raw) : 0;
  });

  useEffect(() => {
    localStorage.setItem(GOAL_KEY, String(goal));
  }, [goal]);

  const totals = useMemo(() => {
    const sums = {
      roth: 0,
      match: 0,
      afterTax: 0,
      hsa: 0,
      crypto: 0,
    };
    entries.forEach(e => {
      switch (e.type) {
        case 'Roth 401k':
          sums.roth += e.employee + e.employer;
          break;
        case '401k Match':
          sums.match += e.employee + e.employer;
          break;
        case 'After-tax 401k':
          sums.afterTax += e.employee + e.employer;
          break;
        case 'HSA Employee':
        case 'HSA Employer':
          sums.hsa += e.employee + e.employer;
          break;
        case 'Crypto':
          sums.crypto += e.employee + e.employer;
          break;
      }
    });
    return sums;
  }, [entries]);

  const progress = useMemo(() => {
    const investedTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    const pct = goal ? Math.min((investedTotal / goal) * 100, 100) : 0;
    return { investedTotal, pct };
  }, [totals, goal]);

  const handleSetGoal = () => {
    const input = prompt('Enter your yearly investment goal (e.g., 30000):', String(goal || ''));
    if (!input) return;
    const val = Number(input);
    if (isNaN(val) || val <= 0) return alert('Invalid goal amount');
    setGoal(val);
  };

  return (
    <div className="goal-card">
      <h2>🎯 Yearly Goal</h2>
      <p>
        Goal:{' '}
        <strong>{goal ? $(goal) : 'Not set'}</strong>{' '}
        <button className="small-btn" onClick={handleSetGoal}>
          {goal ? 'Edit' : 'Set'} Goal
        </button>
      </p>
      <div className="progress-bar-wrapper">
        <div className="progress-bar" style={{ width: `${progress.pct}%` }} />
      </div>
      <p>
        Invested:{' '}
        <strong>{$(progress.investedTotal)}</strong>{' '}
        ({progress.pct.toFixed(1)}%)
      </p>
    </div>
  );
} 