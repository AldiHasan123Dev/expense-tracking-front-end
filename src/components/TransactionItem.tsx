import type { Transaction } from "../types/transaction"

interface TransactionItemProps {
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (id: number) => void
}

function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const isIncome = transaction.type === "income"

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDate = (date: string) => {
    const parsedDate = new Date(`${date}T00:00:00`)

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsedDate)
  }

  return (
    <article
      className={`transaction-item ${
        isIncome ? "transaction-income" : "transaction-expense"
      }`}
    >
      <div className="transaction-icon">
        {isIncome ? "↗" : "↘"}
      </div>

      <div className="transaction-details">
        <h3>{transaction.title}</h3>

        <div className="transaction-meta">
          <span className="transaction-category">
            <span className="meta-icon">◇</span>
            {transaction.category}
          </span>

          <span className="transaction-date">
            <span className="meta-icon">▦</span>
            {formatDate(transaction.date)}
          </span>
        </div>
      </div>


<div className="transaction-info">
  <span
    className={`transaction-badge ${
      isIncome ? "badge-income" : "badge-expense"
    }`}
  >
    {isIncome ? "Pemasukan" : "Pengeluaran"}
  </span>

  <strong className="transaction-amount">
    {isIncome ? "+" : "−"} {formatRupiah(transaction.amount)}
  </strong>

  {/* Tombol Edit dan Hapus */}
  {/* <div className="transaction-actions">
    <button
      type="button"
      className="edit-transaction-button"
      onClick={() => onEdit(transaction)}
    >
      ✎ Edit
    </button>

    <button
      type="button"
      className="delete-transaction-button"
      onClick={() => onDelete(transaction.id)}
    >
      🗑 Hapus
    </button>
  </div> */}
</div>

    </article>
  )
}

export default TransactionItem
