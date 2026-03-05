/**
 * Genera un código de invitación aleatorio de 6 caracteres (letras mayúsculas y números).
 */
export function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin I, O, 0, 1 para evitar confusión
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Formatea centavos como moneda ARS.
 * Ej: 150000 → "$1.500"
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Convierte pesos a centavos.
 * Ej: 1500 → 150000
 */
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100)
}

/**
 * Convierte centavos a pesos.
 * Ej: 150000 → 1500
 */
export function centsToPesos(cents: number): number {
  return cents / 100
}

/**
 * Colores para avatares de miembros.
 */
export const AVATAR_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#ea580c', // orange
  '#9333ea', // purple
  '#0891b2', // cyan
  '#e11d48', // rose
  '#ca8a04', // yellow
]

/**
 * Formatea una fecha ISO a formato legible.
 */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

/**
 * Algoritmo de transferencias mínimas para saldar deudas.
 * Recibe un mapa de member_id -> balance neto (positivo = le deben, negativo = debe).
 * Devuelve la lista mínima de transferencias.
 */
export function calculateMinTransfers(
  balances: Map<string, number>
): { from: string; to: string; amount: number }[] {
  const debtors: { id: string; amount: number }[] = []
  const creditors: { id: string; amount: number }[] = []

  balances.forEach((balance, id) => {
    if (balance < -0.01) {
      debtors.push({ id, amount: -balance })
    } else if (balance > 0.01) {
      creditors.push({ id, amount: balance })
    }
  })

  // Ordenar de mayor a menor para optimizar
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const transfers: { from: string; to: string; amount: number }[] = []

  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const transferAmount = Math.min(debtors[i].amount, creditors[j].amount)
    transfers.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: Math.round(transferAmount),
    })
    debtors[i].amount -= transferAmount
    creditors[j].amount -= transferAmount

    if (debtors[i].amount < 0.01) i++
    if (creditors[j].amount < 0.01) j++
  }

  return transfers
}
