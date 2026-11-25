export type FruitCategory = 'Tropical' | 'Citrus' | 'Berry' | 'Everyday';

export interface FruitSaleEntry {
  id: string;
  fruitName: string;
  category: FruitCategory;
  quantityKg: number;
  unitPriceInr: number;
  colorHex: string;
  accentHex: string;
}

export interface ComputedFruitSale extends FruitSaleEntry {
  totalSalesInr: number;
  revenueSharePct: number;
  rank: number;
  isHighest: boolean;
  isLowest: boolean;
  isAboveAverage: boolean;
}

export interface CategorySummary {
  category: FruitCategory;
  count: number;
  totalQuantityKg: number;
  totalSalesInr: number;
  sharePct: number;
}

export interface SalesSummaryMetrics {
  totalRevenueInr: number;
  totalQuantityKg: number;
  averageSalesInr: number;
  medianSalesInr: number;
  stdDevSalesInr: number;
  highestSelling: ComputedFruitSale | null;
  lowestSelling: ComputedFruitSale | null;
  fruitCount: number;
  aboveAverageCount: number;
  categoryBreakdown: CategorySummary[];
}

export type SortField = 'fruitName' | 'category' | 'quantityKg' | 'unitPriceInr' | 'totalSalesInr' | 'revenueSharePct';
export type SortDirection = 'asc' | 'desc';

export interface FilterOptions {
  searchQuery: string;
  category: FruitCategory | 'All';
  minTotalSales: number;
  sortField: SortField;
  sortDirection: SortDirection;
}

const FRUIT_COLOR_PALETTE: Record<string, { colorHex: string; accentHex: string }> = {
  mango: { colorHex: '#F59E0B', accentHex: '#D97706' },       // Gold / Alphonso Amber
  apple: { colorHex: '#E11D48', accentHex: '#BE123C' },       // Crimson Red
  banana: { colorHex: '#EAB308', accentHex: '#CA8A04' },      // Canary Gold
  orange: { colorHex: '#F97316', accentHex: '#EA580C' },      // Vibrant Tangerine
  grapes: { colorHex: '#7C3AED', accentHex: '#6D28D9' },      // Concord Violet
  pineapple: { colorHex: '#10B981', accentHex: '#059669' },   // Tropical Emerald
  strawberry: { colorHex: '#F43F5E', accentHex: '#E11D48' },  // Berry Rose
  watermelon: { colorHex: '#16A34A', accentHex: '#15803D' },  // Forest Lush Green
  papaya: { colorHex: '#FB923C', accentHex: '#EA580C' },      // Sunset Orange
  kiwi: { colorHex: '#65A30D', accentHex: '#4D7C0F' },        // Lime Green
  pomegranate: { colorHex: '#DC2626', accentHex: '#B91C1C' }, // Ruby Red
  blueberry: { colorHex: '#3B82F6', accentHex: '#2563EB' },   // Berry Indigo
  guava: { colorHex: '#22C55E', accentHex: '#15803D' },       // Guava Emerald
};

const FALLBACK_COLORS = [
  { colorHex: '#059669', accentHex: '#047857' },
  { colorHex: '#EA580C', accentHex: '#C2410C' },
  { colorHex: '#E11D48', accentHex: '#BE123C' },
  { colorHex: '#D97706', accentHex: '#B45309' },
  { colorHex: '#7C3AED', accentHex: '#6D28D9' },
  { colorHex: '#0284C7', accentHex: '#0369A1' },
];

