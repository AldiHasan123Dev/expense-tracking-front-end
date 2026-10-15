import type { Budget, BudgetPayload } from "../types/budget"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(
      errorData?.message ?? `Permintaan API gagal dengan status ${response.status}`
    )
  }

  return response.json() as Promise<T>
}

export function getBudgets(month: string): Promise<Budget[]> {
  return request<Budget[]>(`/budgets?month=${encodeURIComponent(month)}`)
}

export function saveBudget(payload: BudgetPayload): Promise<Budget> {
  return request<Budget>("/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function deleteBudget(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/budgets/${id}`, { method: "DELETE" })
}
