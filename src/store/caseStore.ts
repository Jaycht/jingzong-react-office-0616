/**
 * 案件数据存储
 * 使用 localStorage 持久化，在新建案件和每日工作记录间共享
 */

import { localStorageAdapter } from './adapter';

export interface SquadCase {
  id: string;
  caseNo: string;
  filingDocNo: string;
  caseName: string;
  caseSource: string;
  caseType: string;
  totalAmount: number;
  victimCount: number;
  receiveDate: string;
  filingDate: string;
  noFilingDate: string;
  leadOfficer: string;
  assistOfficer: string;
  transferRecord: string;
  receiveDateShow: string;
  filingDateShow: string;
  investigationCount: number;
  criminalDetentionCount: number;
  bailCount: number;
  arrestCount: number;
  investEndDate: string;
  prosecutionDate: string;
  caseCloseDate: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'jingzong.squad.cases';

export function getCases(): SquadCase[] {
  return localStorageAdapter.getItem<SquadCase[]>(STORAGE_KEY, []);
}

export function saveCase(data: Omit<SquadCase, 'id' | 'createdAt' | 'updatedAt'>): SquadCase {
  const cases = getCases();
  const now = new Date().toISOString();
  const newCase: SquadCase = {
    ...data,
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  cases.unshift(newCase);
  localStorageAdapter.setItem(STORAGE_KEY, cases);
  return newCase;
}

export function updateCase(id: string, patch: Partial<SquadCase>): SquadCase | null {
  const cases = getCases();
  const index = cases.findIndex((c) => c.id === id);
  if (index === -1) return null;
  cases[index] = { ...cases[index], ...patch, updatedAt: new Date().toISOString() };
  localStorageAdapter.setItem(STORAGE_KEY, cases);
  return cases[index];
}

export function deleteCase(id: string): void {
  const cases = getCases().filter((c) => c.id !== id);
  localStorageAdapter.setItem(STORAGE_KEY, cases);
}
