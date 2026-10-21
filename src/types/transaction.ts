export interface Transaction {
  id: number
  title: string
  amount: number
  type: "income" | "expense"
  category: string
  account_id: number
  date: string
}