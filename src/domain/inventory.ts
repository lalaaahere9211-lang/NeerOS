import { StockMovement } from '../types/domain';

/**
 * Inventory stock calculations
 * Product Stock = Opening Stock + sum of movement deltas
 */

export function calculateCurrentStock(
  openingStock: number,
  movements: Array<{ delta: number }>
): number {
  const totalDelta = movements.reduce((acc, mov) => acc + mov.delta, 0);
  return openingStock + totalDelta;
}

export function isLowStock(stockQuantity: number, lowStockThreshold: number): boolean {
  return stockQuantity <= lowStockThreshold;
}
