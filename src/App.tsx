/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  BarChart3,
  Upload,
  Award,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  FruitSaleEntry,
  FruitCategory,
  FilterOptions,
  computeSalesAnalytics,
  filterAndSortRows,
  parseFruitCsv,
  formatInr,
} from './utils/salesAnalytics';
import { KpiCards } from './components/KpiCards';
import { FruitSalesChart3D } from './components/FruitSalesChart3D';
import { MatplotlibBarChart2D } from './components/MatplotlibBarChart2D';
import { DataFrameManager } from './components/DataFrameManager';
import { LabReportAndPythonTab } from './components/LabReportAndPythonTab';

type ActiveTab = 'dashboard' | 'dataframe' | 'labreport';
type ChartViewMode = '3d' | '2d';

export default function App() {
  // Start with an empty dataset so the user's uploaded CSV drives all calculations and 3D/2D representations
  const [entries, setEntries] = useState<FruitSaleEntry[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('3d');
  const [selectedFruitId, setSelectedFruitId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const globalCsvInputRef = useRef<HTMLInputElement | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    category: 'All',
    minTotalSales: 0,
    sortField: 'totalSalesInr',
    sortDirection: 'desc',
  });

  // Dynamically compute every metric directly from the active dataset
  const { computedRows, metrics } = useMemo(
    () => computeSalesAnalytics(entries),
    [entries]
  );

  const filteredRows = useMemo(
    () => filterAndSortRows(computedRows, filters),
    [computedRows, filters]
  );

  const handleUpdateFilters = (next: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handleAddFruit = (newEntry: FruitSaleEntry) => {
    setEntries((prev) => [...prev, newEntry]);
  };

  const handleUpdateFruit = (
    id: string,
    quantityKg: number,
    unitPriceInr: number,
    category: FruitCategory
  ) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantityKg, unitPriceInr, category } : item
      )
    );
  };

  const handleDeleteFruit = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (selectedFruitId === id) {
      setSelectedFruitId(null);
    }
  };

  const handleClearData = () => {
    setEntries([]);
    setFilters({
      searchQuery: '',
      category: 'All',
      minTotalSales: 0,
      sortField: 'totalSalesInr',
      sortDirection: 'desc',
    });
    setSelectedFruitId(null);
    setUploadStatus(null);
  };

  const handleImportCsvEntries = (imported: FruitSaleEntry[]) => {
    setEntries(imported);
    setSelectedFruitId(null);
  };

  const triggerGlobalCsvDialog = () => {
    globalCsvInputRef.current?.click();
  };

  const handleGlobalCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const { entries: parsed, error } = parseFruitCsv(text);
      if (error) {
        setUploadStatus({ type: 'error', message: error });
      } else {
        setEntries(parsed);
        setSelectedFruitId(null);
        setUploadStatus({
          type: 'success',
          message: `Loaded ${parsed.length} fruit records from "${file.name}". All 3D/2D charts and KPIs updated.`,
        });
      }
      if (globalCsvInputRef.current) {
        globalCsvInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Hidden Global CSV File Input */}
      <input
        ref={globalCsvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleGlobalCsvFileChange}
        className="hidden"
        id="global-csv-upload-input"
        aria-label="Upload CSV dataset file"
      />

      {/* Top Bar Contract: 3 zones separated by gap-8 (Brand wordmark | Navigation tabs | 1 Primary Action) */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
          >
            Fruit Analysis
          </a>

          {/* Zone 2: Navigation Tabs */}
          <nav
            aria-label="Primary Workspace Sections"
            className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-emerald-400 font-semibold underline underline-offset-8 decoration-2 decoration-emerald-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3D Analytics Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dataframe')}
              className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'dataframe'
                  ? 'text-emerald-400 font-semibold underline underline-offset-8 decoration-2 decoration-emerald-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Dataset &amp; DataFrame
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('labreport')}
              className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'labreport'
                  ? 'text-emerald-400 font-semibold underline underline-offset-8 decoration-2 decoration-emerald-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Lab Report &amp; Python Code
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={triggerGlobalCsvDialog}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Project Branding & Quick Navigation Header Banner */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span>Fruit Analysis</span>
              <span aria-hidden="true">·</span>
              <span>NumPy · Pandas · Matplotlib · Three.js</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Fruit Shop Sales Analysis — Interactive 3D Data Analytics Dashboard
            </h1>
          </div>

          {/* 3D/2D View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Chart Visualization Mode Toggle"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            >
              <button
                type="button"
                onClick={() => {
                  setChartViewMode('3d');
                  if (activeTab === 'labreport') setActiveTab('dashboard');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  chartViewMode === '3d'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                3D View
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartViewMode('2d');
                  if (activeTab === 'labreport') setActiveTab('dashboard');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  chartViewMode === '2d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                2D Bar Chart
              </button>
            </div>
          </div>
        </section>

        {/* CSV Upload Status Notification */}
        {uploadStatus && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
              uploadStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{uploadStatus.message}</span>
            <button
              type="button"
              onClick={() => setUploadStatus(null)}
              className="underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Prominent CSV Upload Prompt Banner when no CSV file has been loaded yet */}
        {entries.length === 0 && (
          <section
            data-testid="csv-upload-hero-dropzone"
            className="bg-white rounded-xl border-2 border-dashed border-emerald-300 p-6 sm:p-8 text-center shadow-xs space-y-3"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="max-w-xl mx-auto space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                Upload Your Fruit Sales CSV File to Begin Analysis
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Select a CSV file containing columns such as{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  Fruit Name, Category, Quantity Sold (kg), Unit Price (INR)
                </code>
                . All KPIs, 3D fruit models (crescent banana, grape cluster, pineapple, strawberry, mango, watermelon), 2D charts, and Python code will compute automatically from your uploaded file.
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={triggerGlobalCsvDialog}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                Choose CSV File to Upload
              </button>
            </div>
          </section>
        )}

        {/* Dynamic Auto-Calculated KPI Summary Cards */}
        <KpiCards
          metrics={metrics}
          onSelectFruit={(id) => {
            setSelectedFruitId((prev) => (prev === id ? null : id));
          }}
        />

        {/* TAB 1: 3D ANALYTICS DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Primary Visualization Area + Category & Extrema Breakdown Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8">
                {chartViewMode === '3d' ? (
                  <FruitSalesChart3D
                    rows={filteredRows}
                    metrics={metrics}
                    selectedFruitId={selectedFruitId}
                    onSelectFruit={setSelectedFruitId}
                    onUploadCsvClick={triggerGlobalCsvDialog}
                  />
                ) : (
                  <MatplotlibBarChart2D
                    rows={filteredRows}
                    metrics={metrics}
                    selectedFruitId={selectedFruitId}
                    onSelectFruit={(id) =>
                      setSelectedFruitId((prev) => (prev === id ? null : id))
                    }
                  />
                )}
              </div>

              {/* Right Column: Live Sales Ranking & Category Share Breakdown */}
              <aside className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Revenue Distribution &amp; Rankings
                      </h2>
                      <p className="text-xs text-slate-500">
                        {computedRows.length > 0
                          ? `Click any fruit to highlight in ${chartViewMode.toUpperCase()} view`
                          : 'Upload a CSV file to populate rankings'}
                      </p>
                    </div>
                    <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>

                  {/* Individual Fruit Progress Bars */}
                  {computedRows.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No fruit records loaded yet. Upload your CSV file above or add rows in the DataFrame below.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {[...computedRows]
                        .sort((a, b) => b.totalSalesInr - a.totalSalesInr)
                        .map((fruit) => {
                          const isSelected = fruit.id === selectedFruitId;
                          return (
                            <button
                              key={fruit.id}
                              type="button"
                              onClick={() =>
                                setSelectedFruitId(isSelected ? null : fruit.id)
                              }
                              className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                                    style={{ backgroundColor: fruit.colorHex }}
                                  />
                                  <span className="font-bold truncate">
                                    #{fruit.rank} {fruit.fruitName}
                                  </span>
                                  {fruit.isHighest && (
                                    <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  )}
                                  {fruit.isLowest && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                </div>
                                <span className="font-mono font-bold tabular-nums">
                                  {formatInr(fruit.totalSalesInr)}
                                </span>
                              </div>
                              <div className="mt-1.5 w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, fruit.revenueSharePct * 3.5)}%`,
                                    backgroundColor: fruit.colorHex,
                                  }}
                                />
                              </div>
                              <div
                                className={`mt-1 flex items-center justify-between text-[11px] font-mono tabular-nums ${
                                  isSelected ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                <span>
                                  {fruit.quantityKg} kg × ₹{fruit.unitPriceInr}/kg
                                </span>
                                <span>{fruit.revenueSharePct.toFixed(1)}% share</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Category Aggregation Box */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h3 className="text-xs font-bold text-slate-700">
                    Category Revenue Share (pd.groupby)
                  </h3>
                  {metrics.categoryBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Category breakdown will appear after CSV upload.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {metrics.categoryBreakdown.map((cat) => (
                        <div
                          key={cat.category}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{cat.category}</span>
                            <span className="font-mono text-[11px] text-emerald-700">
                              {cat.sharePct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-0.5 font-mono text-slate-900 font-bold tabular-nums">
                            {formatInr(cat.totalSalesInr)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {cat.count} fruits · {cat.totalQuantityKg} kg
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {/* Interactive Pandas DataFrame directly accessible below chart on Dashboard */}
            <DataFrameManager
              allRows={computedRows}
              filteredRows={filteredRows}
              metrics={metrics}
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              onAddFruit={handleAddFruit}
              onUpdateFruit={handleUpdateFruit}
              onDeleteFruit={handleDeleteFruit}
              onResetSampleData={handleClearData}
              onImportCsvEntries={handleImportCsvEntries}
              selectedFruitId={selectedFruitId}
              onSelectFruit={setSelectedFruitId}
            />
          </div>
        )}

        {/* TAB 2: DATASET & DATAFRAME FOCUSED WORKSPACE */}
        {activeTab === 'dataframe' && (
          <DataFrameManager
            allRows={computedRows}
            filteredRows={filteredRows}
            metrics={metrics}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onAddFruit={handleAddFruit}
            onUpdateFruit={handleUpdateFruit}
            onDeleteFruit={handleDeleteFruit}
            onResetSampleData={handleClearData}
            onImportCsvEntries={handleImportCsvEntries}
            selectedFruitId={selectedFruitId}
            onSelectFruit={setSelectedFruitId}
          />
        )}

        {/* TAB 3: COMPLETE 10-SECTION LAB REPORT & PYTHON CODE */}
        {activeTab === 'labreport' && (
          <LabReportAndPythonTab rows={computedRows} metrics={metrics} />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>Fruit Analysis</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Interactive 3D Data Analytics &amp; Python Lab Report</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-slate-900 cursor-pointer"
            >
              3D Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dataframe')}
              className="hover:text-slate-900 cursor-pointer"
            >
              DataFrame &amp; CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('labreport')}
              className="hover:text-slate-900 cursor-pointer"
            >
              10-Section Lab Report
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
