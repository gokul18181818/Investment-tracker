import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FileDrop from './components/FileDrop';
import SummaryPanel from './components/SummaryPanel';
import GoalTracker from './components/GoalTracker';
import { Contribution, PaystubRecord, parsePaystub, ParseResult } from './utils/parsePaystub';
import { v4 as uuidv4 } from 'uuid';
import PaystubLibrary from './components/PaystubLibrary';
import './App.css';
import { loadData, saveData, uploadFile } from './storage';
import { $ } from './utils/format';
import Chatbot from './components/Chatbot';
import PaycheckTable from './components/PaycheckTable';
import PaycheckSummaryPanel from './components/PaycheckSummaryPanel';
import EsppSummaryPanel from './components/EsppSummaryPanel';
import WelcomePage from './components/WelcomePage';
import Dashboard from './components/Dashboard';

// Key for localStorage
const STORAGE_KEY = 'investments-tracker-data';
const FILES_KEY = 'investments-tracker-files';

export interface StoredFile {
  id: string;
  name: string;
  url: string; // URL from Firebase Storage
}

export default function App() {
  const [entries, setEntries] = useState<Contribution[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [paystubs, setPaystubs] = useState<PaystubRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [tab, setTab] = useState<'dashboard' | 'investments' | 'paychecks'>('dashboard');
  const [showWelcome, setShowWelcome] = useState(true);

  // Load from Firebase on mount
  useEffect(() => {
    (async () => {
      console.log('[App] beginning initial load');
      try {
        const { entries, files, paystubs } = await loadData();
        console.log('[App] loadData returned', { entriesLen: entries.length, filesLen: files.length, paystubsLen: paystubs.length });
        setEntries(entries);
        setFiles(files);
        setPaystubs(paystubs || []);
        setHasLoaded(true);
      } catch (err) {
        console.error('Failed to load stored data', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    console.log('[App] save effect fired', { hasLoaded, isParsing, entriesLen: entries.length });
    if (hasLoaded && !isParsing) {
      saveData(entries, files, paystubs).catch(console.error);
    }
  }, [entries, files, paystubs, hasLoaded, isParsing]);

  // Handle new files dropped
  const handleFiles = useCallback(async (dropped: File[]) => {
    setIsParsing(true);
    console.log('[App] handleFiles start', dropped.map(f=>f.name));
    for (const file of dropped) {
      try {
        const id = uuidv4();
        const url = await uploadFile(file, id);

        const stored: StoredFile = {
          id,
          name: file.name,
          url,
        };
        setFiles(prev => [...prev, stored]);

        const { contributions, paystub } = await parsePaystub(file);
        const contribsWithFile = contributions.map(c => ({ ...c, fileId: stored.id }));
        setEntries(prev => [...prev, ...contribsWithFile]);
        setPaystubs(prev => {
          const filtered = prev.filter(p => p.payDate !== paystub.payDate);
          return [...filtered, { ...paystub, fileId: stored.id } as any];
        });
      } catch (err) {
        console.error('Failed to parse file', err);
        alert(`Failed to parse ${file.name}. Check console for details.`);
      }
    }
    setIsParsing(false);
    console.log('[App] handleFiles done');
  }, []);

  // Manual crypto add
  const addCrypto = () => {
    const amountStr = prompt('Enter crypto investment amount (e.g., 2000):');
    const amount = Number(amountStr);
    if (!amount || isNaN(amount)) return;
    const date = prompt('Enter date (YYYY-MM-DD) or leave blank for today:') || new Date().toISOString().slice(0, 10);
    const contribution: Contribution = {
      payDate: date,
      type: 'Crypto',
      employee: amount,
      employer: 0,
      fileId: null,
    };
    setEntries(prev => [...prev, contribution]);
  };

  // Edit cell handler
  const editCell = useCallback(
    (date: string, type: string, current: number) => {
      const input = prompt(`Edit amount for ${type} on ${date}:`, String(current));
      if (!input) return;
      const val = Number(input);
      if (isNaN(val)) return;
      setEntries(prev => {
        const idx = prev.findIndex(e => e.payDate === date && e.type === type);
        if (idx === -1) return prev;
        const updated = [...prev];
        const entry = { ...updated[idx] };
        if (entry.employee > 0 && entry.employer === 0) {
          entry.employee = val;
        } else if (entry.employer > 0 && entry.employee === 0) {
          entry.employer = val;
        } else {
          // both zero (shouldn't) or both >0, set employee
          entry.employee = val;
        }
        updated[idx] = entry;
        return updated;
      });
    },
    []
  );

  // Delete entire row (all contributions for a given date)
  const deleteRow = (date: string) => {
    if (!confirm(`Delete all contributions for ${date}?`)) return;
    setEntries(prev => prev.filter(e => e.payDate !== date));
    // Remove paystubs of that date as well
    setPaystubs(prev => prev.filter(p => p.payDate !== date));
    // Clean up files that are now unreferenced
    setFiles(prev => {
      const referenced = new Set(
        entries.filter(e => e.payDate !== date && e.fileId).map(e => e.fileId!)
      );
      return prev.filter(f => referenced.has(f.id));
    });
  };

  // Aggregate by pay date for table display
  const rows = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const fileLink: Record<string, string | undefined> = {};
    const checkNo: Record<string, string | undefined> = {};
    const fileIds = new Set(files.map(f => f.id));
    entries.forEach(e => {
      if (!map[e.payDate]) {
        map[e.payDate] = {
          'Roth 401k': 0,
          '401k Match': 0,
          'After-tax 401k': 0,
          'HSA Employee': 0,
          'HSA Employer': 0,
          'Crypto': 0,
        };
      }
      map[e.payDate][e.type] += e.employee + e.employer;
      if (!fileLink[e.payDate] && e.fileId) fileLink[e.payDate] = e.fileId;
    });

    // Add zero rows only when we have an uploaded PDF (fileId)
    paystubs.forEach(p => {
      if (p.fileId && fileIds.has(p.fileId) && !map[p.payDate]) {
        map[p.payDate] = {
          'Roth 401k': 0,
          '401k Match': 0,
          'After-tax 401k': 0,
          'HSA Employee': 0,
          'HSA Employer': 0,
          'Crypto': 0,
        };
        fileLink[p.payDate] = p.fileId;
        if (p.checkNumber) checkNo[p.payDate] = p.checkNumber;
      }
    });

    return Object.entries(map)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, values]) => ({ date, values, fileId: fileLink[date], chk: checkNo[date] }));
  }, [entries, paystubs, files]);

  const fileUrlById = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      const f = files.find(f => f.id === id);
      if (!f) return undefined;
      return f.url;
    },
    [files]
  );

  if (showWelcome) {
    return <WelcomePage onGetStarted={() => setShowWelcome(false)} />;
  }

  return (
    <div className="container">
      <h1>💸 Gokul's Investment Tracker</h1>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'investments' ? 'active' : ''} onClick={() => setTab('investments')}>Investments</button>
        <button className={tab === 'paychecks' ? 'active' : ''} onClick={() => setTab('paychecks')}>Paychecks</button>
      </div>

      {tab === 'dashboard' && (
        <Dashboard entries={entries} paystubs={paystubs} />
      )}

      {tab === 'investments' && (
        <>
        <FileDrop onFiles={handleFiles} />
        <GoalTracker entries={entries} />
        <hr className="divider" />
        <div className="actions">
          <button onClick={addCrypto}>Add Crypto Investment</button>
          <button
            onClick={() => {
              if (confirm('Clear ALL data and paystubs?')) {
                setEntries([]);
                setFiles([]);
                setPaystubs([]);
              }
            }}
          >
            Clear All
          </button>
          <button onClick={() => setIsChatOpen(true)}>AI Assistant</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Roth 401k</th>
                <th>401k Match</th>
                <th>After-tax 401k</th>
                <th>HSA Emp</th>
                <th>HSA Emp-r</th>
                <th>Crypto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.date}>
                  <td style={{ textAlign: 'left' }}>
                    {r.fileId ? (
                      <a href={fileUrlById(r.fileId)} target="_blank" rel="noopener noreferrer">
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </a>
                    ) : (
                      new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    )}
                    {r.chk && <span style={{ color: '#888', marginLeft: 4 }}>#{r.chk}</span>}
                  </td>
                  <td onClick={() => editCell(r.date, 'Roth 401k', r.values['Roth 401k'])}>{$(r.values['Roth 401k'])}</td>
                  <td onClick={() => editCell(r.date, '401k Match', r.values['401k Match'])}>{$(r.values['401k Match'])}</td>
                  <td onClick={() => editCell(r.date, 'After-tax 401k', r.values['After-tax 401k'])}>{$(r.values['After-tax 401k'])}</td>
                  <td onClick={() => editCell(r.date, 'HSA Employee', r.values['HSA Employee'])}>{$(r.values['HSA Employee'])}</td>
                  <td onClick={() => editCell(r.date, 'HSA Employer', r.values['HSA Employer'])}>{$(r.values['HSA Employer'])}</td>
                  <td onClick={() => editCell(r.date, 'Crypto', r.values['Crypto'])}>{$(r.values['Crypto'])}</td>
                  <td>
                    <button className="icon-btn" onClick={() => deleteRow(r.date)} title="Delete row">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SummaryPanel entries={entries} />
        <hr className="divider" />
        <PaystubLibrary files={files} />
        {isChatOpen && <Chatbot entries={entries} paystubs={paystubs} onClose={() => setIsChatOpen(false)} />}
        </>
      )}

      {tab === 'paychecks' && (
        <>
          <PaycheckSummaryPanel paystubs={paystubs} entries={entries} />
          <hr className="divider" />
          <EsppSummaryPanel paystubs={paystubs} />
          <hr className="divider" />
          <PaycheckTable paystubs={paystubs} files={files} entries={entries} />
        </>
      )}

    </div>
  );
} 