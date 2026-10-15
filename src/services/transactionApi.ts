
import type { Transaction } from "../types/transaction"

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"

type TransactionPayload = Omit<Transaction, "id">

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
      errorData?.message ??
        `Permintaan API gagal dengan status ${response.status}`
    )
  }

  return response.json() as Promise<T>
}

export function getTransactions(): Promise<Transaction[]> {
  return request<Transaction[]>("/transactions")
}

export function createTransaction(
  data: TransactionPayload
): Promise<Transaction> {
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateTransaction(
  id: number,
  data: TransactionPayload
): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export function deleteTransaction(id: number): Promise<{
  message: string
}> {
  return request<{ message: string }>(`/transactions/${id}`, {
    method: "DELETE",
  })
}
