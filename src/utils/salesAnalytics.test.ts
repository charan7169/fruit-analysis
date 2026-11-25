import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FRUIT_DATASET,
  computeSalesAnalytics,
  filterAndSortRows,
  parseFruitCsv,
  exportFruitCsv,
  generatePythonLabCode,
} from './salesAnalytics';

test('computeSalesAnalytics dynamically calculates totals, revenue, average, highest and lowest fruit', () => {
  const { computedRows, metrics } = computeSalesAnalytics(INITIAL_FRUIT_DATASET);

  assert.equal(computedRows.length, 8);
  assert.equal(metrics.fruitCount, 8);

  // Verify individual fruit total sales: Mango = 95 * 140 = 13300, Watermelon = 110 * 35 = 3850
  const mango = computedRows.find((r) => r.fruitName === 'Mango');
  const watermelon = computedRows.find((r) => r.fruitName === 'Watermelon');
  assert.ok(mango);
  assert.ok(watermelon);
  assert.equal(mango.totalSalesInr, 13300);
  assert.equal(watermelon.totalSalesInr, 3850);

  // Verify overall revenue sum:
  // Mango: 13300, Apple: 11520, Banana: 5750, Orange: 7140, Grapes: 7040, Pineapple: 4680, Strawberry: 9120, Watermelon: 3850
  // Sum = 62,400
  assert.equal(metrics.totalRevenueInr, 62400);
  assert.equal(metrics.totalQuantityKg, 95 + 72 + 115 + 84 + 64 + 52 + 38 + 110); // 630 kg
  assert.equal(metrics.averageSalesInr, 62400 / 8); // 7800

  // Verify highest and lowest detection
  assert.ok(metrics.highestSelling);
  assert.equal(metrics.highestSelling.fruitName, 'Mango');
  assert.equal(metrics.highestSelling.totalSalesInr, 13300);
  assert.equal(metrics.highestSelling.isHighest, true);

  assert.ok(metrics.lowestSelling);
  assert.equal(metrics.lowestSelling.fruitName, 'Watermelon');
  assert.equal(metrics.lowestSelling.totalSalesInr, 3850);
  assert.equal(metrics.lowestSelling.isLowest, true);
});

test('filterAndSortRows filters by search query, category, minTotalSales and sorts accurately', () => {
  const { computedRows } = computeSalesAnalytics(INITIAL_FRUIT_DATASET);

  const tropicalOnly = filterAndSortRows(computedRows, {
    searchQuery: '',
    category: 'Tropical',
    minTotalSales: 0,
    sortField: 'totalSalesInr',
    sortDirection: 'desc',
  });

  assert.equal(tropicalOnly.length, 3); // Mango, Pineapple, Watermelon
  assert.equal(tropicalOnly[0].fruitName, 'Mango');
  assert.equal(tropicalOnly[2].fruitName, 'Watermelon');

  const highSalesOnly = filterAndSortRows(computedRows, {
    searchQuery: '',
    category: 'All',
    minTotalSales: 9000,
    sortField: 'totalSalesInr',
    sortDirection: 'asc',
  });

  assert.equal(highSalesOnly.length, 3); // Strawberry (9120), Apple (11520), Mango (13300)
  assert.equal(highSalesOnly[0].fruitName, 'Strawberry');
  assert.equal(highSalesOnly[2].fruitName, 'Mango');
});

test('parseFruitCsv and exportFruitCsv round-trip CSV dataset properly', () => {
  const sampleCsv = `Fruit Name,Category,Quantity Sold (kg),Unit Price (INR)
Mango,Tropical,100,150
Kiwi,Tropical,40,200
Orange,Citrus,80,75`;

  const { entries, error } = parseFruitCsv(sampleCsv);
  assert.equal(error, null);
  assert.equal(entries.length, 3);

  const { computedRows, metrics } = computeSalesAnalytics(entries);
  assert.equal(metrics.totalRevenueInr, 100 * 150 + 40 * 200 + 80 * 75); // 15000 + 8000 + 6000 = 29000
  assert.equal(metrics.highestSelling?.fruitName, 'Mango');
  assert.equal(metrics.lowestSelling?.fruitName, 'Orange');

  const exported = exportFruitCsv(computedRows);
  assert.ok(exported.includes('Fruit Name,Category,Quantity Sold (kg)'));
  assert.ok(exported.includes('"Mango",Tropical,100,150,15000.00'));
});

test('generatePythonLabCode produces valid Python script with active dataset values', () => {
  const { computedRows, metrics } = computeSalesAnalytics(INITIAL_FRUIT_DATASET);
  const code = generatePythonLabCode(computedRows, metrics);

  assert.ok(code.includes('import numpy as np'));
  assert.ok(code.includes('import pandas as pd'));
  assert.ok(code.includes('import matplotlib.pyplot as plt'));
  assert.ok(code.includes("'Mango'"));
  assert.ok(code.includes("'Watermelon'"));
});
