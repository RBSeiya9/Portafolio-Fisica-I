const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const start = source.indexOf('function isSafeAssetUrl');
const end = source.indexOf('function formatBytes');

if (start === -1 || end === -1 || end <= start) {
  throw new Error('No se encontró el bloque de utilidades de URLs seguras en js/app.js');
}

const snippet = source.slice(start, end);
const sandbox = { console };
vm.runInNewContext(snippet, sandbox);

const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQK';
const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAF';

const pdfResult = sandbox.safeObjectUrl(pdfDataUrl, '');
const imageResult = sandbox.safeObjectUrl(imageDataUrl, '');

if (pdfResult !== pdfDataUrl) {
  throw new Error(`PDF preview should keep the original data URL. Got: ${pdfResult}`);
}

if (imageResult !== imageDataUrl) {
  throw new Error(`Image preview should keep the original data URL. Got: ${imageResult}`);
}

const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1] || '';
const objectSource = csp.match(/(?:^|;\s*)object-src\s+([^;]+)/i)?.[1] || '';
if (!objectSource.split(/\s+/).includes('data:')) {
  throw new Error('Content Security Policy must allow data: URLs for embedded PDF previews');
}

console.log('PDF preview test passed');
