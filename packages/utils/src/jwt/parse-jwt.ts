export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

function isJsonValue<Value>(value: Value): value is Value & JsonValue {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  return Object.values(value).every(isJsonValue);
}

function isJsonObject<Value>(value: Value): value is Value & JsonObject {
  return value !== null && !Array.isArray(value) && typeof value === 'object' && isJsonValue(value);
}

/** Decode the payload of a JWT without verifying its signature, `undefined` for malformed tokens. */
export function parseJwt(token: string | undefined): JsonObject | undefined {
  const base64Url = (token ?? '').split('.')[1];
  if (!base64Url) return undefined;

  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json);
    return isJsonObject(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}
