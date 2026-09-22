// Run with: node test-pdf.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { jsPDF } = require('./vendor/jspdf.umd.min.js');
const source = fs.readFileSync('app.js', 'utf8');
const state = {
  business: { name: 'Example Studio', email: 'hello@example.com', address: '123 Sample Street' },
  recipients: [{ id: 'client', name: 'Example Client', email: 'client@example.com', address: '456 Client Street' }],
  invoice: { recipientId: 'client', issueDate: '2026-09-22', dueDate: '2026-10-06', taxRate: 15, notes: 'Please pay by bank transfer.', items: [{ description: 'Design work', date: '2026-09-22', amount: '125.50' }] }
};
const context = vm.createContext({ state, window: { jspdf: { jsPDF } }, Intl });
vm.runInContext(source.slice(source.indexOf('function money('), source.indexOf('function updateTotals(')) + source.slice(source.indexOf('function dateLabel('), source.indexOf('function renderPdf(')), context);
assert.equal(vm.runInContext('pdfFileName()', context), 'Invoice 2026-09-22 from Example Studio.pdf');
state.business.name = 'Example: Studio / NZ';
assert.equal(vm.runInContext('pdfFileName()', context), 'Invoice 2026-09-22 from Example Studio NZ.pdf');
state.business.name = 'Example Studio';
assert.equal(vm.runInContext('totals().total', context), 12550);
let pdf = vm.runInContext('buildPdf()', context);
assert.equal(pdf.getNumberOfPages(), 1);
assert.ok(pdf.output().startsWith('%PDF-'));
assert.ok(pdf.output().includes('Example Client'));
assert.ok(pdf.output().includes('Design work'));
assert.ok(pdf.output().includes('Total due'));
assert.ok(pdf.output().includes('$125.50'));
assert.ok(!pdf.output().includes('NZ$'));
assert.ok(!pdf.output().includes('AMOUNT (NZD)'));
assert.ok(!pdf.output().includes('Tax ('));
assert.ok(!pdf.output().includes('Subtotal'));
state.invoice.items = Array.from({ length: 100 }, (_, i) => ({ description: `Service ${i + 1}: ` + 'Detailed work description. '.repeat(6), date: '2026-09-22', amount: '10.01' }));
state.invoice.notes = 'Payment information. '.repeat(500);
pdf = vm.runInContext('buildPdf()', context);
assert.ok(pdf.getNumberOfPages() > 5);
assert.ok(pdf.output().includes('Service 100:'));
assert.equal(vm.runInContext('totals().total', context), 100100);
state.invoice.items = [{ description: 'Long item '.repeat(1000), date: '2026-09-22', amount: '0' }];
pdf = vm.runInContext('buildPdf()', context);
assert.ok(pdf.getNumberOfPages() > 1);
assert.equal(vm.runInContext('totals().total', context), 0);
console.log('PDF checks passed: invoice content, cent rounding, totals, 100 items, long descriptions, and multipage notes.');
