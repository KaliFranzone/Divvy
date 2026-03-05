export interface Group {
  id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  invite_code: string
  created_at: string
}

export interface Member {
  id: string
  group_id: string
  name: string
  avatar_color: string
  created_at: string
}

export type ExpenseCategory =
  | 'comida'
  | 'super'
  | 'nafta'
  | 'alquiler'
  | 'salida'
  | 'otro'

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  comida: 'Comida',
  super: 'Supermercado',
  nafta: 'Nafta',
  alquiler: 'Alquiler',
  salida: 'Salida',
  otro: 'Otro',
}

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  comida: 'UtensilsCrossed',
  super: 'ShoppingCart',
  nafta: 'Fuel',
  alquiler: 'Home',
  salida: 'PartyPopper',
  otro: 'Receipt',
}

export interface Expense {
  id: string
  group_id: string
  description: string
  amount: number // en centavos
  paid_by: string
  category: ExpenseCategory
  created_at: string
  // joins
  paid_by_member?: Member
  splits?: ExpenseSplit[]
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  member_id: string
  amount: number // en centavos
  member?: Member
}

export interface Transfer {
  from: string
  to: string
  amount: number // en centavos
}
