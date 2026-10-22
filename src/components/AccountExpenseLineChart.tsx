import { useMemo, useState } from "react"
import type { Account } from "../types/account"
import type { Transaction } from "../types/transaction"
import "./AccountExpenseLineChart.css"

interface AccountExpenseLineChartProps {
  accounts: Account[]
  transactions: Transaction[]
}

const ACCOUNT_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#16a34a",
  "#ea580c",
  "#db2777",
  "#7c3aed",
  "#ca8a04",
  "#0f766e",
]

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)

const formatCompactRupiah = (amount: number) => {
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} jt`
  }
  if (amount >= 1_000) {
    return `Rp${(amount / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} rb`
  }
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`
}

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

const toAmount = (amount: number | string) => {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * This assumes transfer transactions have "transfer" in their category.
 * If the backend stores transfer rows with another category, update this
 * helper to match the exact backend convention.
 */
const isTransferCategory = (category: string) =>
  category.trim().toLowerCase().includes("transfer")

export default function AccountExpenseLineChart({
  accounts,
  transactions,
}: AccountExpenseLineChartProps) {
  // Filter bulan grafik sengaja mandiri dan tidak mengubah filter saldo rekening.
  const [chartMonth, setChartMonth] = useState(getCurrentMonth)

  const { daysInMonth, dailySeries, maxExpense, totalExpense, totalIncome, monthLabel } =
    useMemo(() => {
      const [year, month] = chartMonth.split("-").map(Number)
      const validMonth =
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        year > 0 &&
        month >= 1 &&
        month <= 12

      const days = validMonth
        ? new Date(year, month, 0).getDate()
        : new Date().getDate()

      const monthlyTransactions = transactions.filter((transaction) => {
        const transactionDate = transaction.date.slice(0, 10)
        return (
          transactionDate.startsWith(chartMonth) &&
          transaction.account_id != null &&
          !isTransferCategory(transaction.category)
        )
      })

      const series = accounts.map((account, index) => {
        const dailyAmounts = Array.from({ length: days }, () => 0)
        let income = 0
        let expense = 0

        for (const transaction of monthlyTransactions) {
          if (Number(transaction.account_id) !== Number(account.id)) continue

          const amount = toAmount(transaction.amount)
          if (transaction.type === "income") income += amount
          if (transaction.type === "expense") {
            expense += amount
            const day = Number(transaction.date.slice(8, 10))
            if (day >= 1 && day <= days) {
              dailyAmounts[day - 1] += amount
            }
          }
        }

        return {
          accountId: account.id,
          accountName: account.name,
          color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
          dailyAmounts,
          income,
          expense,
          total: dailyAmounts.reduce((sum, amount) => sum + amount, 0),
        }
      })

      const highestDailyExpense = Math.max(
        0,
        ...series.flatMap((item) => item.dailyAmounts),
      )

      const label = validMonth
        ? new Intl.DateTimeFormat("id-ID", {
            month: "long",
            year: "numeric",
          }).format(new Date(year, month - 1, 1, 12))
        : chartMonth

      return {
        daysInMonth: days,
        dailySeries: series,
        maxExpense: highestDailyExpense,
        totalExpense: series.reduce((sum, item) => sum + item.expense, 0),
        totalIncome: series.reduce((sum, item) => sum + item.income, 0),
        monthLabel: label,
      }
    }, [accounts, transactions, chartMonth])

  const chartMax = maxExpense > 0 ? maxExpense * 1.15 : 100
  const chartWidth = 800
  const chartHeight = 320
  const paddingLeft = 82
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 42
  const plotWidth = chartWidth - paddingLeft - paddingRight
  const plotHeight = chartHeight - paddingTop - paddingBottom

  const xPosition = (dayIndex: number) =>
    paddingLeft +
    (daysInMonth <= 1 ? 0 : (dayIndex / (daysInMonth - 1)) * plotWidth)

  const yPosition = (amount: number) =>
    paddingTop + plotHeight - (amount / chartMax) * plotHeight

  const yTicks = Array.from({ length: 5 }, (_, index) => (chartMax / 4) * index)

  return (
    <section className="account-expense-chart">
      <header className="account-expense-chart-heading">
        <div>
          <h2>Pengeluaran per Rekening</h2>
          <p>
            Bandingkan pengeluaran harian setiap dompet, e-wallet, dan rekening
            bank.
          </p>
        </div>

        <label className="account-expense-month-filter">
          <span>Filter bulan grafik</span>
          <input
            type="month"
            value={chartMonth}
            onChange={(event) => setChartMonth(event.target.value)}
          />
        </label>
      </header>

      <div className="account-expense-overview">
        <div className="account-expense-chart-total income-total">
          <span>Total pemasukan semua rekening · {monthLabel}</span>
          <strong>{formatRupiah(totalIncome)}</strong>
        </div>
        <div className="account-expense-chart-total expense-total">
          <span>Total pengeluaran semua rekening · {monthLabel}</span>
          <strong>{formatRupiah(totalExpense)}</strong>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="account-expense-empty">
          Belum ada rekening untuk ditampilkan.
        </p>
      ) : (
        <>
          {maxExpense === 0 && (
            <p className="account-expense-empty">
              Belum ada transaksi pengeluaran rekening pada {monthLabel}.
              Grafik akan terisi setelah ada transaksi pengeluaran.
            </p>
          )}

          <div className="account-expense-svg-wrapper">
            <svg
              className="account-expense-svg"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={`Grafik pengeluaran harian per rekening untuk ${monthLabel}`}
            >
              {yTicks.map((tick, index) => {
                const y = yPosition(tick)
                return (
                  <g key={index}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#6b7280"
                    >
                      {formatCompactRupiah(tick)}
                    </text>
                  </g>
                )
              })}

              {Array.from({ length: daysInMonth }, (_, index) => index)
                .filter(
                  (index) =>
                    index === 0 ||
                    (index + 1) % 5 === 0 ||
                    index === daysInMonth - 1,
                )
                .map((dayIndex) => (
                  <text
                    key={dayIndex}
                    x={xPosition(dayIndex)}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6b7280"
                  >
                    {dayIndex + 1}
                  </text>
                ))}

              {dailySeries.map((series) => {
                const points = series.dailyAmounts
                  .map(
                    (amount, dayIndex) =>
                      `${xPosition(dayIndex)},${yPosition(amount)}`,
                  )
                  .join(" ")

                return (
                  <g key={series.accountId}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {series.dailyAmounts.map((amount, dayIndex) =>
                      amount > 0 ? (
                        <circle
                          key={dayIndex}
                          cx={xPosition(dayIndex)}
                          cy={yPosition(amount)}
                          r="3.5"
                          fill={series.color}
                        >
                          <title>
                            {`${series.accountName} — tanggal ${
                              dayIndex + 1
                            }: ${formatRupiah(amount)}`}
                          </title>
                        </circle>
                      ) : null,
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="account-expense-legend">
            {dailySeries.map((series) => (
              <div
                className="account-expense-legend-item"
                key={series.accountId}
              >
                <span
                  className="account-expense-legend-dot"
                  style={{ backgroundColor: series.color }}
                />
                <div className="account-expense-legend-details">
                  <span className="account-expense-account-name">{series.accountName}</span>
                  <div className="account-expense-amount-row income-amount">
                    <span>Pemasukan</span>
                    <strong>{formatRupiah(series.income)}</strong>
                  </div>
                  <div className="account-expense-amount-row expense-amount">
                    <span>Pengeluaran</span>
                    <strong>{formatRupiah(series.expense)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
