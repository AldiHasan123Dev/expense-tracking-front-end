import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import type { Transaction } from "../types/transaction"

interface TransactionFormProps {
    onAddTransaction: (transaction: Transaction) => void
    editingTransaction?: Transaction | null
    onUpdateTransaction?: (updatedTransaction: Transaction) => void
    onCancelEdit?: () => void
}

function TransactionForm({
    onAddTransaction,
    editingTransaction,
    onUpdateTransaction,
    onCancelEdit,
}: TransactionFormProps) {
    const isEditing = Boolean(editingTransaction)
    const today = new Date().toISOString().slice(0, 10)

    const [title, setTitle] = useState("")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState<"income" | "expense">("expense")
    const [category, setCategory] = useState("")
    const [date, setDate] = useState(today)

    function resetForm() {
        setTitle("")
        setAmount("")
        setType("expense")
        setCategory("")
        setDate(today)
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
    }, [editingTransaction])

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const numericAmount = Number(amount.replace(/\D/g, ""))

        if (
            !title.trim() ||
            !category.trim() ||
            !amount ||
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            return
        }

        if (isEditing && editingTransaction) {
            onUpdateTransaction?.({
                ...editingTransaction,
                title: title.trim(),
                amount: numericAmount,
                type,
                category: category.trim(),
                date,
            })
            onCancelEdit?.()
            return
        }

        const newTransaction: Transaction = {
            id: Date.now(),
            title: title.trim(),
            amount: numericAmount,
            type,
            category: category.trim(),
            date,
        }

        onAddTransaction(newTransaction)
        resetForm()
    }

    function formatThousands(value: string) {
        const digits = value.replace(/\D/g, "")

        if (!digits) return ""

        return new Intl.NumberFormat("id-ID").format(Number(digits))
    }

    function handleAmountChange(value: string) {
        setAmount(formatThousands(value))
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
                        onChange={(event) => handleAmountChange(event.target.value)}
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
                <button className="submit-button" type="submit">
                    <span className="button-plus">+</span>
                    {isEditing ? "Simpan Perubahan" : "Tambah Transaksi"}
                </button>

                <p className="form-hint">
                    {isEditing
                        ? "Ubah detail transaksi, lalu simpan perubahan."
                        : "Lengkapi detail transaksi sebelum menyimpan."}
                </p>
            </div>
        </form>
    )
}

export default TransactionForm

