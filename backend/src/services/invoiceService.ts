import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IOrder } from '../models/Order';

export async function generateInvoice(order: IOrder): Promise<string> {
  const dir = path.join(__dirname, '../../uploads/invoices');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `invoice-${order.orderId}.pdf`;
  const filepath = path.join(dir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).fillColor('#E65C00').text('AtlaShop', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text('Fresh Flour Delivered to Your Door', { align: 'center' });
    doc.moveDown();
    doc.strokeColor('#E65C00').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Invoice details
    doc.fillColor('#000').fontSize(12).text(`Invoice / Order Receipt`, { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
    doc.moveDown();

    // Customer details
    doc.fontSize(11).fillColor('#E65C00').text('Customer Details');
    doc.fillColor('#000').fontSize(10);
    doc.text(`Name: ${order.customerName}`);
    doc.text(`Phone: ${order.phoneNumber}`);
    doc.text(`Address: ${order.address}`);
    doc.text(`Pincode: ${order.pincode}`);
    if (order.landmark) doc.text(`Landmark: ${order.landmark}`);
    doc.moveDown();

    // Delivery info
    doc.fontSize(11).fillColor('#E65C00').text('Delivery Schedule');
    doc.fillColor('#000').fontSize(10);
    doc.text(`Date: ${order.deliveryDate}`);
    doc.text(`Slot: ${order.deliverySlot}`);
    doc.moveDown();

    // Products table
    doc.fontSize(11).fillColor('#E65C00').text('Products Ordered');
    doc.fillColor('#000').fontSize(10);
    doc.moveDown(0.3);

    // Table header
    const colX = [40, 240, 330, 400, 470];
    doc.fontSize(9).fillColor('#555');
    doc.text('Product', colX[0], doc.y, { width: 190 });
    doc.text('Size', colX[1], doc.y - doc.currentLineHeight(), { width: 80 });
    doc.text('Qty', colX[2], doc.y - doc.currentLineHeight(), { width: 60 });
    doc.text('Price', colX[3], doc.y - doc.currentLineHeight(), { width: 60 });
    doc.text('Total', colX[4], doc.y - doc.currentLineHeight(), { width: 60 });
    doc.moveDown(0.3);
    doc.strokeColor('#ccc').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);

    doc.fillColor('#000');
    order.products.forEach(p => {
      const y = doc.y;
      doc.text(p.productName, colX[0], y, { width: 190 });
      doc.text(p.size || '-', colX[1], y, { width: 80 });
      doc.text(String(p.quantity), colX[2], y, { width: 60 });
      doc.text(`₹${p.unitPrice.toFixed(2)}`, colX[3], y, { width: 60 });
      doc.text(`₹${p.totalPrice.toFixed(2)}`, colX[4], y, { width: 60 });
      doc.moveDown();
    });

    doc.strokeColor('#ccc').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    const rightX = 400;
    doc.text('Subtotal:', rightX, doc.y);
    doc.text(`₹${order.totalPrice.toFixed(2)}`, 470, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.text('Delivery Charge:', rightX, doc.y);
    doc.text(`₹${order.deliveryCharge.toFixed(2)}`, 470, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#E65C00');
    doc.text('TOTAL:', rightX, doc.y);
    doc.text(`₹${order.finalAmount.toFixed(2)}`, 470, doc.y - doc.currentLineHeight());
    doc.fillColor('#000').fontSize(10);
    doc.moveDown();
    doc.text(`Payment: ${order.paymentMethod.toUpperCase()} – ${order.paymentStatus.toUpperCase()}`);

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('Thank you for shopping with AtlaShop! Fresh flour, delivered with care.', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/invoices/${filename}`));
    stream.on('error', reject);
  });
}
