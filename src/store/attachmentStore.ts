/**
 * 附件存储 - 基于 IndexedDB
 * 离线存储文件二进制，支持文件上传/下载/删除/备份恢复
 */

const DB_NAME = 'jingzong-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export interface AttachmentRecord {
  id: string;
  recordId: string;
  moduleId: string;
  fieldId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  data: ArrayBuffer;
  uploadedAt: string;
}

export interface AttachmentReference {
  id: string;
  uid: string;
  name: string;
  status: 'done';
  size: number;
  type: string;
  uploadedAt: string;
}

export interface AttachmentBackupItem {
  id: string;
  recordId: string;
  moduleId: string;
  fieldId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  dataBase64: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('recordId', 'recordId', { unique: false });
        store.createIndex('moduleId', 'moduleId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function toAttachmentReference(record: AttachmentRecord): AttachmentReference {
  return {
    id: record.id,
    uid: record.id,
    name: record.fileName,
    status: 'done',
    size: record.fileSize,
    type: record.fileType,
    uploadedAt: record.uploadedAt,
  };
}

/** 保存文件到 IndexedDB */
export async function saveAttachment(
  recordId: string,
  moduleId: string,
  fieldId: string,
  file: File,
): Promise<AttachmentRecord> {
  const db = await openDB();
  const buffer = await file.arrayBuffer();
  const record: AttachmentRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordId,
    moduleId,
    fieldId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    data: buffer,
    uploadedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/** 读取文件数据 */
export async function getAttachment(id: string): Promise<AttachmentRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** 获取全部附件 */
export async function getAllAttachments(): Promise<AttachmentRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** 获取某条记录的所有附件 */
export async function getAttachmentsByRecord(recordId: string): Promise<AttachmentRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('recordId');
    const req = index.getAll(recordId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** 获取某个模块的所有附件 */
export async function getAttachmentsByModule(moduleId: string): Promise<AttachmentRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('moduleId');
    const req = index.getAll(moduleId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** 更新附件所属记录 */
export async function relinkAttachment(id: string, recordId: string): Promise<void> {
  const db = await openDB();
  const record = await getAttachment(id);
  if (!record) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ ...record, recordId });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** 删除附件 */
export async function deleteAttachment(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** 清空全部附件 */
export async function clearAttachments(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** 下载附件 */
export async function downloadAttachment(id: string): Promise<void> {
  const att = await getAttachment(id);
  if (!att) throw new Error('附件不存在');
  const blob = new Blob([att.data], { type: att.fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 获取附件统计 */
export async function getAttachmentStats(): Promise<{ count: number; totalBytes: number }> {
  const attachments = await getAllAttachments();
  return {
    count: attachments.length,
    totalBytes: attachments.reduce((sum, item) => sum + item.fileSize, 0),
  };
}

/** 获取所有附件总数 */
export async function getAttachmentCount(): Promise<number> {
  const stats = await getAttachmentStats();
  return stats.count;
}

/** 导出附件快照，用于完整备份 */
export async function exportAttachmentSnapshot(): Promise<AttachmentBackupItem[]> {
  const attachments = await getAllAttachments();
  return attachments.map((item) => ({
    id: item.id,
    recordId: item.recordId,
    moduleId: item.moduleId,
    fieldId: item.fieldId,
    fileName: item.fileName,
    fileType: item.fileType,
    fileSize: item.fileSize,
    uploadedAt: item.uploadedAt,
    dataBase64: arrayBufferToBase64(item.data),
  }));
}

/** 从备份快照恢复附件 */
export async function importAttachmentSnapshot(items: AttachmentBackupItem[]): Promise<number> {
  if (items.length === 0) {
    await clearAttachments();
    return 0;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();

  for (const item of items) {
    const record: AttachmentRecord = {
      id: item.id,
      recordId: item.recordId,
      moduleId: item.moduleId,
      fieldId: item.fieldId,
      fileName: item.fileName,
      fileType: item.fileType,
      fileSize: item.fileSize,
      uploadedAt: item.uploadedAt,
      data: base64ToArrayBuffer(item.dataBase64),
    };
    store.put(record);
  }

  await transactionDone(tx);
  return items.length;
}
