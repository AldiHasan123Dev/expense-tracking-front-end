
import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import type { Account, AccountType } from "../types/account"
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  transferAccountBalance,
} from "../services/accountApi"
import "./AccountManager.css"

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)

const formatNumber = (value: string) => {
  const digits = value.replace(/\D/g, "")

  if (!digits) return ""

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

const typeLabels: Record<AccountType, string> = {
  cash: "Dompet",
  ewallet: "E-Wallet",
  bank: "Bank",
}

const icons: Record<AccountType, string> = {
  cash: "👛",
  ewallet: "📱",
  bank: "🏦",
}

export default function AccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [name, setName] = useState("")
  const [type, setType] = useState<AccountType>("cash")
  const [editingId, setEditingId] = useState<number | null>(null)

  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferNote, setTransferNote] = useState("")

  // Tanggal transfer default hari ini
  const [transferDate, setTransferDate] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAccounts()
      setAccounts(data)
      setError("")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat rekening.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance),
    0,
  )

  function resetForm() {
    setName("")
    setType("cash")
    setEditingId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setError("Nama rekening wajib diisi.")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      if (editingId !== null) {
        await updateAccount(editingId, { name: name.trim(), type })
        setSuccess("Rekening berhasil diperbarui.")
      } else {
        await createAccount({ name: name.trim(), type })
        setSuccess("Rekening berhasil ditambahkan dengan saldo Rp0.")
      }

      resetForm()
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan rekening.")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id)
    setName(account.name)
    setType(account.type)
    setError("")
    setSuccess("")
  }

  async function handleDelete(account: Account) {
    const confirmed = window.confirm(
      `Hapus rekening "${account.name}"? Rekening yang masih digunakan tidak dapat dihapus.`,
    )
    if (!confirmed) return

    setError("")
    setSuccess("")

    try {
      await deleteAccount(account.id)
      setSuccess("Rekening berhasil dihapus.")
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus rekening.")
    }
  }

  async function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amount = Number(transferAmount.replace(/\./g, ""))

    if (
      !fromId ||
      !toId ||
      fromId === toId ||
      !transferDate ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      setError(
        "Pilih dua rekening berbeda, tentukan tanggal, dan isi nominal transfer yang valid."
      )
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      await transferAccountBalance({
        from_account_id: Number(fromId),
        to_account_id: Number(toId),
        amount,
        note: transferNote.trim() || null,
        transfer_date: transferDate,
      })

      setTransferAmount("")
      setTransferNote("")
      setSuccess("Transfer berhasil. Saldo rekening telah diperbarui.")
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer gagal.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="account-page">
      <header className="account-page-heading">
        <div>
          <h2>Saldo & Rekening</h2>
          <p>Kelola uang tunai, e-wallet, dan rekening bank.</p>
        </div>
      </header>

      {error && <div className="account-alert error-message" role="alert">{error}</div>}
      {success && <div className="account-alert success-message" role="status">{success}</div>}

      <article className="account-total-card">
        <span>Total Saldo</span>
        <h2>{money(totalBalance)}</h2>
        <p>{accounts.length} rekening terdaftar</p>
      </article>

      <div className="account-grid">
        {accounts.map((account) => (
          <article className="account-card" key={account.id}>
            <div className="account-card-top">
              <span className="account-icon">{icons[account.type]}</span>
              <span className="account-type">{typeLabels[account.type]}</span>
            </div>
            <h3>{account.name}</h3>
            <p className="account-balance">{money(Number(account.balance))}</p>
            <div className="account-actions">
              <button type="button" onClick={() => startEdit(account)}>
                Edit
              </button>
              <button type="button" onClick={() => void handleDelete(account)}>
                Hapus
              </button>
            </div>
          </article>
        ))}

        {!loading && accounts.length === 0 && (
          <p>Belum ada rekening. Tambahkan rekening pertamamu di bawah.</p>
        )}
      </div>

      {loading && <p role="status">Memuat rekening...</p>}

      <section className="panel account-form-panel">
        <h3>{editingId === null ? "Tambah Rekening" : "Edit Rekening"}</h3>

        <form onSubmit={handleSubmit} className="account-form">
          <label>
            Nama rekening
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: BCA Utama, DANA, Dompet"
              maxLength={100}
              required
            />
          </label>

          <label>
            Jenis rekening
            <select
              value={type}
              onChange={(event) => setType(event.target.value as AccountType)}
            >
              <option value="cash">Dompet</option>
              <option value="ewallet">E-Wallet</option>
              <option value="bank">Bank</option>
            </select>
          </label>

          <p>Saldo awal rekening baru: <strong>Rp0</strong></p>

          <div className="account-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : editingId === null ? "Tambah Rekening" : "Simpan Perubahan"}
            </button>
            {editingId !== null && (
              <button type="button" onClick={resetForm}>Batal</button>
            )}
          </div>
        </form>
      </section>

      <section className="panel account-form-panel">
        <h3>Transfer Antar-Rekening</h3>
        <p>Transfer hanya memindahkan saldo, bukan pemasukan atau pengeluaran baru.</p>

        <form onSubmit={handleTransfer} className="account-form">
          <label>
            Dari rekening
            <select value={fromId} onChange={(event) => setFromId(event.target.value)} required>
              <option value="">Pilih rekening sumber</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} — {money(Number(account.balance))}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ke rekening
            <select value={toId} onChange={(event) => setToId(event.target.value)} required>
              <option value="">Pilih rekening tujuan</option>
              {accounts.filter((account) => String(account.id) !== fromId).map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>

          <label>
            Nominal transfer (Rp)
            <input
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 500.000"
              value={transferAmount}
              onChange={(event) => {
                setTransferAmount(formatNumber(event.target.value))
              }}
              required
            />
          </label>

          <label>
            Tanggal transfer
            <input
              type="date"
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
              required
            />
          </label>

          <label>
            Catatan (opsional)
            <input
              value={transferNote}
              onChange={(event) => setTransferNote(event.target.value)}
              maxLength={255}
              placeholder="Contoh: Isi saldo e-wallet"
            />
          </label>

          <button type="submit" disabled={saving || accounts.length < 2}>
            {saving ? "Memproses..." : "Transfer Saldo"}
          </button>
        </form>
      </section>
    </section>
  )
}
