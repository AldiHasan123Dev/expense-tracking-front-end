export interface Budget {
  id: number
  month: string
  category: string
  limit_amount: number
  spent_amount: number
}

export type BudgetPayload = Pick<Budget, "month" | "category" | "limit_amount">
