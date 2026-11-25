import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calculator,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { SalesSummaryMetrics, formatInr } from '../utils/salesAnalytics';

interface KpiCardsProps {
  metrics: SalesSummaryMetrics;
  onSelectFruit?: (fruitId: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, onSelectFruit }) => {
  const {
    totalRevenueInr,
    totalQuantityKg,
    averageSalesInr,
    medianSalesInr,
    highestSelling,
    lowestSelling,
    fruitCount,
    aboveAverageCount,
  } = metrics;

  return (
    <section
      aria-label="Summary Key Performance Indicators"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Card 1: Total Shop Revenue & Quantity */}
      <div
        data-testid="kpi-total-revenue"
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 tracking-wide">
              Total Shop Revenue (₹)
            </p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatInr(totalRevenueInr)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Total Quantity Sold</span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {totalQuantityKg.toLocaleString('en-IN')} kg across {fruitCount} fruits
          </span>
        </div>
      </div>

      {/* Card 2: Highest-Selling Fruit (Green Highlight Badge) */}
      <div
        data-testid="kpi-highest-fruit"
        onClick={() => highestSelling && onSelectFruit?.(highestSelling.id)}
        role={highestSelling && onSelectFruit ? 'button' : undefined}
        tabIndex={highestSelling && onSelectFruit ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && highestSelling && onSelectFruit) {
            e.preventDefault();
            onSelectFruit(highestSelling.id);
          }
        }}
        className={`bg-white rounded-xl border border-emerald-200/90 p-5 shadow-xs flex flex-col justify-between transition-colors ${
          highestSelling && onSelectFruit ? 'cursor-pointer hover:bg-emerald-50/30' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-500 tracking-wide">
                Highest-Selling Fruit
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300/70">
                <Award className="w-3 h-3" />
                Top Performer
              </span>
            </div>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 truncate">
              {highestSelling ? highestSelling.fruitName : 'N/A'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-mono font-semibold text-emerald-700 tabular-nums text-sm">
            {highestSelling ? formatInr(highestSelling.totalSalesInr) : '₹0'}
          </span>
          <span className="text-slate-600 font-mono tabular-nums">
            {highestSelling
              ? `${highestSelling.revenueSharePct.toFixed(1)}% share · ${highestSelling.quantityKg} kg`
              : '0% share'}
          </span>
        </div>
      </div>

      {/* Card 3: Lowest-Selling Fruit (Amber/Red Highlight Badge) */}
      <div
        data-testid="kpi-lowest-fruit"
        onClick={() => lowestSelling && onSelectFruit?.(lowestSelling.id)}
        role={lowestSelling && onSelectFruit ? 'button' : undefined}
        tabIndex={lowestSelling && onSelectFruit ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && lowestSelling && onSelectFruit) {
            e.preventDefault();
            onSelectFruit(lowestSelling.id);
          }
        }}
        className={`bg-white rounded-xl border border-amber-200/90 p-5 shadow-xs flex flex-col justify-between transition-colors ${
          lowestSelling && onSelectFruit ? 'cursor-pointer hover:bg-amber-50/30' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-500 tracking-wide">
                Lowest-Selling Fruit
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-rose-800 border border-amber-300/80">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Low Volume
              </span>
            </div>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 truncate">
              {lowestSelling ? lowestSelling.fruitName : 'N/A'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-mono font-semibold text-rose-700 tabular-nums text-sm">
            {lowestSelling ? formatInr(lowestSelling.totalSalesInr) : '₹0'}
          </span>
          <span className="text-slate-600 font-mono tabular-nums">
            {lowestSelling
              ? `${lowestSelling.revenueSharePct.toFixed(1)}% share · ${lowestSelling.quantityKg} kg`
              : '0% share'}
          </span>
        </div>
      </div>

      {/* Card 4: Average Sales per Fruit */}
      <div
        data-testid="kpi-average-sales"
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 tracking-wide">
              Average Sales per Fruit
            </p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatInr(averageSalesInr)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Median: {formatInr(medianSalesInr)}</span>
          <span className="font-mono font-semibold text-slate-800 tabular-nums">
            {aboveAverageCount} of {fruitCount} above avg
          </span>
        </div>
      </div>
    </section>
  );
};
