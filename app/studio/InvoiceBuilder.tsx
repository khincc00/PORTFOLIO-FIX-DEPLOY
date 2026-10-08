"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon } from "@/components/StudioIcon";
import {
  MAX_INVOICE_ITEMS,
  buildInvoicePdf,
  formatRupiah,
  invoiceFileName,
  invoiceIssues,
  invoiceTotals,
  itemAmount,
  newItemId,
  type Invoice,
  type InvoiceParty,
} from "@/lib/invoice";

type Props = {
  invoice: Invoice;
  setInvoice: Dispatch<SetStateAction<Invoice>>;
};

function PartyFields({
  value,
  onChange,
  nameLabel,
}: {
  value: InvoiceParty;
  onChange: (next: InvoiceParty) => void;
  nameLabel: string;
}) {
  const set = (key: keyof InvoiceParty) => (e: { target: { value: string } }) =>
    onChange({ ...value, [key]: e.target.value });
  return (
    <div className="s-invoice-grid">
      <label>
        {nameLabel}
        <input value={value.name} onChange={set("name")} />
      </label>
      <label>
        Perusahaan (opsional)
        <input value={value.company} onChange={set("company")} />
      </label>
      <label>
        Email
        <input type="email" value={value.email} onChange={set("email")} />
      </label>
      <label>
        Telepon
        <input type="tel" value={value.phone} onChange={set("phone")} />
      </label>
      <label className="s-invoice-wide">
        Alamat
        <textarea rows={2} value={value.address} onChange={set("address")} />
      </label>
    </div>
  );
}

export default function InvoiceBuilder({ invoice, setInvoice }: Props) {
  const [message, setMessage] = useState("");
  const update = (patch: Partial<Invoice>) =>
    setInvoice((inv) => ({ ...inv, ...patch }));
  const totals = invoiceTotals(invoice);
  const issues = invoiceIssues(invoice);

  const updateItem = (id: string, patch: Partial<Invoice["items"][number]>) =>
    setInvoice((inv) => ({
      ...inv,
      items: inv.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));

  const addItem = () =>
    setInvoice((inv) =>
      inv.items.length >= MAX_INVOICE_ITEMS
        ? inv
        : {
            ...inv,
            items: [
              ...inv.items,
              { id: newItemId(), description: "", qty: 1, price: 0 },
            ],
          },
    );

  const removeItem = (id: string) =>
    setInvoice((inv) => ({
      ...inv,
      items: inv.items.filter((item) => item.id !== id),
    }));

  const download = () => {
    if (issues.length) return;
    try {
      const bytes = buildInvoicePdf(invoice);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = invoiceFileName(invoice);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PDF sedang diunduh.");
    } catch {
      setMessage("PDF belum berhasil dibuat. Periksa isi invoice.");
    }
  };

  return (
    <>
      <div className="s-page-heading">
        <div>
          <div className="s-eyebrow">DOKUMEN UNTUK KLIEN</div>
          <h1>
            Invoice<span>.</span>
          </h1>
          <p>
            Isi detail, lalu unduh sebagai PDF. Data hanya ada di halaman ini
            dan tidak dikirim ke server atau GitHub.
          </p>
        </div>
      </div>

      <div className="s-invoice-layout">
        <div className="s-invoice-form">
          <section className="s-panel s-invoice-card">
            <h2>Detail invoice</h2>
            <div className="s-invoice-grid">
              <label>
                Nomor invoice
                <input
                  value={invoice.number}
                  onChange={(e) => update({ number: e.target.value })}
                />
              </label>
              <label>
                Tanggal terbit
                <input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(e) => update({ issueDate: e.target.value })}
                />
              </label>
              <label>
                Jatuh tempo
                <input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => update({ dueDate: e.target.value })}
                />
              </label>
              <label>
                PPN (%)
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={invoice.taxPercent || ""}
                  onChange={(e) =>
                    update({ taxPercent: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>
          </section>

          <section className="s-panel s-invoice-card">
            <h2>Dari (penerbit)</h2>
            <PartyFields
              nameLabel="Nama penerbit"
              value={invoice.from}
              onChange={(from) => update({ from })}
            />
          </section>

          <section className="s-panel s-invoice-card">
            <h2>Kepada (klien)</h2>
            <PartyFields
              nameLabel="Nama klien"
              value={invoice.to}
              onChange={(to) => update({ to })}
            />
          </section>

          <section className="s-panel s-invoice-card">
            <h2>Item</h2>
            <div className="s-invoice-items">
              {invoice.items.map((item, index) => (
                <div className="s-invoice-item" key={item.id}>
                  <span className="s-invoice-index">{index + 1}</span>
                  <label className="s-invoice-desc">
                    Deskripsi
                    <input
                      value={item.description}
                      placeholder="Misal: Desain logo"
                      onChange={(e) =>
                        updateItem(item.id, { description: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Qty
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={item.qty || ""}
                      onChange={(e) =>
                        updateItem(item.id, { qty: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Harga (Rp)
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={item.price || ""}
                      onChange={(e) =>
                        updateItem(item.id, { price: Number(e.target.value) })
                      }
                    />
                  </label>
                  <div className="s-invoice-amount">
                    <small>Jumlah</small>
                    <strong>{formatRupiah(itemAmount(item))}</strong>
                  </div>
                  <button
                    className="s-invoice-remove"
                    aria-label={`Hapus item ${index + 1}`}
                    disabled={invoice.items.length === 1}
                    onClick={() => removeItem(item.id)}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="s-secondary"
              onClick={addItem}
              disabled={invoice.items.length >= MAX_INVOICE_ITEMS}
            >
              <Icon name="plus" size={16} />
              Tambah item
            </button>
          </section>

          <section className="s-panel s-invoice-card">
            <h2>Pembayaran & catatan</h2>
            <div className="s-invoice-grid">
              <label className="s-invoice-wide">
                Informasi pembayaran
                <textarea
                  rows={3}
                  placeholder={"Bank BCA 1234567890\na.n. Nama Anda"}
                  value={invoice.payment}
                  onChange={(e) => update({ payment: e.target.value })}
                />
              </label>
              <label className="s-invoice-wide">
                Catatan
                <textarea
                  rows={3}
                  placeholder="Misal: Terima kasih atas kepercayaannya."
                  value={invoice.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="s-panel s-invoice-summary">
          <h2>Ringkasan</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatRupiah(totals.subtotal)}</dd>
            </div>
            {invoice.taxPercent > 0 && (
              <div>
                <dt>PPN {invoice.taxPercent}%</dt>
                <dd>{formatRupiah(totals.tax)}</dd>
              </div>
            )}
            <div className="s-invoice-total">
              <dt>Total</dt>
              <dd>{formatRupiah(totals.total)}</dd>
            </div>
          </dl>
          {issues.length > 0 && (
            <ul className="s-invoice-issues">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
          <button
            className="s-primary s-invoice-download"
            disabled={issues.length > 0}
            onClick={download}
          >
            <Icon name="arrow" size={17} />
            Unduh PDF
          </button>
          {message && (
            <p className="s-invoice-note" role="status">
              {message}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
