import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Contribution, PaystubRecord } from '../utils/parsePaystub';
import { $ } from '../utils/format';
import './Dashboard.css';

interface DashboardProps {
  entries: Contribution[];
  paystubs: PaystubRecord[];
}

const COLORS = {
  'Roth 401k': '#8884d8',
  '401k Match': '#82ca9d',
  'After-tax 401k': '#ffc658',
  'HSA Employee': '#ff8042',
  'HSA Employer': '#a4de6c',
  'Crypto': '#d0ed57',
};

const PAYCHECK_COLORS = {
  'Gross Pay': '#8884d8',
  'Net Pay': '#82ca9d',
  'Total Tax': '#ff8042',
  'Benefits': '#ffc658',
};

export default function Dashboard({ entries, paystubs }: DashboardProps) {
  // Calculate total contributions by type
  const contributionsByType = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach(entry => {
      if (!totals[entry.type]) totals[entry.type] = 0;
      totals[entry.type] += entry.employee + entry.employer;
    });
    return Object.entries(totals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [entries]);

  // Calculate employee vs employer contributions
  const employeeVsEmployer = useMemo(() => {
    let employee = 0;
    let employer = 0;
    entries.forEach(entry => {
      employee += entry.employee;
      employer += entry.employer;
    });
    return [
      { name: 'Employee Contributions', value: employee },
      { name: 'Employer Contributions', value: employer },
    ].filter(item => item.value > 0);
  }, [entries]);

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
    const monthlyData: Record<string, { month: string; total: number; sortKey: string }> = {};
    entries.forEach(entry => {
      const date = new Date(entry.payDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, total: 0, sortKey: monthKey };
      }
      monthlyData[monthKey].total += entry.employee + entry.employer;
    });

    return Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [entries]);

  // Calculate paycheck breakdown averages
  const paycheckBreakdown = useMemo(() => {
    if (paystubs.length === 0) return [];

    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalBenefits = 0;

    paystubs.forEach(stub => {
      totalGross += stub.grossPay || 0;
      totalNet += stub.netPay || 0;
      totalTax += (stub.federalTax || 0) + (stub.stateTax || 0) + (stub.ficaTax || 0);
      totalBenefits += stub.benefitsTotal || 0;
    });

    const count = paystubs.length;
    return [
      { name: 'Avg Gross Pay', value: totalGross / count },
      { name: 'Avg Net Pay', value: totalNet / count },
      { name: 'Avg Total Tax', value: totalTax / count },
      { name: 'Avg Benefits', value: totalBenefits / count },
    ].filter(item => item.value > 0);
  }, [paystubs]);

  // Calculate totals
  const totalContributions = contributionsByType.reduce((sum, item) => sum + item.value, 0);
  const totalEmployeeContrib = employeeVsEmployer.find(x => x.name === 'Employee Contributions')?.value || 0;
  const totalEmployerContrib = employeeVsEmployer.find(x => x.name === 'Employer Contributions')?.value || 0;

  // 2024 Microsoft contribution limits
  const limits = {
    'Roth 401k': 23500,
    '401k Match': 11750,
    'After-tax 401k': 34750, // Mega backdoor Roth
    'HSA': 4300, // Individual (employee + employer combined)
    'Total 401k': 70000, // Total limit for all 401k contributions
  };

  const totalRoth401k = contributionsByType.find(x => x.name === 'Roth 401k')?.value || 0;
  const total401kMatch = contributionsByType.find(x => x.name === '401k Match')?.value || 0;
  const totalAfterTax = contributionsByType.find(x => x.name === 'After-tax 401k')?.value || 0;
  const totalHSA = (contributionsByType.find(x => x.name === 'HSA Employee')?.value || 0) +
                   (contributionsByType.find(x => x.name === 'HSA Employer')?.value || 0);
  const total401k = totalRoth401k + total401kMatch + totalAfterTax;

  const progressRoth401k = ((totalRoth401k / limits['Roth 401k']) * 100).toFixed(1);
  const progress401kMatch = ((total401kMatch / limits['401k Match']) * 100).toFixed(1);
  const progressAfterTax = ((totalAfterTax / limits['After-tax 401k']) * 100).toFixed(1);
  const progressHSA = ((totalHSA / limits['HSA']) * 100).toFixed(1);
  const progressTotal401k = ((total401k / limits['Total 401k']) * 100).toFixed(1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${payload[0].name}: ${$(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">📊 Investment Dashboard</h2>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">Total Contributions</div>
            <div className="card-value">{$(totalContributions)}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">👤</div>
          <div className="card-content">
            <div className="card-label">Your Contributions</div>
            <div className="card-value">{$(totalEmployeeContrib)}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">🏢</div>
          <div className="card-content">
            <div className="card-label">Employer Match</div>
            <div className="card-value">{$(totalEmployerContrib)}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <div className="card-label">Paychecks Tracked</div>
            <div className="card-value">{paystubs.length}</div>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="progress-section">
        <h3>2024 Microsoft Contribution Limits</h3>
        <div className="progress-bars">
          <div className="progress-item">
            <div className="progress-header">
              <span>Total 401k (All Sources)</span>
              <span>{$(total401k)} / {$(limits['Total 401k'])} ({progressTotal401k}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(parseFloat(progressTotal401k), 100)}%` }}></div>
            </div>
          </div>

          <div className="progress-item">
            <div className="progress-header">
              <span>Roth 401k (Employee)</span>
              <span>{$(totalRoth401k)} / {$(limits['Roth 401k'])} ({progressRoth401k}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(parseFloat(progressRoth401k), 100)}%` }}></div>
            </div>
          </div>

          <div className="progress-item">
            <div className="progress-header">
              <span>401k Match (Employer)</span>
              <span>{$(total401kMatch)} / {$(limits['401k Match'])} ({progress401kMatch}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(parseFloat(progress401kMatch), 100)}%` }}></div>
            </div>
          </div>

          <div className="progress-item">
            <div className="progress-header">
              <span>After-tax 401k (Mega Backdoor)</span>
              <span>{$(totalAfterTax)} / {$(limits['After-tax 401k'])} ({progressAfterTax}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(parseFloat(progressAfterTax), 100)}%` }}></div>
            </div>
          </div>

          <div className="progress-item">
            <div className="progress-header">
              <span>HSA (Employee + Employer)</span>
              <span>{$(totalHSA)} / {$(limits['HSA'])} ({progressHSA}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(parseFloat(progressHSA), 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Contributions by Type */}
        {contributionsByType.length > 0 && (
          <div className="chart-card">
            <h3>Contributions by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={contributionsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contributionsByType.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Employee vs Employer */}
        {employeeVsEmployer.length > 0 && (
          <div className="chart-card">
            <h3>Employee vs Employer</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={employeeVsEmployer}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#8884d8" />
                  <Cell fill="#82ca9d" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Trends */}
        {monthlyTrends.length > 0 && (
          <div className="chart-card chart-wide">
            <h3>Monthly Contribution Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => $(value)} />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Paycheck Breakdown */}
        {paycheckBreakdown.length > 0 && (
          <div className="chart-card">
            <h3>Average Paycheck Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paycheckBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.replace('Avg ', '')}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paycheckBreakdown.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={Object.values(PAYCHECK_COLORS)[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
