
import { useCallback, useEffect, useState } from "react"
import type {
  FormEvent,
} from "react"

import type {
  SavingsGoal,
  SavingsGoalPayload,
  SavingsMovement,
} from "../types/savingGoal"
import { getAccounts } from "../services/accountApi"
import type { Account } from "../types/account"
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getSavingsMovements,
  createSavingsMovement,
} from "../services/savingsGoalApi"

import "./SavingsGoal.css"

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)

function today() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

interface SavingsGoalsProps {
  onTransactionChange?: () => Promise<void> | void
}

const emptyForm = {
  name: "",
  target_amount: "",
  target_date: "",
  description: "",
}

export default function SavingsGoals({
  onTransactionChange,
}: SavingsGoalsProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null)
  const [movements, setMovements] = useState<SavingsMovement[]>([])
  const [movementType, setMovementType] = useState<
    "deposit" | "withdrawal"
  >("deposit")
  const [movementAmount, setMovementAmount] = useState("")
  const [movementNote, setMovementNote] = useState("")
  const [movementDate, setMovementDate] = useState(today())

  useEffect(() => {
    let cancelled = false

    async function loadAccounts() {
      try {
        setLoadingAccounts(true)

        const data = await getAccounts()

        if (!cancelled) {
          setAccounts(data)

          if (data.length > 0) {
            setSelectedAccountId((current) =>
              current && data.some(
                (account) => String(account.id) === current
              )
                ? current
                : String(data[0].id)
            )
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal mengambil data rekening."
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingAccounts(false)
        }
      }
    }

    void loadAccounts()

    return () => {
      cancelled = true
    }
  }, [])
  const loadGoals = useCallback(async () => {
    try {
      setError("")
      const data = await getSavingsGoals()
      setGoals(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil target tabungan."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")

    const targetAmount = Number(form.target_amount)

    if (
      !form.name.trim() ||
      !Number.isSafeInteger(targetAmount) ||
      targetAmount <= 0
    ) {
      setError("Isi nama dan nominal target dengan benar.")
      return
    }

    const payload: SavingsGoalPayload = {
      name: form.name.trim(),
      target_amount: targetAmount,
      target_date: form.target_date || null,
      description: form.description.trim() || null,
    }

    try {
      setSaving(true)

      if (editingId !== null) {
        await updateSavingsGoal(editingId, payload)
        setSuccess("Target tabungan berhasil diperbarui.")
      } else {
        await createSavingsGoal(payload)
        setSuccess("Target tabungan berhasil dibuat.")
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadGoals()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan target."
      )
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(goal: SavingsGoal) {
    setEditingId(goal.id)
    setForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      target_date: goal.target_date ?? "",
      description: goal.description ?? "",
    })

    setError("")
    setSuccess("")
  }

  async function handleDelete(goal: SavingsGoal) {
    const confirmed = window.confirm(
      `Hapus target "${goal.name}" beserta seluruh riwayat tabungannya?`
    )

    if (!confirmed) return

    try {
      setError("")
      setSuccess("")

      await deleteSavingsGoal(goal.id)
      await onTransactionChange?.()

      if (activeGoal?.id === goal.id) {
        setActiveGoal(null)
        setMovements([])
      }

      if (editingId === goal.id) {
        setEditingId(null)
        setForm(emptyForm)
      }

      setSuccess("Target tabungan berhasil dihapus.")
      await loadGoals()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menghapus target."
      )
    }
  }

  async function handleOpenHistory(goal: SavingsGoal) {
    try {
      setError("")
      setActiveGoal(goal)
      const data = await getSavingsMovements(goal.id)
      setMovements(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil riwayat."
      )
    }
  }


  async function handleMovementSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!activeGoal) return

    const amount = Number(movementAmount)

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Nominal setoran atau penarikan harus lebih dari nol.")
      return
    }

    if (!selectedAccountId) {
      setError("Pilih rekening terlebih dahulu.")
      return
    }

    const selectedAccount = accounts.find(
      (account) => String(account.id) === selectedAccountId
    )

    if (!selectedAccount) {
      setError("Rekening yang dipilih tidak ditemukan.")
      return
    }

    if (
      movementType === "deposit" &&
      amount > Number(selectedAccount.balance)
    ) {
      setError("Saldo rekening tidak mencukupi untuk setoran ini.")
      return
    }

    try {
      setError("")
      setSuccess("")
      setSaving(true)

await createSavingsMovement(activeGoal.id, {
  type: movementType,
  amount,
  note: movementNote.trim() || null,
  movement_date: movementDate,
  account_id: Number(selectedAccountId),
})

      // Perbarui transaksi jika melakukan setoran.
      if (movementType === "deposit") {
        await onTransactionChange?.()
      }

      setMovementAmount("")
      setMovementNote("")
      setMovementDate(today())

      await loadGoals()
      await handleOpenHistory(activeGoal)

      setSuccess(
        movementType === "deposit"
          ? "Setoran berhasil dicatat."
          : "Penarikan berhasil dicatat."
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mencatat pergerakan tabungan."
      )
    } finally {
      setSaving(false)
    }
  }


  const totalTarget = goals.reduce(
    (sum, goal) => sum + goal.target_amount,
    0
  )

  const totalSaved = goals.reduce(
    (sum, goal) => sum + goal.saved_amount,
    0
  )

  return (
    <section className="savings-page">
      <div className="savings-heading">
        <div>
          <span className="savings-eyebrow">FINANCIAL PLANNING</span>
          <h2>Target Tabungan</h2>
          <p>Wujudkan tujuan finansialmu selangkah demi selangkah.</p>
        </div>
        <div className="savings-heading-icon">♧</div>
      </div>

      <div className="savings-overview">
        <article className="savings-overview-card">
          <span>Total target</span>
          <strong>{rupiah(totalTarget)}</strong>
          <small>{goals.length} target tabungan</small>
        </article>

        <article className="savings-overview-card">
          <span>Total terkumpul</span>
          <strong>{rupiah(totalSaved)}</strong>
          <small>Akumulasi seluruh target</small>
        </article>

        <article className="savings-overview-card">
          <span>Belum terkumpul</span>
          <strong>{rupiah(Math.max(totalTarget - totalSaved, 0))}</strong>
          <small>Sisa menuju semua target</small>
        </article>
      </div>

      {error && (
        <div className="savings-alert savings-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="savings-alert savings-alert-success" role="status">
          {success}
        </div>
      )}

      <div className="savings-layout">
        <section className="savings-panel">
          <h3>{editingId !== null ? "Edit Target" : "Buat Target Baru"}</h3>

          <form className="savings-form" onSubmit={handleSubmit}>
            <label>
              Nama target
              <input
                value={form.name}
                maxLength={150}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Contoh: Beli laptop"
                required
              />
            </label>

            <label>
              Nominal tujuan (Rp)
              <input
                type="number"
                min="1"
                step="1"
                value={form.target_amount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    target_amount: event.target.value,
                  })
                }
                placeholder="5000000"
                required
              />
            </label>

            <label>
              Tanggal target (opsional)
              <input
                type="date"
                value={form.target_date}
                onChange={(event) =>
                  setForm({ ...form, target_date: event.target.value })
                }
              />
            </label>

            <label>
              Catatan (opsional)
              <textarea
                value={form.description}
                maxLength={500}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Tulis catatan untuk target ini"
                rows={3}
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving
                ? "Menyimpan..."
                : editingId !== null
                  ? "Simpan Perubahan"
                  : "＋ Buat Target"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="savings-secondary-button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
              >
                Batal Edit
              </button>
            )}
          </form>
        </section>

        <section className="savings-panel">
          <div className="savings-list-heading">
            <h3>Daftar Target</h3>
            <span>{goals.length} target</span>
          </div>

          {loading ? (
            <p className="savings-empty">Memuat target tabungan...</p>
          ) : goals.length === 0 ? (
            <div className="savings-empty">
              <span className="savings-empty-icon">◎</span>
              <strong>Belum ada target tabungan</strong>
              <p>Buat target pertama kamu melalui form di samping.</p>
            </div>
          ) : (
            <div className="savings-goal-list">
              {goals.map((goal) => {
                const progress = Math.max(0, goal.progress)
                const barWidth = Math.min(progress, 100)

                return (
                  <article className="savings-goal-card" key={goal.id}>
                    <div className="savings-goal-top">
                      <div>
                        <h4>{goal.name}</h4>
                        {goal.target_date && (
                          <small>Target: {goal.target_date}</small>
                        )}
                      </div>

                      <span
                        className={`savings-status ${goal.is_completed ? "completed" : ""
                          }`}
                      >
                        {goal.is_completed ? "Tercapai" : "Berjalan"}
                      </span>
                    </div>

                    {goal.description && (
                      <p className="savings-description">
                        {goal.description}
                      </p>
                    )}

                    <div className="savings-progress-info">
                      <span>{rupiah(goal.saved_amount)} terkumpul</span>
                      <strong>{progress.toFixed(1)}%</strong>
                    </div>

                    <div
                      className="savings-progress-track"
                      role="progressbar"
                      aria-label={`Progress ${goal.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={barWidth}
                    >
                      <div
                        className={`savings-progress-fill ${goal.is_completed ? "completed" : ""
                          }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="savings-goal-bottom">
                      <span>
                        {goal.is_completed
                          ? `Target tercapai · ${rupiah(goal.saved_amount - goal.target_amount)} lebih`
                          : `Sisa ${rupiah(goal.remaining_amount)}`}
                      </span>
                      <span>Target {rupiah(goal.target_amount)}</span>
                    </div>

                    <div className="savings-goal-actions">
                      <button
                        type="button"
                        onClick={() => void handleOpenHistory(goal)}
                      >
                        Setor / Riwayat
                      </button>
                      <button
                        type="button"
                        className="savings-secondary-button"
                        onClick={() => handleEdit(goal)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="savings-danger-button"
                        onClick={() => void handleDelete(goal)}
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {activeGoal && (
        <section className="savings-panel savings-history-panel">
          <div className="savings-list-heading">
            <div>
              <h3>Setoran dan Riwayat</h3>
              <p>{activeGoal.name}</p>
            </div>
            <button
              type="button"
              className="savings-secondary-button"
              onClick={() => {
                setActiveGoal(null)
                setMovements([])
              }}
            >
              Tutup
            </button>
          </div>

          <form
            className="savings-movement-form"
            onSubmit={handleMovementSubmit}
          >
            <label>
              Jenis
              <select
                value={movementType}
                onChange={(event) =>
                  setMovementType(
                    event.target.value as "deposit" | "withdrawal"
                  )
                }
              >
                <option value="deposit">Setoran</option>
                <option value="withdrawal">Penarikan</option>
              </select>
            </label>

            <label>
              Rekening sumber
              <select
                value={selectedAccountId}
                onChange={(event) =>
                  setSelectedAccountId(event.target.value)
                }
                disabled={loadingAccounts || accounts.length === 0}
                required
              >
                <option value="">
                  {loadingAccounts
                    ? "Memuat rekening..."
                    : "Pilih rekening"}
                </option>

                {accounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.name} — Saldo{" "}
                    {rupiah(Number(account.balance) || 0)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nominal (Rp)
              <input
                type="number"
                min="1"
                step="1"
                value={movementAmount}
                onChange={(event) => setMovementAmount(event.target.value)}
                placeholder="100000"
                required
              />
            </label>

            <label>
              Tanggal
              <input
                type="date"
                value={movementDate}
                onChange={(event) => setMovementDate(event.target.value)}
                required
              />
            </label>

            <label>
              Catatan
              <input
                value={movementNote}
                maxLength={255}
                onChange={(event) => setMovementNote(event.target.value)}
                placeholder="Contoh: Sisihan gaji"
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Catat"}
            </button>
          </form>

          <div className="savings-history">
            {movements.length === 0 ? (
              <p className="savings-empty">Belum ada riwayat tabungan.</p>
            ) : (
              movements.map((movement) => (
                <div className="savings-movement-row" key={movement.id}>
                  <div>
                    <strong>
                      {movement.type === "deposit" ? "＋ Setoran" : "− Penarikan"}
                    </strong>
                    <small>
                      {movement.movement_date}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </small>
                  </div>
                  <strong
                    className={
                      movement.type === "deposit"
                        ? "movement-positive"
                        : "movement-negative"
                    }
                  >
                    {movement.type === "deposit" ? "+" : "−"}
                    {rupiah(movement.amount)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </section>
  )
}