export function getFruitColors(fruitName: string, index = 0): { colorHex: string; accentHex: string } {
  const key = fruitName.trim().toLowerCase();
  for (const [k, val] of Object.entries(FRUIT_COLOR_PALETTE)) {
    if (key.includes(k)) {
      return val;
    }
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export const INITIAL_FRUIT_DATASET: FruitSaleEntry[] = [
  {
    id: 'fruit-1',
    fruitName: 'Mango',
    category: 'Tropical',
    quantityKg: 95,
    unitPriceInr: 140,
    colorHex: '#F59E0B',
    accentHex: '#D97706',
  },
  {
    id: 'fruit-2',
    fruitName: 'Apple',
    category: 'Everyday',
    quantityKg: 72,
    unitPriceInr: 160,
    colorHex: '#E11D48',
    accentHex: '#BE123C',
  },
  {
    id: 'fruit-3',
    fruitName: 'Banana',
    category: 'Everyday',
    quantityKg: 115,
    unitPriceInr: 50,
    colorHex: '#EAB308',
    accentHex: '#CA8A04',
  },
  {
    id: 'fruit-4',
    fruitName: 'Orange',
    category: 'Citrus',
    quantityKg: 84,
    unitPriceInr: 85,
    colorHex: '#F97316',
    accentHex: '#EA580C',
  },
  {
    id: 'fruit-5',
    fruitName: 'Grapes',
    category: 'Berry',
    quantityKg: 64,
    unitPriceInr: 110,
    colorHex: '#7C3AED',
    accentHex: '#6D28D9',
  },
  {
    id: 'fruit-6',
    fruitName: 'Pineapple',
    category: 'Tropical',
    quantityKg: 52,
    unitPriceInr: 90,
    colorHex: '#10B981',
    accentHex: '#059669',
  },
  {
    id: 'fruit-7',
    fruitName: 'Strawberry',
    category: 'Berry',
    quantityKg: 38,
    unitPriceInr: 240,
    colorHex: '#F43F5E',
    accentHex: '#E11D48',
  },
  {
    id: 'fruit-8',
    fruitName: 'Watermelon',
    category: 'Tropical',
    quantityKg: 110,
    unitPriceInr: 35,
    colorHex: '#16A34A',
    accentHex: '#15803D',
  },
];

/**
 * Dynamically computes total sales per fruit, revenue shares, ranks,
 * highest/lowest markers, and summary KPIs directly from the active dataset.
 */
export function computeSalesAnalytics(entries: FruitSaleEntry[]): {
  computedRows: ComputedFruitSale[];
  metrics: SalesSummaryMetrics;
} {
  if (!entries || entries.length === 0) {
    return {
      computedRows: [],
      metrics: {
        totalRevenueInr: 0,
        totalQuantityKg: 0,
        averageSalesInr: 0,
        medianSalesInr: 0,
        stdDevSalesInr: 0,
        highestSelling: null,
        lowestSelling: null,
        fruitCount: 0,
        aboveAverageCount: 0,
        categoryBreakdown: [],
      },
    };
  }

  const rawWithTotals = entries.map((entry) => {
    const qty = Math.max(0, Number(entry.quantityKg) || 0);
    const price = Math.max(0, Number(entry.unitPriceInr) || 0);
    const totalSalesInr = Math.round(qty * price * 100) / 100;
    return {
      ...entry,
      quantityKg: qty,
      unitPriceInr: price,
      totalSalesInr,
    };
  });

  const totalRevenueInr = rawWithTotals.reduce((acc, r) => acc + r.totalSalesInr, 0);
  const totalQuantityKg = rawWithTotals.reduce((acc, r) => acc + r.quantityKg, 0);
  const averageSalesInr = rawWithTotals.length > 0 ? totalRevenueInr / rawWithTotals.length : 0;

  // Sort copy by totalSalesInr descending to determine ranks and highest/lowest
  const sortedBySalesDesc = [...rawWithTotals].sort((a, b) => {
    if (b.totalSalesInr !== a.totalSalesInr) return b.totalSalesInr - a.totalSalesInr;
    return a.fruitName.localeCompare(b.fruitName);
  });

  const highestId = sortedBySalesDesc[0]?.id ?? null;
  const lowestId = sortedBySalesDesc[sortedBySalesDesc.length - 1]?.id ?? null;

  const rankMap = new Map<string, number>();
  sortedBySalesDesc.forEach((item, idx) => {
    rankMap.set(item.id, idx + 1);
  });

  // Median calculation
  const salesValuesAsc = [...rawWithTotals].map((r) => r.totalSalesInr).sort((a, b) => a - b);
  const mid = Math.floor(salesValuesAsc.length / 2);
  const medianSalesInr =
    salesValuesAsc.length % 2 !== 0
      ? salesValuesAsc[mid]
      : (salesValuesAsc[mid - 1] + salesValuesAsc[mid]) / 2;

  // Standard Deviation (population std dev matching NumPy np.std)
  const variance =
    rawWithTotals.reduce((acc, r) => acc + Math.pow(r.totalSalesInr - averageSalesInr, 2), 0) /
    rawWithTotals.length;
  const stdDevSalesInr = Math.sqrt(variance);

  const computedRows: ComputedFruitSale[] = rawWithTotals.map((r) => {
    const revenueSharePct = totalRevenueInr > 0 ? (r.totalSalesInr / totalRevenueInr) * 100 : 0;
    return {
      ...r,
      revenueSharePct,
      rank: rankMap.get(r.id) ?? 1,
      isHighest: r.id === highestId,
      isLowest: rawWithTotals.length > 1 ? r.id === lowestId : false,
      isAboveAverage: r.totalSalesInr >= averageSalesInr,
    };
  });

  const highestSelling = computedRows.find((r) => r.id === highestId) ?? null;
  const lowestSelling =
    computedRows.length > 1
      ? computedRows.find((r) => r.id === lowestId) ?? null
      : computedRows[0] ?? null;

  const aboveAverageCount = computedRows.filter((r) => r.isAboveAverage).length;

  // Category Breakdown
  const categories: FruitCategory[] = ['Tropical', 'Everyday', 'Citrus', 'Berry'];
  const categoryBreakdown: CategorySummary[] = categories
    .map((cat) => {
      const matching = computedRows.filter((r) => r.category === cat);
      const catSales = matching.reduce((acc, r) => acc + r.totalSalesInr, 0);
      const catQty = matching.reduce((acc, r) => acc + r.quantityKg, 0);
      return {
        category: cat,
        count: matching.length,
        totalQuantityKg: catQty,
        totalSalesInr: catSales,
        sharePct: totalRevenueInr > 0 ? (catSales / totalRevenueInr) * 100 : 0,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.totalSalesInr - a.totalSalesInr);

  return {
    computedRows,
    metrics: {
      totalRevenueInr,
      totalQuantityKg,
      averageSalesInr,
      medianSalesInr,
      stdDevSalesInr,
      highestSelling,
      lowestSelling,
      fruitCount: computedRows.length,
      aboveAverageCount,
      categoryBreakdown,
    },
  };
}

/**
 * Filters and sorts computed DataFrame rows according to user controls.
 */
export function filterAndSortRows(
  rows: ComputedFruitSale[],
  options: FilterOptions
): ComputedFruitSale[] {
  const query = options.searchQuery.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    const matchesSearch =
      !query ||
      row.fruitName.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query);
    const matchesCategory = options.category === 'All' || row.category === options.category;
    const matchesMinSales = row.totalSalesInr >= options.minTotalSales;
    return matchesSearch && matchesCategory && matchesMinSales;
  });

  return [...filtered].sort((a, b) => {
    let comparison = 0;
    switch (options.sortField) {
      case 'fruitName':
        comparison = a.fruitName.localeCompare(b.fruitName);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'quantityKg':
        comparison = a.quantityKg - b.quantityKg;
        break;
      case 'unitPriceInr':
        comparison = a.unitPriceInr - b.unitPriceInr;
        break;
      case 'totalSalesInr':
        comparison = a.totalSalesInr - b.totalSalesInr;
        break;
      case 'revenueSharePct':
        comparison = a.revenueSharePct - b.revenueSharePct;
        break;
    }
    return options.sortDirection === 'asc' ? comparison : -comparison;
  });
}

const VALID_CATEGORIES: FruitCategory[] = ['Tropical', 'Citrus', 'Berry', 'Everyday'];

function normalizeCategory(raw: string): FruitCategory {
  const cleaned = raw.trim().toLowerCase();
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === cleaned) return cat;
  }
  if (cleaned.includes('trop')) return 'Tropical';
  if (cleaned.includes('citr')) return 'Citrus';
  if (cleaned.includes('berr')) return 'Berry';
  return 'Everyday';
}

