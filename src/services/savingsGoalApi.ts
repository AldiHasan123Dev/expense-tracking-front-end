
import type {
  SavingsGoal,
  SavingsMovement,
  SavingsGoalPayload,
  SavingsMovementPayload,
} from "../types/savingGoal"

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "")

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message || "Terjadi kesalahan saat mengakses API."
    )
  }

  return data as T
}

export function getSavingsGoals(): Promise<SavingsGoal[]> {
  return request<SavingsGoal[]>("/api/savings-goals")
}

export function createSavingsGoal(
  payload: SavingsGoalPayload
): Promise<SavingsGoal> {
  return request<SavingsGoal>("/api/savings-goals", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateSavingsGoal(
  id: number,
  payload: SavingsGoalPayload
): Promise<{ message: string }> {
  return request(`/api/savings-goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function deleteSavingsGoal(
  id: number
): Promise<{ message: string }> {
  return request(`/api/savings-goals/${id}`, {
    method: "DELETE",
  })
}

export function getSavingsMovements(
  goalId: number
): Promise<SavingsMovement[]> {
  return request<SavingsMovement[]>(
    `/api/savings-goals/${goalId}/movements`
  )
}

export function createSavingsMovement(
  goalId: number,
  payload: SavingsMovementPayload
): Promise<SavingsMovement> {
  return request<SavingsMovement>(
    `/api/savings-goals/${goalId}/movements`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}
