import { useEffect, useState } from "react"

import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./services/transactionApi"

import "./App.css"
import type { Transaction } from "./types/transaction"
import TransactionItem from "./components/TransactionItem"
import TransactionForm from "./components/TransactionForm"
import FinanceChart from "./components/FinanceChart"
import BudgetManager from "./components/BudgetManager"
import SavingsGoals from "./components/SavingsGoal"

type TransactionFilter = "all" | "income" | "expense"
type DateFilterType = "all" | "month" | "custom"
type ActivePage = "dashboard" | "transactions" | "budget" | "savings"

const PAGE_SIZE = 10

function App() {
  const [activePage, setActivePage] = useState<ActivePage>("dashboard")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<TransactionFilter>("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)

  const [dateFilterType, setDateFilterType] =
    useState<DateFilterType>("all")

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`
  })

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState("")
  const [showSavingsGoals, setShowSavingsGoals] = useState(false)
  // Filter khusus diagram
  const [chartFilterType, setChartFilterType] =
    useState<TransactionFilter>("all")

  const [chartFilterCategory, setChartFilterCategory] =
    useState("all")

  const [chartDateFilterType, setChartDateFilterType] =
    useState<"all" | "month">("all")

  const [chartSelectedMonth, setChartSelectedMonth] = useState(() => {
    const today = new Date()

    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`
  })

  // Filter diagram tidak terpengaruh filter daftar transaksi
  const chartFilteredTransactions = transactions.filter((item) => {
    const matchesType =
      chartFilterType === "all" ||
      item.type === chartFilterType

    const matchesCategory =
      chartFilterCategory === "all" ||
      item.category === chartFilterCategory

    const matchesDate =
      chartDateFilterType === "all" ||
      item.date.startsWith(chartSelectedMonth)

    return matchesType && matchesCategory && matchesDate
  })

  // Ambil transaksi dari database saat halaman pertama kali dibuka.
  useEffect(() => {
    let isActive = true

    async function loadTransactions() {
      try {
        setIsLoading(true)
        setApiError("")

        const data = await getTransactions()

        if (isActive) {
          setTransactions(data)
        }
      } catch (error) {
        if (isActive) {
          setApiError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil transaksi"
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()

    return () => {
      isActive = false
    }
  }, [])

  // Kembali ke halaman pertama saat filter berubah.
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterCategory, dateFilterType, selectedMonth, startDate, endDate])

  // Mengambil kategori unik dari seluruh transaksi.
  const categories = Array.from(
    new Set(transactions.map((item) => item.category))
  ).sort((a, b) => a.localeCompare(b, "id"))

  // Filter berdasarkan pencarian, tipe, kategori, dan periode.
  const filteredTransactions = transactions.filter((item) => {
    const keyword = searchTerm.trim().toLowerCase()

    const matchesSearch =
      item.title.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword)

    const matchesType =
      filterType === "all" || item.type === filterType

    const matchesCategory =
      filterCategory === "all" || item.category === filterCategory

    let matchesDate = true

    if (dateFilterType === "month") {
      matchesDate = item.date.startsWith(selectedMonth)
    }

    if (dateFilterType === "custom") {
      matchesDate =
        (!startDate || item.date >= startDate) &&
        (!endDate || item.date <= endDate) &&
        (!startDate || !endDate || startDate <= endDate)
    }

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesDate
    )
  })

  // Pagination diterapkan setelah seluruh filter selesai.
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTransactions = filteredTransactions.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  )

  // Menambahkan transaksi ke database.
  const handleAddTransaction = async (transaction: Transaction) => {
    try {
      setApiError("")

      // ID sementara dari form tidak dikirim ke backend.
      const { id: _temporaryId, ...payload } = transaction
      const savedTransaction = await createTransaction(payload)

      setTransactions((previousTransactions) => [
        savedTransaction,
        ...previousTransactions,
      ])
      setCurrentPage(1)
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan transaksi"
      )
    }
  }

  // Reset semua filter.
  function handleResetFilter() {
    setSearchTerm("")
    setFilterType("all")
    setFilterCategory("all")
    setDateFilterType("all")
    setStartDate("")
    setEndDate("")
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction)

    // Gulir ke bagian form agar mudah diedit.
    document
      .querySelector(".form-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Memperbarui transaksi di database.
  const handleUpdateTransaction = async (
    updatedTransaction: Transaction
  ) => {
    try {
      setApiError("")

      const { id, ...payload } = updatedTransaction
      const savedTransaction = await updateTransaction(id, payload)

      setTransactions((previousTransactions) =>
        previousTransactions.map((transaction) =>
          transaction.id === savedTransaction.id
            ? savedTransaction
            : transaction
        )
      )

      setEditingTransaction(null)
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Gagal mengedit transaksi"
      )
    }
  }

  // Menghapus transaksi dari database.
  const handleDeleteTransaction = async (id: number) => {
    try {
      setApiError("")

      await deleteTransaction(id)

      setTransactions((previousTransactions) =>
        previousTransactions.filter((transaction) => transaction.id !== id)
      )

      // Jika transaksi yang sedang diedit dihapus, keluar dari mode edit.
      setEditingTransaction((currentTransaction) =>
        currentTransaction?.id === id ? null : currentTransaction
      )
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus transaksi"
      )
    }
  }

  // Ringkasan mengikuti transaksi yang sedang ditampilkan setelah filter.
  const totalIncome = filteredTransactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + item.amount, 0)

  const totalExpense = filteredTransactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + item.amount, 0)

  const balance = totalIncome - totalExpense

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount)

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <main className={`dashboard page-${activePage}`}>
      {/* HEADER */}


      {/* SIDEBAR */}
      <aside className="sidebar">
        <a
          className="sidebar-brand"
          href="#overview"
          onClick={(event) => {
            event.preventDefault()
            setActivePage("dashboard")
          }}
        >
          <span className="brand-icon">Rp</span>
          <span className="brand-text">
            <strong>FinTrack</strong>
            <small>Personal Finance</small>
          </span>
        </a>

        <p className="sidebar-label">MENU UTAMA</p>

        <nav className="sidebar-nav" aria-label="Navigasi utama">
          <button
            type="button"
            className={`sidebar-link ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <span className="sidebar-icon">▦</span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`sidebar-link ${activePage === "transactions" ? "active" : ""}`}
            onClick={() => setActivePage("transactions")}
          >
            <span className="sidebar-icon">☷</span>
            <span>Transaksi</span>
          </button>

          <button
            type="button"
            className={`sidebar-link ${activePage === "budget" ? "active" : ""}`}
            onClick={() => setActivePage("budget")}
          >
            <span className="sidebar-icon">◎</span>
            <span>Anggaran</span>
          </button>

          <button
            type="button"
            className={`sidebar-link ${activePage === "savings" ? "active" : ""}`}
            onClick={() => setActivePage("savings")}
          >
            <span className="sidebar-icon">◇</span>
            <span>Target Tabungan</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="profile-avatar">A</span>
          <div className="sidebar-profile">
            <strong>Personal Finance</strong>
            <small>Pengelola Keuangan</small>
          </div>
        </div>
      </aside>

      {/* HEADER KONTEN */}
      <header className="content-header">
        <div>
          <h1>
            {activePage === "dashboard" && "Dashboard"}
            {activePage === "transactions" && "Transaksi"}
            {activePage === "budget" && "Anggaran"}
            {activePage === "savings" && "Target Tabungan"}
          </h1>
          <p>Kelola keuanganmu dengan lebih baik.</p>
        </div>

        <div className="navbar-date">
          <span>▦</span>
          <span>{formattedDate}</span>
        </div>
      </header>



      {apiError && (
        <div className="error-message dashboard-error" role="alert">
          {apiError}
        </div>
      )}


      {/* RINGKASAN KEUANGAN */}
      {activePage === "dashboard" && (
        <>
          {/* RINGKASAN KEUANGAN */}
          <section className="dashboard-summary" id="overview">
            {/* Kartu Pemasukan */}
            <article className="summary-card income-card">
              <div className="card-top">
                <div className="summary-icon income-icon">
                  <span>↗</span>
                </div>

                <span className="card-label">PEMASUKAN</span>
                <span className="card-badge">+</span>
              </div>

              <p className="summary-title">Total Pemasukan</p>
              <h2>{formatRupiah(totalIncome)}</h2>

              <div className="card-footer">
                <span className="card-indicator">↗</span>
              </div>
            </article>

            {/* Kartu Pengeluaran */}
            <article className="summary-card expense-card">
              <div className="card-top">
                <div className="summary-icon expense-icon">
                  <span>↘</span>
                </div>

                <span className="card-label">PENGELUARAN</span>
                <span className="card-badge">−</span>
              </div>

              <p className="summary-title">Total Pengeluaran</p>
              <h2>{formatRupiah(totalExpense)}</h2>

              <div className="card-footer">
                <span className="card-indicator">↘</span>
              </div>
            </article>

            {/* Kartu Saldo */}
            <article className="summary-card balance-card">
              <div className="card-top">
                <div className="summary-icon balance-icon">
                  <span>Rp</span>
                </div>

                <span className="card-label">SALDO BERSIH</span>
                <span className="balance-decoration">✦</span>
              </div>

              <p className="summary-title">Saldo</p>
              <h2>{formatRupiah(balance)}</h2>

              <div className="card-footer">
                <span className="balance-dot" />
                <span>Pemasukan dikurangi pengeluaran</span>
              </div>
            </article>
          </section>

        </>
      )}

      {activePage === "dashboard" && (
        <section className="dashboard-chart">
          <div className="chart-filter-header">
            <div>
              <h2>Grafik Keuangan</h2>
              <p>Atur filter diagram tanpa mengubah daftar transaksi.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setChartFilterType("all")
                setChartFilterCategory("all")
                setChartDateFilterType("all")
              }}
            >
              Reset Filter Diagram
            </button>
          </div>

          <div className="chart-filters">
            <select
              aria-label="Filter tipe diagram"
              value={chartFilterType}
              onChange={(event) =>
                setChartFilterType(
                  event.target.value as TransactionFilter
                )
              }
            >
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>

            <select
              aria-label="Filter kategori diagram"
              value={chartFilterCategory}
              onChange={(event) =>
                setChartFilterCategory(event.target.value)
              }
            >
              <option value="all">Semua Kategori</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter periode diagram"
              value={chartDateFilterType}
              onChange={(event) =>
                setChartDateFilterType(
                  event.target.value as "all" | "month"
                )
              }
            >
              <option value="all">Semua Periode</option>
              <option value="month">Berdasarkan Bulan</option>
            </select>

            {chartDateFilterType === "month" && (
              <input
                type="month"
                aria-label="Pilih bulan diagram"
                value={chartSelectedMonth}
                onChange={(event) =>
                  setChartSelectedMonth(event.target.value)
                }
              />
            )}
          </div>

          {chartFilteredTransactions.length > 0 ? (
            <FinanceChart
              transactions={chartFilteredTransactions}
            />
          ) : (
            <div className="empty-state">
              <h3>Tidak ada data diagram</h3>
              <p>
                Tidak ada transaksi yang sesuai dengan filter diagram.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ANGGARAN BULANAN */}
     {activePage === "dashboard" && (
  <BudgetManager
    transactions={transactions}
    mode="summary"
  />
)}

{activePage === "budget" && (
  <BudgetManager
    transactions={transactions}
    mode="full"
  />
)}
      {/* FORM TRANSAKSI */}
      {activePage === "transactions" && (
        <>
          <section className="dashboard-form">
            <div className="section-heading">
              <div className="heading-icon">+</div>
              <div>
                <h2>Tambah Transaksi</h2>
                <p>Isi detail transaksi untuk menambahkan data baru.</p>
              </div>
            </div>

            <TransactionForm
              onAddTransaction={handleAddTransaction}
              editingTransaction={null}
              onUpdateTransaction={handleUpdateTransaction}
              onCancelEdit={() => setEditingTransaction(null)}
            />
          </section>

          {/* DAFTAR TRANSAKSI */}
          <section className="dashboard-transactions panel transactions-panel">
            <div className="section-heading list-heading">
              <div className="heading-icon list-icon">☷</div>

              <div>
                <h2>Daftar Transaksi</h2>
                <p>Semua pemasukan dan pengeluaranmu.</p>
              </div>

              <span className="transaction-count">
                {filteredTransactions.length} dari {transactions.length} transaksi
              </span>
            </div>

            {/* PENCARIAN DAN FILTER */}
            <div className="transaction-filters">
              <div className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  type="search"
                  aria-label="Cari transaksi"
                  placeholder="Cari nama atau kategori transaksi..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <select
                aria-label="Filter tipe transaksi"
                value={filterType}
                onChange={(event) =>
                  setFilterType(event.target.value as TransactionFilter)
                }
              >
                <option value="all">Semua Tipe</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>

              <select
                aria-label="Filter kategori transaksi"
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
              >
                <option value="all">Semua Kategori</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter periode transaksi"
                value={dateFilterType}
                onChange={(event) =>
                  setDateFilterType(event.target.value as DateFilterType)
                }
              >
                <option value="all">Semua Periode</option>
                <option value="month">Berdasarkan Bulan</option>
                <option value="custom">Rentang Tanggal</option>
              </select>

              {dateFilterType === "month" && (
                <input
                  type="month"
                  aria-label="Pilih bulan transaksi"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                />
              )}

              {dateFilterType === "custom" && (
                <>
                  <input
                    type="date"
                    aria-label="Tanggal awal"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                  />

                  <input
                    type="date"
                    aria-label="Tanggal akhir"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </>
              )}

              <button
                type="button"
                className="reset-filter-button"
                onClick={handleResetFilter}
              >
                Reset Filter
              </button>
            </div>

            {/* HASIL TRANSAKSI */}
            {isLoading ? (
              <div className="empty-state" role="status">
                <h3>Memuat transaksi...</h3>
                <p>Mengambil data dari database.</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <span>📋</span>
                <h3>Belum ada transaksi</h3>
                <p>Tambahkan transaksi pertamamu melalui form di atas.</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <span>🔎</span>
                <h3>Transaksi tidak ditemukan</h3>
                <p>Coba ubah kata pencarian atau filter yang kamu pilih.</p>

                <button
                  type="button"
                  className="reset-filter-button"
                  onClick={handleResetFilter}
                >
                  Tampilkan Semua Transaksi
                </button>
              </div>
            ) : (
              <div className="transaction-list">
                {paginatedTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteTransaction}
                  />
                ))}
              </div>
            )}

            {!isLoading && filteredTransactions.length > PAGE_SIZE && (
              <nav className="pagination" aria-label="Navigasi halaman transaksi">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                >
                  Sebelumnya
                </button>

                <span className="pagination-info" aria-live="polite">
                  Halaman {safeCurrentPage} dari {totalPages}
                </span>

                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                >
                  Berikutnya
                </button>
              </nav>
            )}
          </section>
        </>
      )}

      {activePage === "savings" && (
        <section className="dashboard-savings-content">
          <SavingsGoals />
        </section>
      )}

      {/* MODAL EDIT TRANSAKSI */}
      {editingTransaction && (
        <div
          className="edit-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingTransaction(null)
            }
          }}
        >
          <div
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            <div className="edit-modal-header">
              <div>
                <h2 id="edit-modal-title">Edit Transaksi</h2>
                <p>Perbarui detail transaksi kamu.</p>
              </div>

              <button
                type="button"
                className="close-modal-button"
                onClick={() => setEditingTransaction(null)}
                aria-label="Tutup modal"
              >
                &times;
              </button>
            </div>

            <TransactionForm
              key={editingTransaction.id}
              onAddTransaction={handleAddTransaction}
              editingTransaction={editingTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onCancelEdit={() => setEditingTransaction(null)}
            />
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="app-footer">
        Personal Expense Tracker · Belajar React + TypeScript
      </footer>
    </main>
  )
}

export default App
