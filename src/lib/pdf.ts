import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNPR } from "./format";

export interface BillShop {
  shop_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  pan_vat?: string | null;
  bill_footer?: string | null;
}
export interface BillCustomer {
  name: string;
  phone?: string | null;
  address?: string | null;
  pan?: string | null;
}
export interface BillItem {
  description: string;
  metal: string;
  purity?: string | null;
  qty: number;
  weight_gram: number;
  rate_per_gram: number;
  making_charge: number;
  amount: number;
}
export interface BillData {
  invoice_no: string;
  sale_date: string;
  shop: BillShop;
  customer: BillCustomer | null;
  items: BillItem[];
  subtotal: number;
  making_total: number;
  discount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  paid: number;
  due: number;
  payment_mode: string;
  notes?: string | null;
}

export function generateBillPDF(d: BillData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  // Shop header
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text(d.shop.shop_name, W / 2, y, { align: "center" });
  y += 18;
  doc.setFont("helvetica", "normal").setFontSize(9);
  if (d.shop.address) { doc.text(d.shop.address, W / 2, y, { align: "center" }); y += 12; }
  const meta = [d.shop.phone && "Tel: " + d.shop.phone, d.shop.email, d.shop.pan_vat && (d.vat_rate ? "PAN/VAT: " : "PAN: ") + d.shop.pan_vat]
    .filter(Boolean).join("  |  ");
  if (meta) { doc.text(meta, W / 2, y, { align: "center" }); y += 14; }

  doc.setLineWidth(0.5).line(40, y, W - 40, y); y += 18;

  // Invoice + customer block
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(d.vat_rate ? "TAX INVOICE" : "INVOICE", 40, y);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(`Invoice #: ${d.invoice_no}`, W - 40, y, { align: "right" }); y += 14;
  doc.text(`Date: ${d.sale_date}`, W - 40, y, { align: "right" });

  if (d.customer) {
    doc.setFont("helvetica", "bold").text("Bill To:", 40, y); y += 12;
    doc.setFont("helvetica", "normal").text(d.customer.name, 40, y); y += 12;
    if (d.customer.phone) { doc.text("Phone: " + d.customer.phone, 40, y); y += 12; }
    if (d.customer.address) { doc.text(d.customer.address, 40, y); y += 12; }
    if (d.customer.pan) { doc.text("PAN: " + d.customer.pan, 40, y); y += 12; }
  } else {
    doc.text("Walk-in customer", 40, y); y += 12;
  }
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Metal/Purity", "Qty", "Wt (g)", "Rate/g", "Making", "Amount"]],
    body: d.items.map((it, i) => [
      String(i + 1),
      it.description,
      `${it.metal}${it.purity ? " " + it.purity : ""}`,
      String(it.qty),
      Number(it.weight_gram).toFixed(3),
      formatNPR(it.rate_per_gram),
      formatNPR(it.making_charge),
      formatNPR(it.amount),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [185, 140, 60], textColor: 255 },
    columnStyles: { 0: { cellWidth: 25 } },
    margin: { left: 40, right: 40 },
  });

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  const rx = W - 40, lx = W - 220;
  let ty = finalY;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, lx, ty);
    doc.text(value, rx, ty, { align: "right" });
    ty += 14;
  };
  row("Subtotal (metal):", formatNPR(d.subtotal));
  row("Making charges:", formatNPR(d.making_total));
  if (d.discount) row("Discount:", "- " + formatNPR(d.discount));
  if (d.vat_rate) row(`VAT (${d.vat_rate}%):`, formatNPR(d.vat_amount));
  doc.setLineWidth(0.5).line(lx, ty - 6, rx, ty - 6);
  row("TOTAL:", formatNPR(d.total), true);
  row("Paid:", formatNPR(d.paid));
  row("Due:", formatNPR(d.due), d.due > 0);

  ty += 10;
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Payment mode: ${d.payment_mode}`, 40, ty);
  if (d.notes) { ty += 12; doc.text("Notes: " + d.notes, 40, ty); }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setFontSize(8).setTextColor(120);
  doc.text(d.shop.bill_footer || "Thank you for your business!", W / 2, footerY, { align: "center" });

  return doc;
}

export async function downloadBill(d: BillData) {
  const doc = generateBillPDF(d);
  
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${d.invoice_no}.pdf`,
        types: [{
          description: "PDF Document",
          accept: { "application/pdf": [".pdf"] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(doc.output("blob"));
      await writable.close();
      return;
    } catch (err: any) {
      // If the user cancelled the dialog, stop here to avoid downloading anyway
      if (err.name === "AbortError") return;
      console.warn("File System Access API failed, falling back to default download:", err);
    }
  }

  // Fallback for browsers that don't support showSaveFilePicker
  doc.save(`${d.invoice_no}.pdf`);
}

export function printBill(d: BillData) {
  const doc = generateBillPDF(d);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
