// 模块配置 - 统一导出
export type {
  FieldType, FieldDefinition, WorkTab, WorkModule, NavDepartment,
} from './types';

export { fieldsFor } from './fields';
export { DEPARTMENTS, PLATFORM_NAV, ICONS } from './departments';

export const getBaseModules = () => DEPARTMENTS.flatMap((dept) => dept.modules);

export const findModule = (id: string, modules = getBaseModules()) =>
  modules.find((item) => item.id === id);
