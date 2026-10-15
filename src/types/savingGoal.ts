
export interface SavingsGoal {
  id: number
  name: string
  target_amount: number
  target_date: string | null
  description: string | null
  saved_amount: number
  remaining_amount: number
  progress: number
  is_completed: boolean
}

export interface SavingsMovement {
  id: number
  goal_id: number
  type: "deposit" | "withdrawal"
  amount: number
  note: string | null
  movement_date: string
}

export interface SavingsGoalPayload {
  name: string
  target_amount: number
  target_date: string | null
  description: string | null
}

export interface SavingsMovementPayload {
  type: "deposit" | "withdrawal"
  amount: number
  note: string | null
  movement_date: string
}
