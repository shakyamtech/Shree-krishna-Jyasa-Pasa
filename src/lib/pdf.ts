import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNPR, toBS } from "./format";

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
  jarti_percent: number;
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

let fontPromise: Promise<string | null> | null = null;
let fontData: string | null = null;

// Ensure font is loaded before PDF generation
async function loadFonts(): Promise<string | null> {
  if (fontData) return fontData;
  if (fontPromise) return fontPromise;

  fontPromise = (async () => {
    try {
      const res = await fetch("/noto-nepali.ttf");
      if (!res.ok) {
        console.error("Font file not found at /noto-nepali.ttf");
        return null;
      }
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf]);
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });
      fontData = data;
      return data;
    } catch (e) {
      console.error("Failed to load font:", e);
      return null;
    }
  })();

  return fontPromise;
}

// Start loading immediately in background
loadFonts().catch(() => {});

function hasDevanagari(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[\u0900-\u097F]/.test(text);
}

// Basic Devanagari reordering for simple cases
function prepareNepaliText(text: string | null | undefined): string {
  if (!text) return "";
  if (!hasDevanagari(text)) return text;
  return text.replace(/([\u0900-\u0939\u0958-\u095F])(\u093F)/g, "$2$1");
}

// Fixes Devanagari "spelling" by drawing it to a high-res canvas first
async function getNepaliImage(
  text: string,
  fontSize: number,
  isBold: boolean,
): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scale = 3; // Sharp enough for print
    const font = `${isBold ? "bold " : ""}${fontSize * scale}px "Noto Nepali", sans-serif`;

    ctx.font = font;
    const metrics = ctx.measureText(text);

    canvas.width = metrics.width + 10 * scale;
    canvas.height = fontSize * scale * 2.2;

    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    ctx.fillText(text, 5 * scale, canvas.height / 2);

    return {
      data: canvas.toDataURL("image/png"),
      w: canvas.width / scale,
      h: canvas.height / scale,
    };
  } catch (e) {
    return null;
  }
}

