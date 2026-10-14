const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/app.js', 'utf8');
const dataUrlStart = source.indexOf('function dataUrlToBlob');
const migrationStart = source.indexOf('async function migrateEmbeddedFilesToIndexedDB');
const migrationEnd = source.indexOf('async function saveUploadedFile', migrationStart);
const backupStart = source.indexOf('function createBackupDatabase');
const backupEnd = source.indexOf('function dataUrlToBlob', backupStart);
const validatorStart = source.indexOf('function validateImportedPayload');
const validatorEnd = source.indexOf('function importBackupJSON', validatorStart);

if ([dataUrlStart, migrationStart, migrationEnd, backupStart, backupEnd, validatorStart, validatorEnd].some(index => index < 0) || dataUrlStart >= migrationStart) {
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
  sanitizeImportedId: value => typeof value === 'string' && /^[\w-]+$/.test(value),
  FileStorage: {
    async saveBlob(id, name, type, size, blob) {
      if (failWrites) return false;
      stored.set(id, { name, type, size, blob });
      return true;
    }
  }
};

vm.runInNewContext(source.slice(backupStart, backupEnd) + source.slice(validatorStart, validatorEnd) + source.slice(dataUrlStart, migrationEnd), sandbox);

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

  const legacyPayload = {
    version: 3,
    profile: {},
    topics: [],
    practiceFiles: [{ id: 'legacy-file', name: 'scan.pdf', data: 'data:application/pdf;base64,JVBERi0xLjQK' }],
    workshops: [{ id: 'legacy-workshop', title: 'Older workshop', statement: 'Legacy statement', stepByStep: 'Legacy work' }],
    exams: [{ id: 'legacy-exam', title: 'Older exam', identifiedError: 'Legacy error', correctSolution: 'Legacy solution' }],
    learnings: []
  };
  const normalizedLegacyPayload = sandbox.validateImportedPayload({ db: legacyPayload });
  if (!normalizedLegacyPayload || normalizedLegacyPayload.workshops[0].statement !== 'Legacy statement' || normalizedLegacyPayload.exams[0].identifiedError !== 'Legacy error') {
    throw new Error('Legacy import validation must preserve old workshop/exam fields');
  }

  const backupSource = structuredClone(legacyPayload);
  const backup = sandbox.createBackupDatabase(backupSource);
  if ('statement' in backup.workshops[0] || 'stepByStep' in backup.workshops[0] || 'identifiedError' in backup.exams[0] || 'correctSolution' in backup.exams[0]) {
    throw new Error('New backup projection must omit retired workshop/exam fields');
  }
  if (backupSource.workshops[0].statement !== 'Legacy statement' || backupSource.exams[0].identifiedError !== 'Legacy error') {
    throw new Error('New backup projection must not mutate the active database');
  }

  console.log('Storage migration and legacy-backup tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
