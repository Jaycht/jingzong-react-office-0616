/**
 * 附件存储 - 基于 IndexedDB
 * 离线存储文件二进制，支持文件上传/下载/删除
 */

const DB_NAME = 'jingzong-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface AttachmentRecord {
  id: string;
  recordId: string;       // 关联的工作记录ID
  moduleId: string;       // 模块ID
  fieldId: string;        // 字段ID
  fileName: string;
  fileType: string;
  fileSize: number;
  data: ArrayBuffer;
  uploadedAt: string;
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

/** 下载附件（触发浏览器下载） */
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

/** 获取所有附件总数 */
export async function getAttachmentCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
