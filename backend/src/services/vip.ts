/**
 * Helpers de lógica VIP centralizada.
 * NUNCA confiar en el frontend: siempre validar aquí.
 */

export function isVIP(cliente: { esVIP: boolean }): boolean {
  return cliente.esVIP;
}

/** Solo usuarios VIP pueden ver el ICC */
export function canViewICC(cliente: { esVIP: boolean }): boolean {
  return cliente.esVIP;
}

/**
 * Ventana mínima de cancelación en minutos.
 * STANDARD: 2 horas (120 min)
 * VIP: 30 minutos
 */
export function getCancelationWindow(cliente: { esVIP: boolean }): number {
  return cliente.esVIP ? 30 : 120;
}
