
export type AccountType = "cash" | "ewallet" | "bank"

export interface Account {
  id: number
  name: string
  type: AccountType
  balance: number
}

export interface AccountPayload {
  name: string
  type: AccountType
}

export interface TransferPayload {
  from_account_id: number
  to_account_id: number
  amount: number
  note?: string | null
  transfer_date: string
}
