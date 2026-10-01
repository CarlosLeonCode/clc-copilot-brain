/**
 * Lightweight, zero-dependency JSON Schema validator
 * Compliant with JSON Schema draft 2020-12 basic structural constraints used in Copilot Brain
 */

export function isTypeMatch(val, expectedType) {
  if (expectedType === 'string') return typeof val === 'string';
  if (expectedType === 'boolean') return typeof val === 'boolean';
  if (expectedType === 'null') return val === null;
  if (expectedType === 'array') return Array.isArray(val);
  if (expectedType === 'object') return typeof val === 'object' && val !== null && !Array.isArray(val);
  if (expectedType === 'number') return typeof val === 'number' && !Number.isNaN(val);
  if (expectedType === 'integer') return typeof val === 'number' && Number.isInteger(val);
  return true;
}

export function validateSchema(data, schema, path = '') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  // Type assertion
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = types.some((t) => isTypeMatch(data, t));
    if (!matches) {
      errors.push(`${path || 'root'}: expected type ${types.join('|')}, got ${Array.isArray(data) ? 'array' : typeof data}`);
      return errors; // Skip child constraints if type is wrong
    }
  }

  // Enum assertion
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path || 'root'}: value ${JSON.stringify(data)} not in enum [${schema.enum.join(', ')}]`);
  }

  // String assertions
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path || 'root'}: string length ${data.length} < minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path || 'root'}: string length ${data.length} > maxLength ${schema.maxLength}`);
    }
    if (schema.pattern) {
      const reg = new RegExp(schema.pattern);
      if (!reg.test(data)) {
        errors.push(`${path || 'root'}: string "${data}" does not match pattern ${schema.pattern}`);
      }
    }
    if (schema.format === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) {
        errors.push(`${path || 'root'}: "${data}" is not a valid date format (YYYY-MM-DD)`);
      }
    }
  }

  // Number / Integer assertions
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path || 'root'}: value ${data} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path || 'root'}: value ${data} > maximum ${schema.maximum}`);
    }
  }

  // Array assertions
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path || 'root'}: array items count ${data.length} < minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${path || 'root'}: array items count ${data.length} > maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      data.forEach((item, index) => {
        errors.push(...validateSchema(item, schema.items, `${path}[${index}]`));
      });
    }
  }

  // Object assertions
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    if (schema.required && Array.isArray(schema.required)) {
      for (const reqField of schema.required) {
        if (!(reqField in data) || data[reqField] === undefined) {
          errors.push(`${path ? `${path}.${reqField}` : reqField} is required`);
        }
      }
    }
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in data && data[propName] !== undefined) {
          errors.push(...validateSchema(data[propName], propSchema, path ? `${path}.${propName}` : propName));
        }
      }
    }
  }

  return errors;
}
