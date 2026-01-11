
import { UserData, FinanceEntry } from '../types';
import { localDb } from './localDbService';

declare global {
  interface Window {
    gapi: any;
    google: any;
    showDirectoryPicker: any;
  }
}

const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_PLACEHOLDER'; 
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file";

const FILE_NAME = 'finaa_vault_v1.json';
const SHEET_NAME = 'FinAA - Financial Archive (Live)';
const ROOT_FOLDER_NAME = 'FinAA Archive';
const STORAGE_IDB_KEY = 'finaa_vault_blob';

export class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private directoryHandle: any = null;
  public isConfigured: boolean = !CLIENT_ID.includes('PLACEHOLDER');
  public mode: 'drive' | 'local-db' | 'local-fs' = 'local-db';

  async init() {
    await localDb.init();
    if (!this.isConfigured) return;

    return new Promise<void>((resolve, reject) => {
      if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') {
        resolve(); // Fallback to local
        return;
      }

      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
              if (response.error !== undefined) return;
              this.accessToken = response.access_token;
            },
          });
          resolve();
        } catch (err) {
          resolve(); 
        }
      });
    });
  }

  async login(mode: 'drive' | 'local-db' | 'local-fs'): Promise<boolean> {
    this.mode = mode;
    if (mode === 'drive') {
      if (!this.isConfigured) throw new Error("Google Drive integration not configured.");
      return new Promise((resolve, reject) => {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
        const checkToken = setInterval(() => {
          if (this.accessToken) {
            clearInterval(checkToken);
            resolve(true);
          }
        }, 500);
        setTimeout(() => {
          clearInterval(checkToken);
          if (!this.accessToken) reject(new Error("Login timed out."));
        }, 60000);
      });
    }

    if (mode === 'local-fs') {
      try {
        this.directoryHandle = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        return true;
      } catch (err) {
        console.error("FS Access Denied", err);
        throw new Error("Local folder access is required for this mode.");
      }
    }

    return true; // local-db
  }

  async archiveStatement(base64: string, mimeType: string, accountName: string, date: string): Promise<string | null> {
    const fileName = `Statement_${date}_${Math.random().toString(36).slice(2, 6)}.png`;

    if (this.mode === 'local-fs' && this.directoryHandle) {
      try {
        const rootHandle = await this.directoryHandle.getDirectoryHandle(ROOT_FOLDER_NAME, { create: true });
        const monthStr = date.slice(0, 7);
        const monthHandle = await rootHandle.getDirectoryHandle(monthStr, { create: true });
        const accountHandle = await monthHandle.getDirectoryHandle(accountName, { create: true });
        
        const fileHandle = await accountHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        await writable.write(byteArray);
        await writable.close();
        return `fs://${monthStr}/${accountName}/${fileName}`;
      } catch (e) {
        console.error("FS Archive failed", e);
        return null;
      }
    }

    if (this.mode === 'drive') {
      try {
        const rootId = await this.ensureFolder(ROOT_FOLDER_NAME);
        const monthStr = date.slice(0, 7);
        const monthId = await this.ensureFolder(monthStr, rootId);
        const accountId = await this.ensureFolder(accountName, monthId);
        return await this.uploadBinaryFile(base64, mimeType, fileName, accountId);
      } catch (e) {
        console.error("Drive Archive failed", e);
        return null;
      }
    }

    // Default: store blob in IndexedDB separately to keep main JSON small
    const blobKey = `blob_${fileName}`;
    await localDb.save(blobKey, { base64, mimeType, date });
    return `idb://${blobKey}`;
  }

  async saveData(data: UserData): Promise<void> {
    if (this.mode === 'local-fs' && this.directoryHandle) {
      const fileHandle = await this.directoryHandle.getFileHandle(FILE_NAME, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data));
      await writable.close();
      return;
    }

    if (this.mode === 'drive') {
      const fileId = await this.findFile(FILE_NAME);
      const metadata = { name: FILE_NAME, mimeType: 'application/json' };
      const fileContent = JSON.stringify(data);
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

      await window.gapi.client.request({
        path: fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
        method: fileId ? 'PATCH' : 'POST',
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body: multipartRequestBody,
      });
      return;
    }

    // local-db mode
    await localDb.save(STORAGE_IDB_KEY, data);
  }

  async downloadData(fileIdOrName: string): Promise<UserData> {
    if (this.mode === 'local-fs' && this.directoryHandle) {
      const fileHandle = await this.directoryHandle.getFileHandle(FILE_NAME);
      const file = await fileHandle.getFile();
      return JSON.parse(await file.text());
    }

    if (this.mode === 'drive') {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileIdOrName,
        alt: 'media',
      });
      return response.result;
    }

    const data = await localDb.get(STORAGE_IDB_KEY);
    if (!data) throw new Error("Vault not found in Local Storage.");
    return data;
  }

  async findFile(name: string, parentId?: string): Promise<string | null> {
    if (this.mode === 'local-fs') return 'fs-vault';
    if (this.mode === 'local-db') return 'idb-vault';

    let query = `name = '${name}' and trashed = false`;
    if (parentId) query += ` and '${parentId}' in parents`;
    
    const response = await window.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.result.files;
    return files && files.length > 0 ? files[0].id : null;
  }

  async ensureFolder(name: string, parentId?: string): Promise<string> {
    const existing = await this.findFile(name, parentId);
    if (existing) return existing;

    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];

    const response = await window.gapi.client.drive.files.create({
      resource: metadata,
      fields: 'id',
    });
    return response.result.id;
  }

  async uploadBinaryFile(base64: string, mimeType: string, fileName: string, parentId: string): Promise<string> {
    const metadata = { name: fileName, parents: [parentId] };
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64 +
      close_delim;

    const response = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartRequestBody,
    });
    return response.result.id;
  }

  async syncToSpreadsheet(entries: FinanceEntry[]): Promise<string | null> {
    if (this.mode !== 'drive') return null;
    const sheetId = await this.findFile(SHEET_NAME);
    const headers = ['Date', 'Name', 'Amount', 'Category', 'Type', 'Currency', 'Address', 'Ref #', 'Notes', 'Drive Link'];
    const rows = entries.map(e => [
      e.date,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      e.type,
      e.currency || 'USD',
      `"${(e.address || '').replace(/"/g, '""')}"`,
      `"${(e.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      e.statementDriveId ? (e.statementDriveId.startsWith('http') ? e.statementDriveId : `https://drive.google.com/file/d/${e.statementDriveId}/view`) : '""'
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const metadata = { name: SHEET_NAME, mimeType: 'application/vnd.google-apps.spreadsheet' };
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: text/csv\r\n\r\n' + csvContent + close_delim;

    const response = await window.gapi.client.request({
      path: sheetId ? `/upload/drive/v3/files/${sheetId}` : '/upload/drive/v3/files',
      method: sheetId ? 'PATCH' : 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartRequestBody,
    });
    return response.result.id;
  }
}

export const driveService = new GoogleDriveService();
