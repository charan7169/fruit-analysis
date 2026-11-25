import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  RotateCcw,
  Upload,
  Download,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import {
  ComputedFruitSale,
  FruitCategory,
  FruitSaleEntry,
  FilterOptions,
  SortField,
  SalesSummaryMetrics,
  formatInr,
  getFruitColors,
  parseFruitCsv,
  exportFruitCsv,
} from '../utils/salesAnalytics';

interface DataFrameManagerProps {
  allRows: ComputedFruitSale[];
  filteredRows: ComputedFruitSale[];
  metrics: SalesSummaryMetrics;
  filters: FilterOptions;
  onUpdateFilters: (next: Partial<FilterOptions>) => void;
  onAddFruit: (entry: FruitSaleEntry) => void;
  onUpdateFruit: (id: string, quantityKg: number, unitPriceInr: number, category: FruitCategory) => void;
  onDeleteFruit: (id: string) => void;
  onResetSampleData: () => void;
  onImportCsvEntries: (entries: FruitSaleEntry[]) => void;
  selectedFruitId: string | null;
  onSelectFruit: (id: string | null) => void;
}

const CATEGORIES: FruitCategory[] = ['Tropical', 'Everyday', 'Citrus', 'Berry'];

export const DataFrameManager: React.FC<DataFrameManagerProps> = ({
  allRows,
  filteredRows,
  metrics,
  filters,
  onUpdateFilters,
  onAddFruit,
  onUpdateFruit,
  onDeleteFruit,
  onResetSampleData,
  onImportCsvEntries,
  selectedFruitId,
  onSelectFruit,
}) => {
  // Add Fruit Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FruitCategory>('Tropical');
  const [newQty, setNewQty] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [csvFeedback, setCsvFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inline Row Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCat, setEditCat] = useState<FruitCategory>('Tropical');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const maxPossibleSales = Math.max(...allRows.map((r) => r.totalSalesInr), 15000);

  const handleSort = (field: SortField) => {
    if (filters.sortField === field) {
      onUpdateFilters({
        sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onUpdateFilters({
        sortField: field,
        sortDirection: field === 'fruitName' || field === 'category' ? 'asc' : 'desc',
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setFormError('Please enter a valid fruit name.');
      return;
    }

    const parsedQty = parseFloat(newQty);
    const parsedPrice = parseFloat(newPrice);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setFormError('Quantity Sold (kg) must be a positive number.');
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Unit Price (₹) must be a positive number.');
      return;
    }

    const colors = getFruitColors(trimmedName, allRows.length);
    const entry: FruitSaleEntry = {
      id: `fruit-${Date.now()}`,
      fruitName: trimmedName,
      category: newCategory,
      quantityKg: Math.round(parsedQty * 100) / 100,
      unitPriceInr: Math.round(parsedPrice * 100) / 100,
      colorHex: colors.colorHex,
      accentHex: colors.accentHex,
    };

    onAddFruit(entry);
    setNewName('');
    setNewQty('');
    setNewPrice('');
  };

  const startInlineEdit = (row: ComputedFruitSale) => {
    setEditingId(row.id);
    setEditQty(String(row.quantityKg));
    setEditPrice(String(row.unitPriceInr));
    setEditCat(row.category);
  };

  const commitInlineEdit = (id: string) => {
    const q = parseFloat(editQty);
    const p = parseFloat(editPrice);
    if (!isNaN(q) && q >= 0 && !isNaN(p) && p >= 0) {
      onUpdateFruit(id, Math.round(q * 100) / 100, Math.round(p * 100) / 100, editCat);
    }
    setEditingId(null);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      const { entries, error } = parseFruitCsv(content);
      if (error) {
        setCsvFeedback({ type: 'error', message: error });
      } else {
        onImportCsvEntries(entries);
        setCsvFeedback({
          type: 'success',
          message: `Imported ${entries.length} fruit records from "${file.name}" into DataFrame.`,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportFruitCsv(allRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fruit_shop_sales.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field: SortField) => {
    if (filters.sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return filters.sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                pd.DataFrame
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Fruit Shop Sales DataFrame ({filteredRows.length} of {allRows.length} rows)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your CSV dataset, edit quantities or unit prices inline, or filter by category and minimum revenue.
            </p>
          </div>

          {/* CSV Upload / Download / Clear Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileUpload}
              className="hidden"
              id="csv-file-upload-input"
              aria-label="Upload custom CSV file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={allRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Download CSV
            </button>
            {allRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onResetSampleData();
                  setCsvFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Dataset
              </button>
            )}
          </div>
        </div>

        {/* CSV status banner if any */}
        {csvFeedback && (
          <div
            className={`px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
              csvFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <span>{csvFeedback.message}</span>
            <button
              type="button"
              onClick={() => setCsvFeedback(null)}
              className="text-xs underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Controls Grid: Search, Category Filter Tabs, Minimum Sales Slider */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <label htmlFor="fruit-search-input" className="sr-only">
              Search fruit name or category
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="fruit-search-input"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
              placeholder="Search fruit or category..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>

          {/* Category Filter Segmented Control */}
          <div className="md:col-span-5 flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(['All', 'Tropical', 'Everyday', 'Citrus', 'Berry'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onUpdateFilters({ category: cat })}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filters.category === cat
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Minimum Sales Slider Filter */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="min-sales-slider" className="font-medium text-slate-600">
                Min Sales Filter:
              </label>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {formatInr(filters.minTotalSales)}
              </span>
            </div>
            <input
              id="min-sales-slider"
              type="range"
              min={0}
              max={Math.ceil(maxPossibleSales / 1000) * 1000}
              step={500}
              value={filters.minTotalSales}
              onChange={(e) => onUpdateFilters({ minTotalSales: Number(e.target.value) })}
              className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Add New Fruit Entry Form */}
      <form
        onSubmit={handleAddSubmit}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs"
        aria-label="Add new fruit sales record"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="new-fruit-name" className="block text-xs font-semibold text-slate-700 mb-1">
              New Fruit Name
            </label>
            <input
              id="new-fruit-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Papaya, Kiwi, Guava"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>

          <div className="w-36">
            <label htmlFor="new-fruit-category" className="block text-xs font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              id="new-fruit-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as FruitCategory)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label htmlFor="new-fruit-qty" className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity Sold (kg)
            </label>
            <input
              id="new-fruit-qty"
              type="number"
              min="0.1"
              step="any"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="e.g. 65"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>

          <div className="w-36">
            <label htmlFor="new-fruit-price" className="block text-xs font-semibold text-slate-700 mb-1">
              Unit Price (₹/kg)
            </label>
            <input
              id="new-fruit-price"
              type="number"
              min="1"
              step="any"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="e.g. 120"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Fruit Entry
          </button>
        </div>

        {formError && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
      </form>

      {/* Pandas-Style Interactive DataFrame Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 w-12 font-mono text-slate-400">idx</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('fruitName')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Fruit Name
                    {renderSortIcon('fruitName')}
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('category')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Category
                    {renderSortIcon('category')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('quantityKg')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    Quantity Sold (kg)
                    {renderSortIcon('quantityKg')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('unitPriceInr')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    Unit Price (₹)
                    {renderSortIcon('unitPriceInr')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('totalSalesInr')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    Total Sales (₹)
                    {renderSortIcon('totalSalesInr')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('revenueSharePct')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    Share (%)
                    {renderSortIcon('revenueSharePct')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No fruit rows match your active filter criteria. Try lowering the minimum sales slider or clearing the search box.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isEditing = editingId === row.id;
                  const isSelected = selectedFruitId === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => !isEditing && onSelectFruit(isSelected ? null : row.id)}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/70'
                          : row.isHighest
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          : row.isLowest
                          ? 'bg-rose-50/25 hover:bg-rose-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Pandas DataFrame Index */}
                      <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                        {index}
                      </td>

                      {/* Fruit Name + Status Tag */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-xs shrink-0"
                            style={{ backgroundColor: row.colorHex }}
                          />
                          <span>{row.fruitName}</span>
                          {row.isHighest && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Highest
                            </span>
                          )}
                          {row.isLowest && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-rose-800 border border-amber-300">
                              Lowest
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category (unboxed metadata text or select when editing) */}
                      <td className="py-3 px-4 text-slate-600" onClick={(e) => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <select
                            aria-label={`Edit category for ${row.fruitName}`}
                            value={editCat}
                            onChange={(e) => setEditCat(e.target.value as FruitCategory)}
                            className="px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{row.category}</span>
                        )}
                      </td>

                      {/* Quantity Sold (kg) */}
                      <td
                        className="py-3 px-4 text-right font-mono tabular-nums text-slate-800"
                        onClick={(e) => isEditing && e.stopPropagation()}
                      >
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Edit quantity for ${row.fruitName}`}
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-20 px-2 py-1 text-right text-xs font-mono rounded border border-emerald-500 bg-white"
                          />
                        ) : (
                          `${row.quantityKg.toLocaleString('en-IN')} kg`
                        )}
                      </td>

                      {/* Unit Price (INR) */}
                      <td
                        className="py-3 px-4 text-right font-mono tabular-nums text-slate-800"
                        onClick={(e) => isEditing && e.stopPropagation()}
                      >
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Edit unit price for ${row.fruitName}`}
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-20 px-2 py-1 text-right text-xs font-mono rounded border border-emerald-500 bg-white"
                          />
                        ) : (
                          `₹${row.unitPriceInr.toLocaleString('en-IN')}`
                        )}
                      </td>

                      {/* Computed Total Sales (INR) */}
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatInr(row.totalSalesInr)}
                      </td>

                      {/* Revenue Share % */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {row.revenueSharePct.toFixed(1)}%
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => commitInlineEdit(row.id)}
                            aria-label={`Save changes for ${row.fruitName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startInlineEdit(row)}
                              aria-label={`Edit ${row.fruitName}`}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteFruit(row.id)}
                              aria-label={`Delete ${row.fruitName}`}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Summary Footer Row */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-mono text-xs font-bold text-slate-900 tabular-nums">
                  <td className="py-3 px-4 text-slate-400">Σ</td>
                  <td className="py-3 px-4 font-sans">
                    DataFrame Summary ({allRows.length} Total Fruits)
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500 font-normal">
                    Mean: {formatInr(metrics.averageSalesInr)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {metrics.totalQuantityKg.toLocaleString('en-IN')} kg
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-normal">
                    —
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    {formatInr(metrics.totalRevenueInr)}
                  </td>
                  <td className="py-3 px-4 text-right">100.0%</td>
                  <td className="py-3 px-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