async function writeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: { align?: "left" | "center" | "right"; bold?: boolean; size?: number } = {},
) {
  const size = options.size || 10;
  const padding = 5; // Horizontal padding in the canvas helper
  if (hasDevanagari(text)) {
    try {
      const img = await getNepaliImage(text, size, !!options.bold);
      if (img) {
        let finalX = x;
        if (options.align === "center") finalX = x - img.w / 2;
        if (options.align === "right") finalX = x - img.w + padding;
        if (options.align === "left" || !options.align) finalX = x - padding;

        doc.addImage(img.data, "PNG", finalX, y - img.h / 2 - 1, img.w, img.h);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.text(prepareNepaliText(text), x, y, { align: options.align });
}

export async function generateBillPDF(d: BillData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  if (fontData) {
    doc.addFileToVFS("CustomFont.ttf", fontData);
    doc.addFont("CustomFont.ttf", "CustomFont", "normal");
  }

  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  await writeText(doc, d.shop.shop_name, W / 2, y, { align: "center", bold: true, size: 18 });
  y += 18;

  if (d.shop.address) {
    await writeText(doc, d.shop.address, W / 2, y, { align: "center", size: 9 });
    y += 12;
  }

  const meta = [
    d.shop.phone && "Tel: " + d.shop.phone,
    d.shop.email,
    d.shop.pan_vat && (d.vat_rate ? "PAN/VAT: " : "PAN: ") + d.shop.pan_vat,
  ]
    .filter(Boolean)
    .join("  |  ");
  if (meta) {
    await writeText(doc, meta, W / 2, y, { align: "center", size: 9 });
    y += 14;
  }

  doc.setLineWidth(0.5).line(40, y, W - 40, y);
  y += 18;

  await writeText(doc, d.vat_rate ? "TAX INVOICE" : "INVOICE", 40, y, { bold: true, size: 13 });

  await writeText(doc, `Invoice #: ${d.invoice_no}`, W - 40, y, { align: "right", size: 10 });
  y += 14;
  await writeText(doc, `Date: ${d.sale_date}`, W - 40, y, { align: "right", size: 10 });
  y += 14;
  await writeText(doc, `मिति: ${toBS(d.sale_date)}`, W - 40, y, { align: "right", size: 10 });

  if (d.customer) {
    await writeText(doc, "Bill To:", 40, y, { bold: true, size: 10 });
    y += 12;
    await writeText(doc, d.customer.name, 40, y, { size: 10 });
    y += 12;
    if (d.customer.phone) {
      await writeText(doc, "Phone: " + d.customer.phone, 40, y, { size: 10 });
      y += 12;
    }
    if (d.customer.address) {
      await writeText(doc, d.customer.address, 40, y, { size: 10 });
      y += 12;
    }
    if (d.customer.pan) {
      await writeText(doc, "PAN: " + d.customer.pan, 40, y, { size: 10 });
      y += 12;
    }
  } else {
    await writeText(doc, "Walk-in customer", 40, y, { size: 10 });
    y += 12;
  }
  y += 6;

  // Pre-render images for table cells to ensure perfect spelling inside the table
  const tableImageMap: Record<string, { data: string; w: number; h: number } | null> = {};
  for (const it of d.items) {
    if (hasDevanagari(it.description) && !tableImageMap[it.description]) {
      tableImageMap[it.description] = await getNepaliImage(it.description, 9, false);
    }
    const metalPurity = `${it.metal}${it.purity ? " " + it.purity : ""}`;
    if (hasDevanagari(metalPurity) && !tableImageMap[metalPurity]) {
      tableImageMap[metalPurity] = await getNepaliImage(metalPurity, 9, false);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [
      ["#", "Description", "Metal/Purity", "Qty", "Wt (g)", "Jarti%", "Rate/g", "Making", "Amount"],
    ],
    body: d.items.map((it, i) => [
      String(i + 1),
      it.description,
      `${it.metal}${it.purity ? " " + it.purity : ""}`,
      String(it.qty),
      Number(it.weight_gram).toFixed(3),
      it.jarti_percent > 0 ? it.jarti_percent + "%" : "0",
      formatNPR(it.rate_per_gram),
      formatNPR(it.making_charge),
      formatNPR(it.amount),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [185, 140, 60], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 25 },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
    didParseCell: (data) => {
      const content = String(data.cell.raw || "");
      if (hasDevanagari(content)) {
        // Hide the original broken text so we can draw the perfect image over it
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
    didDrawCell: (data) => {
      const content = String(data.cell.raw || "");
      const img = tableImageMap[content];
      if (img && data.column.index !== 0) {
        // Don't replace the # column
        doc.addImage(
          img.data,
          "PNG",
          data.cell.x + 4,
          data.cell.y + data.cell.height / 2 - img.h / 2,
          img.w,
          img.h,
        );
      }
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  const rx = W - 40,
    lx = W - 220;
  let ty = finalY;

  const row = async (label: string, value: string, bold = false) => {
    await writeText(doc, label, lx, ty, { bold });
    await writeText(doc, value, rx, ty, { align: "right", bold });
    ty += 14;
  };
  await row("Subtotal (metal):", formatNPR(d.subtotal));
  await row("Making charges:", formatNPR(d.making_total));
  if (d.discount) await row("Discount:", "- " + formatNPR(d.discount));
  if (d.vat_rate) await row(`VAT (${d.vat_rate}%):`, formatNPR(d.vat_amount));

  ty += 4;
  await row("TOTAL:", formatNPR(d.total), true);
  await row("Paid:", formatNPR(d.paid));
  if (d.due > 0) await row("Due:", formatNPR(d.due), true);

  ty += 10;
  await writeText(doc, `Payment mode: ${d.payment_mode}`, 40, ty, { size: 9 });

  if (d.notes) {
    ty += 12;
    await writeText(doc, "Notes: " + d.notes, 40, ty, { size: 9 });
  }

  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setFontSize(8).setTextColor(120);
  doc.text(d.shop.bill_footer || "Thank you for your business!", W / 2, footerY, {
    align: "center",
  });

  return doc;
}

export async function downloadBill(d: BillData) {
  const fileName = `${d.invoice_no}${d.customer?.name ? " - " + d.customer.name : ""}.pdf`;
  try {
    await loadFonts();
    const doc = await generateBillPDF(d);

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (o: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: unknown) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "PDF Document", accept: { "application/pdf": [".pdf"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(doc.output("blob"));
        await writable.close();
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    doc.save(fileName);
  } catch (err) {
    console.error("Download failed", err);
    // Ultimate fallback - try to save with basic jsPDF
    try {
      const basicDoc = new jsPDF();
      basicDoc.text("Error generating detailed bill. Basic info:", 20, 20);
      basicDoc.text(`Invoice: ${d.invoice_no}`, 20, 40);
      basicDoc.text(`Total: ${formatNPR(d.total)}`, 20, 60);
      basicDoc.save("ERROR_REPORT_" + fileName);
    } catch (e) {
      console.error("Ultimate fallback failed", e);
    }
  }
}

export async function printBill(d: BillData) {
  try {
    await loadFonts();
    const doc = await generateBillPDF(d);
    doc.autoPrint();
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("Print failed", err);
  }
}
