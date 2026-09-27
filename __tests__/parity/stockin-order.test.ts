import { describe, expect, it } from 'vitest';
import { inEnteredOrder } from '@/features/stockin/useStockIn';

/** Mirror of web whModal.js's lot order (66b06dd7) — verbatim. */
const webOrder = (stockData: any[], stock: string[]) => {
  const entered = new Map(stock.map((id, i) => [id, i]));
  const place = (row: any) => entered.get(row.id) ?? entered.size;
  return [...stockData].sort((a, b) => place(a) - place(b));
};

describe('Stock-in keeps lots in the order they were entered (client rule)', () => {
  // Firestore hands lots back by random document id; every save writes contract.stock[]
  // from the rows as they stand on screen.
  const stock = ['c', 'a', 'b'];
  const fromFirestore = [
    { id: 'a', indDate: { endDate: '2026-01-01' } },
    { id: 'b', indDate: { endDate: '2026-01-01' } },
    { id: 'z', indDate: { endDate: '2025-01-01' } }, // not in stock[] — goes last
    { id: 'c', indDate: { endDate: '2026-06-01' } },
  ];

  it('follows contract.stock[], not the arrival date', () => {
    expect(inEnteredOrder(fromFirestore, stock).map((l) => l.id)).toEqual(['c', 'a', 'b', 'z']);
  });

  it('matches web exactly', () => {
    expect(inEnteredOrder(fromFirestore, stock)).toEqual(webOrder(fromFirestore, stock));
  });

  it('does not reorder the input array in place', () => {
    const copy = [...fromFirestore];
    inEnteredOrder(fromFirestore, stock);
    expect(fromFirestore).toEqual(copy);
  });
});
