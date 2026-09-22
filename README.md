# Invoice Studio

A static, client-side invoice generator. Open `index.html` in a modern browser, or serve this folder with any static web host. No build step or backend is required.

- Save business details and reusable recipients in localStorage.
- Select a recipient, add dated line items with final amounts in NZD, and optionally add payment notes.
- Preview the actual PDF while editing, including automatic page breaks.
- Download the invoice as a PDF using the browser's download location or Save As dialog.
- Keep the current draft across reloads. Starting a new invoice increments the invoice number and retains business details and payment preferences.

Data is stored per browser and site address. Clearing browser data removes it; private browsing may not retain it. Only the current draft is stored, so download completed invoices before starting another. Recipients can be edited using the pencil button or deleted from their edit dialog. PDF generation happens on the device; no invoice data is sent to a server. The optional Google Fonts stylesheet loads fonts from Google; the app uses system fonts when offline.

The bundled jsPDF library is distributed under its included MIT license. Its standard PDF fonts support Latin text; other writing systems require embedding an appropriate font. The live preview uses the browser's built-in PDF viewer, which may not display inline on some mobile browsers; the PDF download remains available.
