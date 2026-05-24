// 模块配置 - 类型定义
export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'attachment' | 'section';

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  customOptionKey?: string;
  repeatable?: boolean;
  listName?: string;
  multiple?: boolean;
}

export interface WorkTab {
  id: string;
  label: string;
  fields?: FieldDefinition[];
}

export interface WorkModule {
  id: string;
  label: string;
  departmentId: string;
  departmentLabel: string;
  description: string;
  iconName?: string;
  hideTemplateSelector?: boolean;
  tabs: WorkTab[];
}

export interface NavDepartment {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  modules: WorkModule[];
}
