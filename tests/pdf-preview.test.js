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
if (!/src="js\/app\.js\?v=4\.[5-9]"/i.test(html)) {
  throw new Error('App script cache key must be bumped so browsers load the fixed PDF viewer');
}

const viewerStart = source.indexOf('async function openFileViewer');
const viewerEnd = source.indexOf('function closeFileViewer', viewerStart);
const viewerSource = source.slice(viewerStart, viewerEnd);
const conversionStart = source.indexOf('function dataUrlToBlob');
const conversionEnd = source.indexOf('function blobToDataUrl', conversionStart);
const conversionSource = source.slice(conversionStart, conversionEnd);
if (!conversionSource.includes('atob(payload)') || !viewerSource.includes('URL.createObjectURL(fileBlob)') || !viewerSource.includes('<iframe')) {
  throw new Error('PDF viewer must convert legacy data URLs and embed a Blob URL in an iframe');
}

if (!source.includes('const MAX_UPLOAD_BYTES = 10 * 1024 * 1024') || !source.includes('1600 / Math.max(bitmap.width, bitmap.height)')) {
  throw new Error('Upload validation must enforce the 10 MB limit and 1600 px image dimension cap');
}

console.log('PDF preview test passed');