/**
 * Parses a CSV string into FruitSaleEntry[] records.
 * Supports headers like: Fruit Name, Category, Quantity Sold (kg), Unit Price (₹), Total Sales (₹)
 */
export function parseFruitCsv(csvText: string): {
  entries: FruitSaleEntry[];
  error: string | null;
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      entries: [],
      error: 'CSV file must contain a header row and at least one fruit data row.',
    };
  }

  const headerCols = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIdx = headerCols.findIndex((h) => h.includes('fruit') || h.includes('name') || h.includes('item'));
  const catIdx = headerCols.findIndex((h) => h.includes('cat') || h.includes('type'));
  const qtyIdx = headerCols.findIndex((h) => h.includes('qty') || h.includes('quant') || h.includes('kg'));
  const priceIdx = headerCols.findIndex((h) => h.includes('price') || h.includes('unit') || h.includes('rate'));

  const resolvedNameIdx = nameIdx >= 0 ? nameIdx : 0;
  const resolvedCatIdx = catIdx >= 0 ? catIdx : 1;
  const resolvedQtyIdx = qtyIdx >= 0 ? qtyIdx : 2;
  const resolvedPriceIdx = priceIdx >= 0 ? priceIdx : 3;

  const parsedEntries: FruitSaleEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 3) continue;

    const fruitName = cols[resolvedNameIdx] || `Fruit ${i}`;
    const categoryRaw = cols[resolvedCatIdx] || 'Everyday';
    const quantityKg = parseFloat(cols[resolvedQtyIdx]?.replace(/[^0-9.-]/g, '') ?? '0');
    const unitPriceInr = parseFloat(cols[resolvedPriceIdx]?.replace(/[^0-9.-]/g, '') ?? '0');

    if (isNaN(quantityKg) || isNaN(unitPriceInr) || quantityKg < 0 || unitPriceInr < 0) {
      continue;
    }

    const colors = getFruitColors(fruitName, i - 1);
    parsedEntries.push({
      id: `csv-fruit-${Date.now()}-${i}`,
      fruitName,
      category: normalizeCategory(categoryRaw),
      quantityKg,
      unitPriceInr,
      colorHex: colors.colorHex,
      accentHex: colors.accentHex,
    });
  }

  if (parsedEntries.length === 0) {
    return {
      entries: [],
      error: 'Could not parse any valid fruit rows. Expected columns: Fruit Name, Category, Quantity Sold (kg), Unit Price (INR).',
    };
  }

  return { entries: parsedEntries, error: null };
}

