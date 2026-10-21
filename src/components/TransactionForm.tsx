
import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import type { Transaction } from "../types/transaction"
import type { Account } from "../types/account"
import { getAccounts } from "../services/accountApi"

interface TransactionFormProps {
    onAddTransaction: (transaction: Transaction) => void | Promise<void>
    editingTransaction?: Transaction | null
    onUpdateTransaction?: (
        updatedTransaction: Transaction
    ) => void | Promise<void>
    onCancelEdit?: () => void
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0)

function TransactionForm({
    onAddTransaction,
    editingTransaction,
    onUpdateTransaction,
    onCancelEdit,
}: TransactionFormProps) {
    const isEditing = Boolean(editingTransaction)
    const today = new Date().toISOString().slice(0, 10)

    const [accounts, setAccounts] = useState<Account[]>([])
    const [loadingAccounts, setLoadingAccounts] = useState(true)
    const [accountError, setAccountError] = useState("")

    const [title, setTitle] = useState("")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState<"income" | "expense">("expense")
    const [category, setCategory] = useState("")
    const [date, setDate] = useState(today)
    const [accountId, setAccountId] = useState("")

    const refreshAccounts = useCallback(async () => {
        try {
            setLoadingAccounts(true)
            setAccountError("")

            const data = await getAccounts()
            setAccounts(data)
        } catch (error) {
            setAccountError(
                error instanceof Error
                    ? error.message
                    : "Gagal memuat saldo rekening."
            )
        } finally {
            setLoadingAccounts(false)
        }
    }, [])

    useEffect(() => {
        void refreshAccounts()
    }, [refreshAccounts])

    const selectedAccount = accounts.find(
        (account) => account.id === Number(accountId)
    )

    function resetForm() {
        setTitle("")
        setAmount("")
        setType("expense")
        setCategory("")
        setDate(today)
        setAccountId("")
    }

    useEffect(() => {
        if (!editingTransaction) {
            resetForm()
            return
        }

        setTitle(editingTransaction.title)
        setAmount(
            new Intl.NumberFormat("id-ID").format(
                editingTransaction.amount
            )
        )
        setType(editingTransaction.type)
        setCategory(editingTransaction.category)
        setDate(editingTransaction.date)
        setAccountId(
            editingTransaction.account_id != null
                ? String(editingTransaction.account_id)
                : ""
        )
    }, [editingTransaction])

    function formatThousands(value: string) {
        const digits = value.replace(/\D/g, "")
        if (!digits) return ""

        return new Intl.NumberFormat("id-ID").format(Number(digits))
    }

    function handleAmountChange(value: string) {
        setAmount(formatThousands(value))
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const numericAmount = Number(amount.replace(/\D/g, ""))
        const numericAccountId = Number(accountId)

        if (
            !title.trim() ||
            !category.trim() ||
            !amount ||
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0 ||
            !accountId ||
            !Number.isInteger(numericAccountId) ||
            numericAccountId <= 0
        ) {
            return
        }

        const transactionData = {
            title: title.trim(),
            amount: numericAmount,
            type,
            category: category.trim(),
            date,
            account_id: Number(accountId),
        }

        if (isEditing && editingTransaction) {
            if (!onUpdateTransaction) return

            await onUpdateTransaction({
                ...editingTransaction,
                ...transactionData,
            })

            await refreshAccounts()
            onCancelEdit?.()
            return
        }

        const newTransaction: Transaction = {
            id: Date.now(),
            ...transactionData,
        }

        await onAddTransaction(newTransaction)
        await refreshAccounts()
        resetForm()
    }

    return (
        <form className="transaction-form" onSubmit={handleSubmit}>

            <div className="form-field">
                <label htmlFor="title">Nama Transaksi</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Contoh: Beli makan"
                    required
                />
            </div>

            <div className="form-field">
                <label htmlFor="amount">Nominal (Rp)</label>

                <div className="amount-input-wrapper">
                    <span className="currency-prefix">Rp</span>
                    <input
                        id="amount"
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(event) =>
                            handleAmountChange(event.target.value)
                        }
                        placeholder="Contoh: 25.000"
                        required
                    />
                </div>
            </div>

            <div className="form-field">
                <label htmlFor="type">Tipe Transaksi</label>
                <select
                    id="type"
                    className={`type-select ${type}`}
                    value={type}
                    onChange={(event) =>
                        setType(event.target.value as "income" | "expense")
                    }
                >
                    <option value="income">↗ Pemasukan</option>
                    <option value="expense">↘ Pengeluaran</option>
                </select>
            </div>

            <div className="form-field">
                <label htmlFor="account_id">Rekening Transaksi</label>
                <select
                    id="account_id"
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    required
                    disabled={loadingAccounts || accounts.length === 0}
                >
                    <option value="">Pilih rekening</option>

                    {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {account.name} — {formatRupiah(account.balance)}
                        </option>
                    ))}
                </select>

                {selectedAccount && (
                    <p className="form-hint">
                        Saldo saat ini:{" "}
                        <strong>
                            {formatRupiah(selectedAccount.balance)}
                        </strong>
                    </p>
                )}
            </div>

            <div className="form-field">
                <label htmlFor="category">Kategori</label>
                <input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Contoh: Makanan"
                    required
                />
            </div>

            <div className="form-field">
                <label htmlFor="date">Tanggal Transaksi</label>
                <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                />
            </div>

            <div className="form-action">
                <button
                    className="submit-button"
                    type="submit"
                    disabled={
                        loadingAccounts ||
                        accounts.length === 0 ||
                        Boolean(accountError)
                    }
                >
                    <span className="button-plus">+</span>
                    {isEditing ? "Simpan Perubahan" : "Tambah Transaksi"}
                </button>

                <p className="form-hint">
                    {isEditing
                        ? "Ubah detail transaksi, lalu simpan perubahan."
                        : "Pilih rekening dan lengkapi detail transaksi."}
                </p>
            </div>
        </form>
    )
}

export default TransactionForm
