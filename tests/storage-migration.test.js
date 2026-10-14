const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/app.js', 'utf8');
const dataUrlStart = source.indexOf('function dataUrlToBlob');
const migrationStart = source.indexOf('async function migrateEmbeddedFilesToIndexedDB');
const migrationEnd = source.indexOf('async function saveUploadedFile', migrationStart);

if ([dataUrlStart, migrationStart, migrationEnd].some(index => index < 0) || dataUrlStart >= migrationStart) {
  throw new Error('No se encontraron las funciones de migración de archivos en js/app.js');
}

const stored = new Map();
let failWrites = false;
const sandbox = {
  Blob,
  Uint8Array,
  atob,
  structuredClone,
  generateUniqueId: prefix => `${prefix}_generated`,
  appDB: {},
  saveDatabase: () => true,
  FileStorage: {
    async saveBlob(id, name, type, size, blob) {
      if (failWrites) return false;
      stored.set(id, { name, type, size, blob });
      return true;
    }
  }
};

vm.runInNewContext(source.slice(dataUrlStart, migrationEnd), sandbox);

(async () => {
  const legacyData = 'data:image/png;base64,AAECAwQ=';
  const database = {
    topics: [{ id: 'topic-1', definitions: [{ id: 'card-1', imageData: legacyData }], formulas: [], metacognition: [], evidencias: [] }],
    practiceFiles: [{ id: 'practice-1', name: 'test.pdf', type: 'application/pdf', data: 'data:application/pdf;base64,JVBERi0xLjQK' }],
    workshops: [{ id: 'workshop-1', files: [{ id: 'attachment-1', name: 'photo.png', type: 'image/png', data: legacyData }] }],
    exams: [],
    learnings: []
  };

  const migrated = await sandbox.migrateEmbeddedFilesToIndexedDB(database);
  if (!migrated) throw new Error('Expected first migration to change legacy data');
  if (database.topics[0].definitions[0].imageData !== undefined) throw new Error('Inline card base64 remains in the database');
  if (database.practiceFiles[0].data !== undefined) throw new Error('Inline practice-file base64 remains in the database');
  if (database.workshops[0].files[0].data !== undefined) throw new Error('Inline attachment base64 remains in the database');
  if (!database.topics[0].definitions[0].imageFileId || !stored.has(database.topics[0].definitions[0].imageFileId)) throw new Error('Card file reference was not stored');
  if (await sandbox.migrateEmbeddedFilesToIndexedDB(database)) throw new Error('Second migration was not idempotent');

  const assets = { topics: [{ definitions: [{ id: 'asset-card', imageData: 'assets/imagenes/example.svg' }] }], practiceFiles: [], workshops: [], exams: [], learnings: [] };
  await sandbox.migrateEmbeddedFilesToIndexedDB(assets);
  if (assets.topics[0].definitions[0].imageAsset !== 'assets/imagenes/example.svg') throw new Error('Bundled asset path was not preserved');
  if (stored.size !== 3) throw new Error(`Expected three stored binaries, got ${stored.size}`);

  const failing = { topics: [{ definitions: [{ id: 'keep-card', imageData: legacyData }] }], practiceFiles: [], workshops: [], exams: [], learnings: [] };
  const originalValue = failing.topics[0].definitions[0].imageData;
  failWrites = true;
  let rejected = false;
  try {
    await sandbox.migrateEmbeddedFilesToIndexedDB(failing);
  } catch (error) {
    rejected = true;
  }
  if (!rejected || failing.topics[0].definitions[0].imageData !== originalValue) {
    throw new Error('IndexedDB failure must preserve the original database data');
  }

  console.log('Storage migration tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
