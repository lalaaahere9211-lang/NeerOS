import { JarMovement } from '../types/domain';

/**
 * Jar Ledger Invariants
 * Physical returnable containers are tracked separately from money balances.
 * Customer Jar Balance = Opening Jars + Delivered - Collected + Authorized Adjustments
 */

export function calculateCustomerJarBalance(
  openingJars: number,
  movements: Array<{ movement_type: string; quantity: number }>
): number {
  let held = openingJars;

  for (const mov of movements) {
    switch (mov.movement_type) {
      case 'DELIVERY_DELIVERED':
        held += mov.quantity;
        break;
      case 'DELIVERY_COLLECTED':
        held -= mov.quantity;
        break;
      case 'DAMAGE':
      case 'LOST':
      case 'WRITE_OFF':
        // If customer lost/damaged the jar in their possession, it is removed from their held balance
        held -= mov.quantity;
        break;
      case 'AUDIT_ADJUSTMENT':
        held += mov.quantity; // delta can be positive or negative
        break;
    }
  }

  return Math.max(0, held);
}

/**
 * Calculates empty jars present in the warehouse/godown.
 * Warehouse Empties = Initial Empties + Empties collected from all customers - Plant sent - Damaged + Adjustments
 */
export function calculateWarehouseEmptyJars(
  initialWarehouseEmpties: number,
  allMovements: Array<{ movement_type: string; quantity: number }>
): number {
  let warehouseEmpties = initialWarehouseEmpties;

  for (const mov of allMovements) {
    if (mov.movement_type === 'DELIVERY_COLLECTED') {
      // Empty jar collected from customer returns to godown
      warehouseEmpties += mov.quantity;
    } else if (mov.movement_type === 'DAMAGE' || mov.movement_type === 'WRITE_OFF') {
      // Broken/cracked empty jar discarded
      warehouseEmpties -= mov.quantity;
    }
  }

  return Math.max(0, warehouseEmpties);
}
