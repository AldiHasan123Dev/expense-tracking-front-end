
import type {
  Account,
  AccountPayload,
  TransferPayload,
} from "../types/account"

const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"
).replace(/\/$/, "")

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Permintaan gagal diproses."

    throw new Error(message)
  }

  return data as T
}

export const getAccounts = () =>
  request<Account[]>("/accounts")

export const createAccount = (payload: AccountPayload) =>
  request<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const updateAccount = (
  id: number,
  payload: AccountPayload,
) =>
  request<{ id: number; name: string; type: Account["type"] }>(
    `/accounts/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  )

export const deleteAccount = (id: number) =>
  request<{ message: string }>(`/accounts/${id}`, {
    method: "DELETE",
  })

export const transferAccountBalance = (payload: TransferPayload) =>
  request<{
    id: number
    from_account_id: number
    to_account_id: number
    amount: number
    transfer_date: string
  }>("/accounts/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
  })
