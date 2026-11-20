import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  TrendingUp,
  Tag,
  Info,
  ChevronDown,
} from 'lucide-react';
import type { TravelVoucher, VendorPaymentRecord, ExpenseCategory } from '../../types';
import {
  calcMonthlyCategoryExpenses,
  formatINR,
  EXPENSE_CATEGORY_CONFIG,
  ALL_EXPENSE_CATEGORIES,
} from '../../utils/calculations';

interface ExpenseDistributionChartProps {
  vouchers: TravelVoucher[];
  vendorPayments: VendorPaymentRecord[];
  onNavigateToCategory?: (category: ExpenseCategory) => void;
}

type ChartViewType = 'stacked_bar' | 'donut' | 'grouped_bar';

export const ExpenseDistributionChart: React.FC<ExpenseDistributionChartProps> = ({
  vouchers,
  vendorPayments,
  onNavigateToCategory,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [viewType, setViewType] = useState<ChartViewType>('stacked_bar');
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);

  // Calculate monthly & category distribution
  const { monthlyData, categoryTotals, grandTotal, availableMonths } = useMemo(() => {
    return calcMonthlyCategoryExpenses(vouchers, vendorPayments, selectedMonth);
  }, [vouchers, vendorPayments, selectedMonth]);

  // Identify categories that actually have expenses
  const activeExpenseCategories = useMemo(() => {
    return ALL_EXPENSE_CATEGORIES.filter((cat) => {
      return categoryTotals.some((item) => item.category === cat && item.amount > 0);
    });
  }, [categoryTotals]);

  // Highest spending category
  const topCategory = categoryTotals.length > 0 ? categoryTotals[0] : null;

  // Custom Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate month total from payload items
    const monthTotal = payload.reduce(
      (sum: number, entry: any) => sum + (typeof entry.value === 'number' ? entry.value : 0),
      0
    );

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[210px] z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {label}
          </span>
          <span className="font-mono font-bold text-indigo-300">
            {formatINR(monthTotal)}
          </span>
        </div>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {payload
            .filter((p: any) => p.value > 0)
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
            .map((p: any) => {
              const catKey = p.dataKey as ExpenseCategory;
              const config = EXPENSE_CATEGORY_CONFIG[catKey];
              const pct = monthTotal > 0 ? Math.round((p.value / monthTotal) * 100) : 0;
              return (
                <div key={catKey} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: p.color || config?.color }}
                    />
                    <span className="text-slate-300 truncate">{config?.label || catKey}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="font-semibold text-slate-100">{formatINR(p.value)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  // Custom Tooltip for Pie / Donut Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[170px] z-50">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold text-slate-100">{data.label}</span>
        </div>
        <div className="flex items-baseline justify-between font-mono mt-1">
          <span className="text-indigo-300 font-bold text-sm">{formatINR(data.amount)}</span>
          <span className="text-slate-400 font-medium">{data.percentage}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
      {/* Card Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
              Monthly Expense Distribution
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Recharts Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-9">
            Categorized breakdown of approved travel vouchers and vendor disbursements
          </p>
        </div>

        {/* View Switcher & Month Filter */}
        <div className="flex flex-wrap items-center gap-2 pl-9 md:pl-0">
          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none text-xs font-semibold bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 py-1.5 pl-3 pr-7 rounded-lg cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Monthly Cycles ({availableMonths.length})</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* View Mode Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setViewType('stacked_bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewType === 'stacked_bar'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Stacked Bar Chart"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stacked</span>
            </button>
            <button
              onClick={() => setViewType('grouped_bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewType === 'grouped_bar'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grouped Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grouped</span>
            </button>
            <button
              onClick={() => setViewType('donut')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewType === 'donut'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Category Donut Chart"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Donut</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bar for Current Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Selected Spend
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
            {formatINR(grandTotal)}
          </div>
          <span className="text-[10px] text-slate-500">
            {selectedMonth === 'all'
              ? 'Across all cycles'
              : availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Top Category
          </span>
          <div className="text-base sm:text-lg font-bold text-slate-800 mt-0.5 truncate">
            {topCategory ? topCategory.label : 'None'}
          </div>
          <span className="text-[10px] font-mono font-semibold text-indigo-600">
            {topCategory ? `${formatINR(topCategory.amount)} (${topCategory.percentage}%)` : '—'}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Active Categories
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-800 mt-0.5">
            {categoryTotals.length} of {ALL_EXPENSE_CATEGORIES.length}
          </div>
          <span className="text-[10px] text-slate-500">Expense heads booked</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Period Range
          </span>
          <div className="text-base sm:text-lg font-bold text-slate-800 mt-0.5 truncate">
            {monthlyData.length} Months
          </div>
          <span className="text-[10px] text-slate-500">
            {monthlyData[0]?.monthLabel || ''} — {monthlyData[monthlyData.length - 1]?.monthLabel || ''}
          </span>
        </div>
      </div>

      {/* Primary Chart Canvas */}
      <div className="min-h-[320px] w-full pt-1">
        {viewType === 'stacked_bar' || viewType === 'grouped_bar' ? (
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? Math.round(val / 1000) + 'k' : val}`}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                {activeExpenseCategories.map((cat) => {
                  const cfg = EXPENSE_CATEGORY_CONFIG[cat];
                  const isHighlighted = !activeCategory || activeCategory === cat;
                  return (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      name={cfg.label}
                      stackId={viewType === 'stacked_bar' ? 'expenses' : undefined}
                      fill={cfg.color}
                      opacity={isHighlighted ? 1 : 0.25}
                      radius={
                        viewType === 'grouped_bar'
                          ? [4, 4, 0, 0]
                          : cat === activeExpenseCategories[activeExpenseCategories.length - 1]
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Donut / Pie View */
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 py-2">
            <div className="h-[280px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={categoryTotals}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {categoryTotals.map((entry) => (
                      <Cell
                        key={`cell-${entry.category}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center Donut Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total
                </span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatINR(grandTotal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {categoryTotals.length} categories
                </span>
              </div>
            </div>

            {/* Side breakdown list for Donut view */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Category Contribution
              </span>
              {categoryTotals.map((item) => (
                <div
                  key={item.category}
                  onClick={() => onNavigateToCategory && onNavigateToCategory(item.category)}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-800 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="font-bold text-slate-900">{formatINR(item.amount)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Category Legend Grid */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            Category Breakdown & Interactive Filter
          </span>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Reset Category Focus
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {categoryTotals.map((item) => {
            const isSelected = activeCategory === item.category;
            return (
              <div
                key={item.category}
                onClick={() => {
                  setActiveCategory(isSelected ? null : item.category);
                  if (onNavigateToCategory) {
                    onNavigateToCategory(item.category);
                  }
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200 shadow-xs'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold font-mono text-slate-500 bg-slate-50 px-1 py-0.2 rounded shrink-0">
                    {item.percentage}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {formatINR(item.amount)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    {selectedMonth === 'all' ? 'total' : 'cycle'}
                  </span>
                </div>
                {/* Visual percentage progress track */}
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(4, item.percentage))}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
