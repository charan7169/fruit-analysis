import React, { useRef, useCallback } from 'react';
import { Download, Award, AlertTriangle } from 'lucide-react';
import { ComputedFruitSale, SalesSummaryMetrics, formatInr } from '../utils/salesAnalytics';

interface MatplotlibBarChart2DProps {
  rows: ComputedFruitSale[];
  metrics: SalesSummaryMetrics;
  selectedFruitId: string | null;
  onSelectFruit: (id: string) => void;
}

export const MatplotlibBarChart2D: React.FC<MatplotlibBarChart2DProps> = ({
  rows,
  metrics,
  selectedFruitId,
  onSelectFruit,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const maxSales = Math.max(...rows.map((r) => r.totalSalesInr), 1000);
  const yAxisMax = Math.ceil((maxSales * 1.18) / 2000) * 2000;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yAxisMax * t));

  const handleExportPng = useCallback(() => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 680;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White Matplotlib figure background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 110;
    const padRight = 60;
    const padTop = 90;
    const padBottom = 110;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Title & Subtitle
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Group-5: Fruit Shop Sales Analysis — Total Revenue by Fruit (INR)',
      width / 2,
      42
    );

    ctx.fillStyle = '#475569';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText(
      `Total Revenue: ${formatInr(metrics.totalRevenueInr)} | Average: ${formatInr(metrics.averageSalesInr)} | Highest: ${metrics.highestSelling?.fruitName ?? 'N/A'} | Lowest: ${metrics.lowestSelling?.fruitName ?? 'N/A'}`,
      width / 2,
      68
    );

    // Plot border box (Matplotlib axes spine style)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Horizontal dotted grid lines & Y ticks
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach((tickVal) => {
      const y = padTop + plotH - (tickVal / yAxisMax) * plotH;
      ctx.strokeStyle = '#CBD5E1';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#334155';
      ctx.fillText(`₹${tickVal.toLocaleString('en-IN')}`, padLeft - 12, y);
    });

    // Draw bars
    const count = Math.max(rows.length, 1);
    const slotW = plotW / count;
    const barW = Math.min(72, slotW * 0.58);

    rows.forEach((row, idx) => {
      const xCenter = padLeft + idx * slotW + slotW / 2;
      const barH = (row.totalSalesInr / yAxisMax) * plotH;
      const x = xCenter - barW / 2;
      const y = padTop + plotH - barH;

      ctx.fillStyle = row.colorHex;
      ctx.fillRect(x, y, barW, barH);

      ctx.strokeStyle = row.isHighest ? '#047857' : row.isLowest ? '#BE123C' : '#1E293B';
      ctx.lineWidth = row.isHighest || row.isLowest ? 2.5 : 1.2;
      ctx.strokeRect(x, y, barW, barH);

      // Value label on top
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`₹${row.totalSalesInr.toLocaleString('en-IN')}`, xCenter, y - 6);

      if (row.isHighest || row.isLowest) {
        ctx.fillStyle = row.isHighest ? '#047857' : '#BE123C';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(row.isHighest ? '[HIGHEST]' : '[LOWEST]', xCenter, y - 22);
      }

      // X-axis fruit label
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(row.fruitName, xCenter, padTop + plotH + 14);

      ctx.fillStyle = '#64748B';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(`${row.quantityKg}kg × ₹${row.unitPriceInr}`, xCenter, padTop + plotH + 34);
    });

    // Mean line
    if (metrics.averageSalesInr > 0) {
      const meanY = padTop + plotH - (metrics.averageSalesInr / yAxisMax) * plotH;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(padLeft, meanY);
      ctx.lineTo(padLeft + plotW, meanY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        `Mean Sales Benchmark: ${formatInr(metrics.averageSalesInr)}`,
        padLeft + plotW - 10,
        meanY - 6
      );
    }

    // Axis titles
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fruit Varieties (Category & Unit Breakdown)', width / 2, height - 24);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'fruit_sales_matplotlib_chart.png';
    link.href = dataUrl;
    link.click();
  }, [rows, metrics, yAxisMax, yTicks]);

  if (rows.length === 0) {
    return (
      <div className="h-[520px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-base font-semibold text-slate-700">No Fruit Records Match Active Filters</p>
        <p className="text-xs text-slate-500 mt-1">
          Adjust your search query, category filter, or minimum sales slider to display the 2D Matplotlib chart.
        </p>
      </div>
    );
  }

  const svgWidth = 960;
  const svgHeight = 460;
  const padLeft = 88;
  const padRight = 36;
  const padTop = 48;
  const padBottom = 76;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const slotW = plotW / rows.length;
  const barW = Math.min(60, slotW * 0.56);
  const meanY = padTop + plotH - (metrics.averageSalesInr / yAxisMax) * plotH;

  return (
    <div
      data-testid="matplotlib-2d-chart"
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
    >
      {/* Matplotlib Figure Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Matplotlib Figure 1
            </span>
            <h3 className="text-base font-bold text-slate-900">
              2D Bar Chart — Fruit Shop Sales Revenue (₹)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any bar to inspect item breakdown · Dashed line shows shop mean ({formatInr(metrics.averageSalesInr)})
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPng}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export PNG Chart
        </button>
      </div>

      {/* Responsive SVG Matplotlib Plot */}
      <div className="w-full overflow-x-auto my-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[640px] select-none"
          role="img"
          aria-label="2D Bar Chart of Fruit Shop Sales in INR"
        >
          {/* Plot Background */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="#FAFAFA"
            stroke="#334155"
            strokeWidth={1.25}
          />

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = padTop + plotH - (tick / yAxisMax) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  stroke="#CBD5E1"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] font-mono fill-slate-600"
                >
                  ₹{tick.toLocaleString('en-IN')}
                </text>
              </g>
            );
          })}

          {/* Y-Axis Title */}
          <text
            transform={`translate(22, ${padTop + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="text-xs font-bold fill-slate-800"
          >
            Total Sales Revenue (INR ₹)
          </text>

          {/* Bars */}
          {rows.map((row, idx) => {
            const xCenter = padLeft + idx * slotW + slotW / 2;
            const barH = Math.max(4, (row.totalSalesInr / yAxisMax) * plotH);
            const x = xCenter - barW / 2;
            const y = padTop + plotH - barH;
            const isSelected = row.id === selectedFruitId;

            return (
              <g
                key={row.id}
                onClick={() => onSelectFruit(row.id)}
                className="cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label={`${row.fruitName}: Total sales ${formatInr(row.totalSalesInr)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectFruit(row.id);
                  }
                }}
              >
                {/* Highlight Halo for Highest / Lowest / Selected */}
                {(row.isHighest || row.isLowest || isSelected) && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={barW + 6}
                    height={barH + 3}
                    rx={4}
                    fill="none"
                    stroke={
                      isSelected
                        ? '#0F172A'
                        : row.isHighest
                        ? '#10B981'
                        : '#F43F5E'
                    }
                    strokeWidth={2}
                    strokeDasharray={row.isLowest && !isSelected ? '4 2' : undefined}
                  />
                )}

                {/* Main Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={row.colorHex}
                  stroke="#1E293B"
                  strokeWidth={1.2}
                  className="transition-opacity group-hover:opacity-85"
                />

                {/* Highest / Lowest Tag Pill above Bar */}
                {row.isHighest && (
                  <g transform={`translate(${xCenter}, ${y - 26})`}>
                    <rect
                      x={-34}
                      y={-12}
                      width={68}
                      height={16}
                      rx={4}
                      fill="#059669"
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-white tracking-wider"
                    >
                      ★ HIGHEST
                    </text>
                  </g>
                )}

                {row.isLowest && (
                  <g transform={`translate(${xCenter}, ${y - 26})`}>
                    <rect
                      x={-32}
                      y={-12}
                      width={64}
                      height={16}
                      rx={4}
                      fill="#E11D48"
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-white tracking-wider"
                    >
                      ▼ LOWEST
                    </text>
                  </g>
                )}

                {/* Direct Value Label (offset slightly higher if near dashed mean line) */}
                <text
                  x={xCenter}
                  y={Math.abs(y - 7 - meanY) < 11 ? meanY - 12 : y - 7}
                  textAnchor="middle"
                  className="text-[11px] font-mono font-bold fill-slate-900"
                >
                  ₹{row.totalSalesInr.toLocaleString('en-IN')}
                </text>

                {/* X-Axis Fruit Name */}
                <text
                  x={xCenter}
                  y={padTop + plotH + 20}
                  textAnchor="middle"
                  className="text-xs font-bold fill-slate-900"
                >
                  {row.fruitName}
                </text>

                {/* Sub-label: Qty * Price */}
                <text
                  x={xCenter}
                  y={padTop + plotH + 36}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-slate-500"
                >
                  {row.quantityKg}kg × ₹{row.unitPriceInr}
                </text>

                {/* Share % */}
                <text
                  x={xCenter}
                  y={padTop + plotH + 50}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-semibold fill-slate-600"
                >
                  ({row.revenueSharePct.toFixed(1)}%)
                </text>
              </g>
            );
          })}

          {/* Average Sales Benchmark Line */}
          {metrics.averageSalesInr > 0 && meanY >= padTop && meanY <= padTop + plotH && (
            <g>
              <line
                x1={padLeft}
                y1={meanY}
                x2={padLeft + plotW}
                y2={meanY}
                stroke="#0F172A"
                strokeWidth={1.75}
                strokeDasharray="7 5"
              />
              <rect
                x={padLeft + plotW - 195}
                y={meanY - 22}
                width={188}
                height={18}
                rx={4}
                fill="#0F172A"
              />
              <text
                x={padLeft + plotW - 101}
                y={meanY - 10}
                textAnchor="middle"
                className="text-[10px] font-mono font-semibold fill-white"
              >
                Mean: {formatInr(metrics.averageSalesInr)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Matplotlib Legend Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            Highest Bar: <strong>{metrics.highestSelling?.fruitName ?? 'N/A'}</strong> ({metrics.highestSelling ? formatInr(metrics.highestSelling.totalSalesInr) : '₹0'})
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Lowest Bar: <strong>{metrics.lowestSelling?.fruitName ?? 'N/A'}</strong> ({metrics.lowestSelling ? formatInr(metrics.lowestSelling.totalSalesInr) : '₹0'})
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          plt.bar(df[&apos;Fruit Name&apos;], df[&apos;Total Sales (INR)&apos;])
        </span>
      </div>
    </div>
  );
};
