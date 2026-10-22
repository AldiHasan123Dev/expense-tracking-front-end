export interface Transaction {
  id: number
  title: string
  amount: number
  type: "income" | "expense"
  category: string
  date: string
  account_id: number
  account_name?: string
}