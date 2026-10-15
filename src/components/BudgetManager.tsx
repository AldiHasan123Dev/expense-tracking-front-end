import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { Transaction } from "../types/transaction"
import type { Budget } from "../types/budget.js"
import {
  deleteBudget,
  getBudgets,
  saveBudget,
} from "../services/budgetApi"
import "./BudgetManager.css"

interface BudgetManagerProps {
  transactions: Transaction[]
  mode?: "summary" | "full"
}

function currentMonth() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(amount: number | string) {
  if (amount === "") return ""

  const parsed = Number(amount)

  if (!Number.isFinite(parsed)) return ""

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(parsed)
}

export default function BudgetManager({
  transactions,
  mode = "full",
}: BudgetManagerProps) {
  const [month, setMonth] = useState(currentMonth)
  const [category, setCategory] = useState("")
  const [limitAmount, setLimitAmount] = useState("")
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const isSummaryMode = mode === "summary"

  const expenseCategories = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .filter((transaction) => transaction.type === "expense")
            .map((transaction) => transaction.category.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "id")),
    [transactions]
  )

  const totalIncome = useMemo(() => {
    return transactions
      .filter((transaction) => {
        return (
          transaction.type === "income" &&
          transaction.date.startsWith(month)
        )
      })
      .reduce((total, transaction) => {
        return total + Number(transaction.amount)
      }, 0)
  }, [transactions, month])

  useEffect(() => {
    let active = true

    async function loadBudgets() {
      setIsLoading(true)
      setError("")

      try {
        const data = await getBudgets(month)

        if (active) {
          setBudgets(data)
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal mengambil anggaran."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadBudgets()

    return () => {
      active = false
    }
  }, [month, transactions])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")

    const parsedLimit = Number(limitAmount)

    if (!category.trim()) {
      setError("Kategori pengeluaran wajib diisi.")
      return
    }

    if (!Number.isSafeInteger(parsedLimit) || parsedLimit <= 0) {
      setError("Batas anggaran harus berupa angka bulat lebih dari 0.")
      return
    }

    setIsSaving(true)

    const existingBudget = budgets.find(
      (budget) => budget.category === category.trim()
    )

    const currentBudgetTotal = budgets.reduce(
      (total, budget) => total + Number(budget.limit_amount),
      0
    )

    const previousLimit = existingBudget
      ? Number(existingBudget.limit_amount)
      : 0

    const newBudgetTotal =
      currentBudgetTotal - previousLimit + parsedLimit

    if (newBudgetTotal > totalIncome) {
      setError(
        `Total anggaran tidak boleh melebihi pemasukan bulan ini (${formatRupiah(totalIncome)}). Sisa anggaran yang tersedia ${formatRupiah(Math.max(0, totalIncome - currentBudgetTotal + previousLimit))}.`
      )
      return
    }

    try {
      const saved = await saveBudget({
        month,
        category: category.trim(),
        limit_amount: parsedLimit,
      })

      setBudgets((previous) => {
        const existing = previous.some(
          (budget) => budget.id === saved.id
        )

        return existing
          ? previous.map((budget) =>
            budget.id === saved.id ? saved : budget
          )
          : [...previous, saved].sort((a, b) =>
            a.category.localeCompare(b.category, "id")
          )
      })

      setNotice(
        `Anggaran kategori “${saved.category}” berhasil disimpan.`
      )
      setLimitAmount("")
      setCategory("")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Gagal menyimpan anggaran."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(budget: Budget) {
    const confirmed = window.confirm(
      `Hapus anggaran ${budget.category} untuk ${budget.month}?`
    )

    if (!confirmed) return

    setError("")
    setNotice("")

    try {
      await deleteBudget(budget.id)

      setBudgets((previous) =>
        previous.filter((item) => item.id !== budget.id)
      )

      setNotice(
        `Anggaran kategori “${budget.category}” berhasil dihapus.`
      )
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus anggaran."
      )
    }
  }

  const totalLimit = budgets.reduce(
    (sum, budget) => sum + Number(budget.limit_amount),
    0
  )

  const totalSpent = budgets.reduce(
    (sum, budget) => sum + Number(budget.spent_amount),
    0
  )

  const totalPercent =
    totalLimit > 0
      ? Math.min(100, (totalSpent / totalLimit) * 100)
      : 0

  return (
    <section
      className={`panel budget-panel ${isSummaryMode ? "budget-summary-mode" : "budget-full-mode"
        }`}
    >
      <div className="section-heading">
        <div className="heading-icon budget-heading-icon">◎</div>

        <div>
          <h2>
            {isSummaryMode ? "Ringkasan Anggaran" : "Anggaran Bulanan"}
          </h2>

          <p>
            {isSummaryMode
              ? "Pantau batas dan pemakaian anggaran bulan ini."
              : "Tetapkan batas pengeluaran dan pantau pemakaian per kategori."}
          </p>
        </div>
      </div>

      <div className="budget-month-row">
        <label htmlFor={`budget-month-${mode}`}>
          Bulan anggaran
        </label>

        <input
          id={`budget-month-${mode}`}
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>

      {error && (
        <div className="budget-alert budget-alert-error" role="alert">
          {error}
        </div>
      )}

      {!isSummaryMode && notice && (
        <div
          className="budget-alert budget-alert-success"
          role="status"
        >
          {notice}
        </div>
      )}

      {/* FORM TAMBAH ANGGARAN HANYA DI HALAMAN ANGGARAN */}
      {!isSummaryMode && (
        <form className="budget-form" onSubmit={handleSubmit}>
          <div className="budget-field">
            <label htmlFor="budget-category">
              Kategori pengeluaran
            </label>

            <input
              id="budget-category"
              list="budget-category-options"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={100}
              placeholder="Contoh: Makan, Transportasi"
              required
            />

            <datalist id="budget-category-options">
              {expenseCategories.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="budget-field">
            <label htmlFor="budget-limit">
              Batas anggaran (Rp)
            </label>

            <input
              id="budget-limit"
              type="text"
              inputMode="numeric"
              value={formatNumber(limitAmount)}
              onChange={(event) => {
                const rawValue = event.target.value.replace(/\D/g, "")
                setLimitAmount(rawValue)
              }}
              placeholder="Contoh: 1.500.000"
              required
            />
          </div>

          <button
            type="submit"
            className="budget-save-button"
            disabled={isSaving}
          >
            {isSaving ? "Menyimpan..." : "Simpan Anggaran"}
          </button>
        </form>
      )}

      {/* RINGKASAN TOTAL ANGGARAN */}
      <div className="budget-summary">
        <div>
          <span>Total batas anggaran</span>
          <strong>{formatRupiah(totalLimit)}</strong>
        </div>

        <div>
          <span>Total pengeluaran kategori beranggaran</span>
          <strong>{formatRupiah(totalSpent)}</strong>
        </div>

        <div>
          <span>Penggunaan anggaran</span>
          <strong>
            {totalLimit > 0
              ? `${Math.round((totalSpent / totalLimit) * 100)}%`
              : "0%"}
          </strong>
        </div>
      </div>

      <div
        className="budget-progress-track"
        aria-label="Penggunaan total anggaran"
      >
        <div
          className={`budget-progress-fill ${totalSpent > totalLimit && totalLimit > 0
              ? "is-over"
              : ""
            }`}
          style={{ width: `${totalPercent}%` }}
        />
      </div>

      <div className="budget-list-heading">
        <h3>
          {isSummaryMode ? "Status Anggaran" : "Rincian Anggaran"}
        </h3>

        <span>{budgets.length} kategori</span>
      </div>

      {isLoading ? (
        <div className="budget-empty">Memuat anggaran...</div>
      ) : budgets.length === 0 ? (
        <div className="budget-empty">
          {isSummaryMode
            ? "Belum ada anggaran untuk bulan ini. Buka halaman Anggaran untuk membuat anggaran."
            : "Belum ada anggaran untuk bulan ini. Isi form di atas untuk mulai mengatur batas pengeluaran."}
        </div>
      ) : (
        <div className="budget-list">
          {budgets.map((budget) => {
            const limit = Number(budget.limit_amount)
            const spent = Number(budget.spent_amount)

            const percent =
              limit > 0 ? (spent / limit) * 100 : 0

            const isOver = percent > 100
            const isNear = percent >= 80 && !isOver
            const width = Math.min(100, Math.max(0, percent))

            return (
              <article className="budget-item" key={budget.id}>
                <div className="budget-item-top">
                  <div>
                    <h4>{budget.category}</h4>

                    <p>
                      {formatRupiah(spent)} dari {formatRupiah(limit)}
                    </p>
                  </div>

                  <div className="budget-item-actions">
                    <span
                      className={`budget-status ${isOver
                          ? "status-over"
                          : isNear
                            ? "status-near"
                            : "status-safe"
                        }`}
                    >
                      {isOver
                        ? "Melebihi batas"
                        : isNear
                          ? "Hampir mencapai batas"
                          : "Aman"}
                    </span>

                    {/* TOMBOL HAPUS HANYA DI HALAMAN ANGGARAN */}
                    {!isSummaryMode && (
                      <button
                        type="button"
                        className="budget-delete-button"
                        onClick={() => void handleDelete(budget)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="budget-progress-track">
                  <div
                    className={`budget-progress-fill ${isOver
                        ? "is-over"
                        : isNear
                          ? "is-near"
                          : ""
                      }`}
                    style={{ width: `${width}%` }}
                  />
                </div>

                <div className="budget-item-bottom">
                  <span>{Math.round(percent)}% terpakai</span>

                  <span>
                    {isOver
                      ? `Lebih ${formatRupiah(spent - limit)}`
                      : `Sisa ${formatRupiah(limit - spent)}`}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}