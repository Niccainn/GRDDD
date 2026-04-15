export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'url'
  | 'phone'
  | 'file_upload'
  | 'heading'
  | 'divider';

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select/multiselect
  validation?: { min?: number; max?: number; pattern?: string };
  width?: 'full' | 'half';
};

export type FormSettings = {
  submitLabel?: string;
  successMessage?: string;
  redirectUrl?: string;
  notifyOnSubmit?: boolean;
};

export function generateFieldId(): string {
  return 'f_' + Math.random().toString(36).slice(2, 10);
}

export function createDefaultField(type: FieldType): FormField {
  const base: FormField = {
    id: generateFieldId(),
    type,
    label: fieldTypeLabel(type),
    required: false,
    width: 'full',
  };

  if (type === 'select' || type === 'multiselect') {
    base.options = ['Option 1', 'Option 2'];
  }

  if (type === 'email') {
    base.placeholder = 'email@example.com';
  }

  if (type === 'url') {
    base.placeholder = 'https://';
  }

  if (type === 'phone') {
    base.placeholder = '+1 (555) 000-0000';
  }

  if (type === 'heading') {
    base.label = 'Section heading';
  }

  return base;
}

export function fieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: 'Text',
    textarea: 'Textarea',
    email: 'Email',
    number: 'Number',
    select: 'Select',
    multiselect: 'Multi-select',
    checkbox: 'Checkbox',
    date: 'Date',
    url: 'URL',
    phone: 'Phone',
    file_upload: 'File upload',
    heading: 'Heading',
    divider: 'Divider',
  };
  return labels[type] ?? type;
}

export function parseFields(raw: string): FormField[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function parseSettings(raw: string): FormSettings {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    || 'form';
}

export const FIELD_CATEGORIES = [
  {
    name: 'Input',
    types: ['text', 'textarea', 'email', 'number', 'phone', 'url'] as FieldType[],
  },
  {
    name: 'Choice',
    types: ['select', 'multiselect', 'checkbox'] as FieldType[],
  },
  {
    name: 'Date',
    types: ['date'] as FieldType[],
  },
  {
    name: 'Layout',
    types: ['heading', 'divider'] as FieldType[],
  },
];

export function validateSubmission(
  fields: FormField[],
  data: Record<string, unknown>,
): string[] {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.type === 'heading' || field.type === 'divider') continue;

    const value = data[field.id];

    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.label} is required`);
        continue;
      }
    }

    if (value === undefined || value === null || value === '') continue;

    if (field.type === 'email' && typeof value === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field.label} must be a valid email`);
      }
    }

    if (field.type === 'url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        errors.push(`${field.label} must be a valid URL`);
      }
    }

    if (field.type === 'number' && field.validation) {
      const num = Number(value);
      if (field.validation.min !== undefined && num < field.validation.min) {
        errors.push(`${field.label} must be at least ${field.validation.min}`);
      }
      if (field.validation.max !== undefined && num > field.validation.max) {
        errors.push(`${field.label} must be at most ${field.validation.max}`);
      }
    }
  }

  return errors;
}
