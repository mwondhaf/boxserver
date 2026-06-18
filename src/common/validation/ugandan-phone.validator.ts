import { registerDecorator, type ValidationOptions } from 'class-validator';
import { parsePhoneNumber } from 'libphonenumber-js';

export function parseUgandanPhone(value: string): string {
  const parsed = parsePhoneNumber(value.trim(), 'UG');
  if (!parsed.isValid() || parsed.country !== 'UG') {
    throw new Error('Not a valid Ugandan phone number');
  }
  return parsed.number;
}

export function IsUgandanPhone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isUgandanPhone',
      target: object.constructor,
      propertyName,
      options: {
        message: `$property must be a valid Ugandan phone number`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || !value.trim()) return false;
          try {
            parseUgandanPhone(value);
            return true;
          } catch {
            return false;
          }
        },
      },
    });
  };
}
