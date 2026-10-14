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
const frameSource = csp.match(/(?:^|;\s*)frame-src\s+([^;]+)/i)?.[1] || '';
if (!frameSource.split(/\s+/).includes('blob:')) {
  throw new Error('Content Security Policy must allow blob: frames for embedded PDF previews');
}
if (!html.includes('src="js/app.js?v=4.2"')) {
  throw new Error('App script cache key must be bumped so browsers load the fixed PDF viewer');
}

const viewerStart = source.indexOf('async function openFileViewer');
const viewerEnd = source.indexOf('function closeFileViewer', viewerStart);
const viewerSource = source.slice(viewerStart, viewerEnd);
if (!viewerSource.includes('atob(payload)') || !viewerSource.includes('new Blob([pdfBlob], { type: "application/pdf" })') || !viewerSource.includes('<iframe')) {
  throw new Error('PDF viewer must decode data URLs locally and embed a Blob URL in an iframe');
}

console.log('PDF preview test passed');