/**
 * Serializes current computed dataset to CSV string for export.
 */
export function exportFruitCsv(rows: ComputedFruitSale[]): string {
  const header = 'Fruit Name,Category,Quantity Sold (kg),Unit Price (INR),Total Sales (INR),Revenue Share (%)';
  const csvRows = rows.map(
    (r) =>
      `"${r.fruitName.replace(/"/g, '""')}",${r.category},${r.quantityKg},${r.unitPriceInr},${r.totalSalesInr.toFixed(2)},${r.revenueSharePct.toFixed(2)}`
  );
  return [header, ...csvRows].join('\n');
}

export function formatInr(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Generates synchronized, copyable Python (NumPy, Pandas, Matplotlib) source code
 * reflecting the exact active dataset in the web application.
 */
export function generatePythonLabCode(rows: ComputedFruitSale[], metrics: SalesSummaryMetrics): string {
  const namesList = rows.map((r) => `'${r.fruitName}'`).join(', ');
  const categoriesList = rows.map((r) => `'${r.category}'`).join(', ');
  const quantitiesList = rows.map((r) => r.quantityKg).join(', ');
  const pricesList = rows.map((r) => r.unitPriceInr).join(', ');
  const colorsList = rows.map((r) => `'${r.colorHex}'`).join(', ');

  return `# ==============================================================================
# FRUIT ANALYSIS — PYTHON DATA ANALYTICS SCRIPT
# Title: Fruit Shop Sales Analysis using NumPy, Pandas, and Matplotlib
# ==============================================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# ------------------------------------------------------------------------------
# SECTION 5: DataFrame Creation / CSV Reading
# ------------------------------------------------------------------------------
# Read directly from uploaded CSV file:
# df = pd.read_csv('fruit_shop_sales.csv')

data = {
    'Fruit Name': [${namesList}],
    'Category': [${categoriesList}],
    'Quantity Sold (kg)': [${quantitiesList}],
    'Unit Price (INR)': [${pricesList}]
}

df = pd.DataFrame(data)

# ------------------------------------------------------------------------------
# SECTION 6: Data Processing (Vectorized NumPy & Pandas Operations)
# ------------------------------------------------------------------------------
# Compute Total Sales (INR) = Quantity Sold (kg) * Unit Price (INR)
df['Total Sales (INR)'] = np.multiply(df['Quantity Sold (kg)'], df['Unit Price (INR)'])

# Calculate Total Shop Revenue & Percentage Revenue Share per Fruit
total_revenue = np.sum(df['Total Sales (INR)'])
df['Revenue Share (%)'] = np.round((df['Total Sales (INR)'] / total_revenue) * 100, 2) if total_revenue > 0 else 0

# Sort DataFrame by Total Sales descending
df_sorted = df.sort_values(by='Total Sales (INR)', ascending=False).reset_index(drop=True)

print("=== FRUIT SHOP SALES DATAFRAME ===")
print(df_sorted.to_string(index=False))
print("-" * 72)

# ------------------------------------------------------------------------------
# SECTION 7: Filtering and Statistical Calculations
# ------------------------------------------------------------------------------
if len(df) > 0:
    total_quantity = np.sum(df['Quantity Sold (kg)'])
    mean_sales = np.mean(df['Total Sales (INR)'])
    median_sales = np.median(df['Total Sales (INR)'])
    std_sales = np.std(df['Total Sales (INR)'])

    highest_row = df.loc[df['Total Sales (INR)'].idxmax()]
    lowest_row = df.loc[df['Total Sales (INR)'].idxmin()]

    # Filter fruits performing above the shop average
    above_avg_df = df[df['Total Sales (INR)'] >= mean_sales]

    # Category-wise aggregation using Pandas groupby
    category_summary = df.groupby('Category', as_index=False).agg(
        Fruit_Count=('Fruit Name', 'count'),
        Total_Quantity_kg=('Quantity Sold (kg)', 'sum'),
        Category_Revenue_INR=('Total Sales (INR)', 'sum')
    ).sort_values(by='Category_Revenue_INR', ascending=False)

    print(f"Total Shop Revenue     : INR {total_revenue:,.2f}")
    print(f"Total Quantity Sold    : {total_quantity:,.2f} kg")
    print(f"Average Sales / Fruit  : INR {mean_sales:,.2f}")
    print(f"Median Sales / Fruit   : INR {median_sales:,.2f}")
    print(f"Std Deviation of Sales : INR {std_sales:,.2f}")
    print(f"Highest-Selling Fruit  : {highest_row['Fruit Name']} (INR {highest_row['Total Sales (INR)']:,.2f} | {highest_row['Revenue Share (%)']:.1f}%)")
    print(f"Lowest-Selling Fruit   : {lowest_row['Fruit Name']} (INR {lowest_row['Total Sales (INR)']:,.2f} | {lowest_row['Revenue Share (%)']:.1f}%)")
    print("-" * 72)
    print("\\n=== CATEGORY-WISE REVENUE BREAKDOWN ===")
    print(category_summary.to_string(index=False))

    # --------------------------------------------------------------------------
    # SECTION 8: Data Visualization using Matplotlib
    # --------------------------------------------------------------------------
    plt.figure(figsize=(11, 6), dpi=120)
    bar_colors = [${colorsList}]

    bars = plt.bar(
        df['Fruit Name'],
        df['Total Sales (INR)'],
        color=bar_colors,
        edgecolor='#1E293B',
        linewidth=1.1,
        width=0.58
    )

    # Plot horizontal average sales benchmark line
    plt.axhline(
        mean_sales,
        color='#0F172A',
        linestyle='--',
        linewidth=1.5,
        label=f'Average Sales (INR {mean_sales:,.0f})'
    )

    # Annotate exact sales figures and highest/lowest tags above each bar
    for idx, bar in enumerate(bars):
        height = bar.get_height()
        fruit_name = df['Fruit Name'].iloc[idx]
        tag = ""
        if fruit_name == highest_row['Fruit Name']:
            tag = " [HIGHEST]"
        elif fruit_name == lowest_row['Fruit Name']:
            tag = " [LOWEST]"
        plt.text(
            bar.get_x() + bar.get_width() / 2.0,
            height + (total_revenue * 0.008),
            f'INR {height:,.0f}{tag}',
            ha='center',
            va='bottom',
            fontsize=9,
            fontweight='bold',
            color='#0F172A'
        )

    plt.title('Fruit Analysis — Total Sales Revenue by Fruit', fontsize=14, fontweight='bold', pad=16)
    plt.xlabel('Fruit Name', fontsize=11, fontweight='bold', labelpad=10)
    plt.ylabel('Total Sales (INR)', fontsize=11, fontweight='bold', labelpad=10)
    plt.grid(axis='y', linestyle=':', alpha=0.6)
    plt.legend(frameon=True, facecolor='white', edgecolor='#CBD5E1')
    plt.tight_layout()

    # Save and display the chart
    plt.savefig('fruit_sales_analysis_chart.png', dpi=150)
    plt.show()
`;
}
