import React, { useState } from 'react';
import {
  Copy,
  Check,
  Terminal,
  BookOpen,
  FileCode2,
  Award,
  AlertTriangle,
  Download,
} from 'lucide-react';
import {
  ComputedFruitSale,
  SalesSummaryMetrics,
  formatInr,
  generatePythonLabCode,
} from '../utils/salesAnalytics';

interface LabReportAndPythonTabProps {
  rows: ComputedFruitSale[];
  metrics: SalesSummaryMetrics;
}

export const LabReportAndPythonTab: React.FC<LabReportAndPythonTabProps> = ({
  rows,
  metrics,
}) => {
  const [copiedFullScript, setCopiedFullScript] = useState(false);

  const pythonScript = generatePythonLabCode(rows, metrics);

  const handleCopyFullScript = async () => {
    try {
      await navigator.clipboard.writeText(pythonScript);
      setCopiedFullScript(true);
      setTimeout(() => setCopiedFullScript(false), 2500);
    } catch {
      // Fallback copy if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = pythonScript;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedFullScript(true);
      setTimeout(() => setCopiedFullScript(false), 2500);
    }
  };

  const handleDownloadPyFile = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fruit_shop_sales_analysis.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  const highest = metrics.highestSelling;
  const lowest = metrics.lowestSelling;
  const aboveAvgFruits = rows.filter((r) => r.isAboveAverage);
  const topCategory = metrics.categoryBreakdown[0];

  return (
    <div data-testid="lab-report-python-tab" className="space-y-6">
      {/* Academic Report Banner Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <BookOpen className="w-4 h-4" />
            <span>Fruit Analysis · Academic Documentation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            10-Section Lab Report &amp; Verified Python Source Code
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Every statistical finding, DataFrame summary, and Python script below is dynamically synchronized with your active dataset ({rows.length} fruit varieties, {formatInr(metrics.totalRevenueInr)} total revenue).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyFullScript}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            {copiedFullScript ? (
              <>
                <Check className="w-4 h-4" />
                Copied Python Code!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Complete Python Script
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownloadPyFile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download .py File
          </button>
        </div>
      </div>

      {/* 10 Academic Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 01: Problem Statement */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            01. Problem Statement
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Local retail fruit shops routinely record daily sales quantities and per-kilogram unit prices on paper ledgers without structured digital aggregation. As a result, shop managers struggle to quantify total revenue contribution per fruit variety, identify the highest-earning and lowest-earning inventory items, or optimize seasonal restocking. This project addresses the problem by designing an automated Python &amp; interactive 3D data analytics pipeline that processes fruit sales records into actionable revenue KPIs and visual charts.
          </p>
        </article>

        {/* Section 02: Objective */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            02. Objective
          </h3>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Construct a structured Pandas DataFrame (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">pd.DataFrame</code>) and support CSV file ingestion for retail fruit sales.</li>
            <li>Perform vectorized element-wise multiplication using NumPy (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">np.multiply</code>) to compute Total Sales (₹) and Revenue Share (%).</li>
            <li>Dynamically determine the Highest-Selling Fruit, Lowest-Selling Fruit, Shop Revenue, Mean Sales, and Standard Deviation.</li>
            <li>Visualize comparative revenue distribution across fruits using both a 3D Three.js scene and a Matplotlib bar chart.</li>
          </ul>
        </article>

        {/* Section 03: Dataset Description */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            03. Dataset Description
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            The active dataset comprises <strong className="text-slate-900 font-mono">{rows.length}</strong> fruit records across <strong className="text-slate-900 font-mono">{metrics.categoryBreakdown.length}</strong> categories (Tropical, Everyday, Citrus, Berry). Each record contains five core attributes:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-semibold text-slate-900 block">Fruit Name</span>
              <span className="text-slate-500 font-mono text-[11px]">string (Nominal)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-semibold text-slate-900 block">Category</span>
              <span className="text-slate-500 font-mono text-[11px]">string (Categorical)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-semibold text-slate-900 block">Quantity Sold (kg)</span>
              <span className="text-slate-500 font-mono text-[11px]">float64 / int64</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-semibold text-slate-900 block">Unit Price (₹)</span>
              <span className="text-slate-500 font-mono text-[11px]">float64 (INR/kg)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 sm:col-span-2">
              <span className="font-semibold text-emerald-800 block">Total Sales (₹) [Computed]</span>
              <span className="text-slate-500 font-mono text-[11px]">Quantity Sold × Unit Price</span>
            </div>
          </div>
        </article>

        {/* Section 04: Python Libraries Used */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            04. Python Libraries Used (NumPy, Pandas, Matplotlib)
          </h3>
          <div className="space-y-2 text-xs sm:text-sm text-slate-600">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-bold text-slate-900 font-mono">1. NumPy (import numpy as np)</span>
              <p className="text-xs text-slate-600 mt-0.5">
                Used for high-speed vectorized array multiplication (<code className="font-mono">np.multiply</code>) and statistical aggregations (<code className="font-mono">np.sum</code>, <code className="font-mono">np.mean</code>, <code className="font-mono">np.median</code>, <code className="font-mono">np.std</code>).
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-bold text-slate-900 font-mono">2. Pandas (import pandas as pd)</span>
              <p className="text-xs text-slate-600 mt-0.5">
                Used for tabular <code className="font-mono">DataFrame</code> creation, CSV reading/export (<code className="font-mono">pd.read_csv</code>), boolean filtering, sorting (<code className="font-mono">sort_values</code>), extrema indexing (<code className="font-mono">idxmax</code> / <code className="font-mono">idxmin</code>), and <code className="font-mono">groupby</code> aggregation.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="font-bold text-slate-900 font-mono">3. Matplotlib (import matplotlib.pyplot as plt)</span>
              <p className="text-xs text-slate-600 mt-0.5">
                Used to plot the 2D comparative bar chart (<code className="font-mono">plt.bar</code>), overlay the horizontal average benchmark line (<code className="font-mono">plt.axhline</code>), annotate bar totals, and export high-DPI PNG figures.
              </p>
            </div>
          </div>
        </article>

        {/* Section 05: DataFrame Creation / CSV Reading */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            05. DataFrame Creation / CSV Reading
          </h3>
          <p className="text-xs text-slate-600">
            Initializing the Pandas DataFrame from dictionary literals or an external CSV file:
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`data = {
    'Fruit Name': [${rows.map((r) => `'${r.fruitName}'`).join(', ')}],
    'Category': [${rows.map((r) => `'${r.category}'`).join(', ')}],
    'Quantity Sold (kg)': [${rows.map((r) => r.quantityKg).join(', ')}],
    'Unit Price (INR)': [${rows.map((r) => r.unitPriceInr).join(', ')}]
}
df = pd.DataFrame(data)
# Or load directly from CSV:
# df = pd.read_csv('fruit_shop_sales.csv')`}
          </pre>
        </article>

        {/* Section 06: Data Processing */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            06. Data Processing
          </h3>
          <p className="text-xs text-slate-600">
            Vectorized computation of <code className="font-mono">Total Sales (INR)</code> and <code className="font-mono">Revenue Share (%)</code> without explicit Python loops:
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`# Element-wise multiplication using NumPy
df['Total Sales (INR)'] = np.multiply(
    df['Quantity Sold (kg)'],
    df['Unit Price (INR)']
)

total_revenue = np.sum(df['Total Sales (INR)'])
df['Revenue Share (%)'] = np.round(
    (df['Total Sales (INR)'] / total_revenue) * 100, 2
)`}
          </pre>
        </article>

        {/* Section 07: Filtering and Calculations */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            07. Filtering and Calculations
          </h3>
          <p className="text-xs text-slate-600">
            Extracting highest/lowest selling items via <code className="font-mono">idxmax()</code> / <code className="font-mono">idxmin()</code> and boolean masking for above-average performers:
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`mean_sales = np.mean(df['Total Sales (INR)'])      # ${formatInr(metrics.averageSalesInr)}
median_sales = np.median(df['Total Sales (INR)'])  # ${formatInr(metrics.medianSalesInr)}
std_sales = np.std(df['Total Sales (INR)'])        # ${formatInr(metrics.stdDevSalesInr)}

highest_fruit = df.loc[df['Total Sales (INR)'].idxmax()]
lowest_fruit = df.loc[df['Total Sales (INR)'].idxmin()]

# Boolean filter for fruits above shop average
above_avg_df = df[df['Total Sales (INR)'] >= mean_sales]`}
          </pre>
        </article>

        {/* Section 08: Data Visualization */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
          <h3 className="text-base font-bold text-slate-900">
            08. Data Visualization
          </h3>
          <p className="text-xs text-slate-600">
            Plotting the fruit revenue bar chart with Matplotlib and annotating the mean benchmark line:
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`plt.figure(figsize=(11, 6), dpi=120)
bars = plt.bar(df['Fruit Name'], df['Total Sales (INR)'],
               color=[${rows.map((r) => `'${r.colorHex}'`).join(', ')}],
               edgecolor='#1E293B', width=0.58)
plt.axhline(mean_sales, color='#0F172A', linestyle='--',
            label=f'Mean Sales (INR {mean_sales:,.0f})')
plt.title('Fruit Analysis — Total Sales Revenue by Fruit')
plt.xlabel('Fruit Name')
plt.ylabel('Total Sales (INR)')
plt.legend()
plt.tight_layout()
plt.show()`}
          </pre>
        </article>

        {/* Section 09: Results / Observations (Dynamically Computed from Active Dataset) */}
        <article
          data-testid="lab-section-9-results"
          className="bg-white rounded-xl border border-emerald-200 p-5 shadow-xs space-y-3 lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">
              09. Results / Observations (Live Computed from Current Dataset)
            </h3>
            <span className="text-xs font-mono text-emerald-700 font-semibold">
              Auto-Updated from Active DataFrame
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Highest-Selling Fruit Observation</span>
              </div>
              <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                {highest ? (
                  <>
                    <strong>{highest.fruitName}</strong> ({highest.category}) generated the highest revenue at{' '}
                    <strong className="font-mono">{formatInr(highest.totalSalesInr)}</strong> ({highest.quantityKg} kg × ₹{highest.unitPriceInr}/kg), contributing{' '}
                    <strong className="font-mono">{highest.revenueSharePct.toFixed(1)}%</strong> of total shop sales.
                  </>
                ) : (
                  'Upload a CSV dataset to compute highest-selling fruit observations.'
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Lowest-Selling Fruit Observation</span>
              </div>
              <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                {lowest ? (
                  <>
                    <strong>{lowest.fruitName}</strong> ({lowest.category}) recorded the lowest revenue at{' '}
                    <strong className="font-mono">{formatInr(lowest.totalSalesInr)}</strong> ({lowest.quantityKg} kg × ₹{lowest.unitPriceInr}/kg), accounting for{' '}
                    <strong className="font-mono">{lowest.revenueSharePct.toFixed(1)}%</strong> of overall revenue.
                  </>
                ) : (
                  'Upload a CSV dataset to compute lowest-selling fruit observations.'
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-900">
                Statistical &amp; Category Breakdown
              </div>
              <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                {rows.length > 0 ? (
                  <>
                    Total revenue across all <strong>{rows.length}</strong> fruits reached{' '}
                    <strong className="font-mono">{formatInr(metrics.totalRevenueInr)}</strong> from{' '}
                    <strong className="font-mono">{metrics.totalQuantityKg} kg</strong> sold.{' '}
                    <strong>{aboveAvgFruits.length}</strong> fruits exceeded the shop average of{' '}
                    <strong className="font-mono">{formatInr(metrics.averageSalesInr)}</strong>
                    {topCategory ? `, led by the ${topCategory.category} category (${topCategory.sharePct.toFixed(1)}% share).` : '.'}
                  </>
                ) : (
                  'Upload a CSV file or add fruit rows to compute statistical & category breakdown.'
                )}
              </p>
            </div>
          </div>
        </article>

        {/* Section 10: Conclusion */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900">
            10. Conclusion
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            This Fruit Analysis system demonstrates how NumPy, Pandas, and Matplotlib streamline retail fruit shop sales analysis. By transforming raw quantity and unit price records from uploaded CSV files into a dynamic DataFrame, the pipeline instantaneously identifies{' '}
            <strong className="text-slate-900">{highest?.fruitName ?? 'the top-performing fruit'}</strong> as the primary revenue driver ({highest ? formatInr(highest.totalSalesInr) : '₹0'}) and{' '}
            <strong className="text-slate-900">{lowest?.fruitName ?? 'the lowest-performing fruit'}</strong> as the lowest revenue contributor ({lowest ? formatInr(lowest.totalSalesInr) : '₹0'}), while pairing a Three.js 3D spatial bar and fruit visualization with a reproducible Matplotlib 2D bar chart for comprehensive retail decision-making.
          </p>
        </article>
      </div>

      {/* Complete Copyable Python Code Block for IDLE / Jupyter Verification */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">fruit_shop_sales_analysis.py</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Ready for Python IDLE / Jupyter Notebook</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFullScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              {copiedFullScript ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <FileCode2 className="w-3.5 h-3.5" />
                  Copy Python Script
                </>
              )}
            </button>
          </div>
        </div>
        <pre
          data-testid="full-python-code-block"
          className="p-5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[540px]"
        >
          <code>{pythonScript}</code>
        </pre>
      </div>
    </div>
  );
};
