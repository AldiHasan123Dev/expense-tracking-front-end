
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import type { Transaction } from "../types/transaction"

interface FinanceChartProps {
  transactions: Transaction[]
}

const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
]

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function FinanceChart({ transactions }: FinanceChartProps) {
  const monthlyMap = new Map<
    string,
    { month: string; income: number; expense: number }
  >()

  transactions.forEach((transaction) => {
    const monthKey = transaction.date.slice(0, 7)

    const current = monthlyMap.get(monthKey) ?? {
      month: monthKey,
      income: 0,
      expense: 0,
    }

    if (transaction.type === "income") {
      current.income += transaction.amount
    } else {
      current.expense += transaction.amount
    }

    monthlyMap.set(monthKey, current)
  })

  const monthlyData = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      ...item,
      month: new Intl.DateTimeFormat("id-ID", {
        month: "short",
        year: "2-digit",
      }).format(new Date(`${item.month}-01T12:00:00`)),
    }))

  const expenseMap = new Map<string, number>()

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      expenseMap.set(
        transaction.category,
        (expenseMap.get(transaction.category) ?? 0) +
          transaction.amount
      )
    })

  const expenseData = Array.from(expenseMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <section className="panel finance-chart-panel">
      <div className="section-heading">
        <div className="heading-icon">▥</div>
        <div>
          <h2>Analisis Keuangan</h2>
          <p>Visualisasi pemasukan dan pengeluaranmu.</p>
        </div>
      </div>

      <div className="charts-grid">
        <article className="chart-card">
          <h3>Pemasukan vs Pengeluaran</h3>
          <p className="chart-description">
            Perbandingan transaksi setiap bulan.
          </p>

          {monthlyData.length === 0 ? (
            <p className="chart-empty">Belum ada data transaksi.</p>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 12, right: 8, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      value >= 1000000
                        ? `${value / 1000000} jt`
                        : `${value / 1000} rb`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatRupiah(Number(value))}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Pemasukan"
                    fill="#10b981"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Pengeluaran"
                    fill="#f59e0b"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="chart-card">
          <h3>Pengeluaran per Kategori</h3>
          <p className="chart-description">
            Kategori yang paling banyak menghabiskan uang.
          </p>

          {expenseData.length === 0 ? (
            <p className="chart-empty">
              Belum ada transaksi pengeluaran.
            </p>
          ) : (
            <>
              <div className="chart-container pie-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      paddingAngle={2}
                      labelLine={false}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatRupiah(Number(value))}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="category-breakdown">
                {expenseData.map((item, index) => (
                  <div className="category-breakdown-item" key={item.name}>
                    <span className="category-color">
                      <span
                        className="category-color-dot"
                        style={{
                          backgroundColor:
                            COLORS[index % COLORS.length],
                        }}
                      />
                      {item.name}
                    </span>
                    <strong>{formatRupiah(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  )
}

export default FinanceChart
