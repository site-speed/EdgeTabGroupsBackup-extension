export const RUNTIME_PROTOCOL_VERSION = 1;
export const RUNTIME_BUILD_ID = 'etgb-runtime-1';
export const REQUIRED_RUNTIME_CAPABILITIES = Object.freeze([
  'safe-default-folder',
  'window-marker',
  'marker-destination-match'
]);

export class RuntimeCompatibilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RuntimeCompatibilityError';
    this.code = code;
    this.details = details;
  }
}

export function createRuntimeMetadata(version) {
  return {
    version: String(version || 'unknown'),
    protocolVersion: RUNTIME_PROTOCOL_VERSION,
    buildId: RUNTIME_BUILD_ID,
    capabilities: [...REQUIRED_RUNTIME_CAPABILITIES]
  };
}

export function assertCompatibleRuntimeResponse(response, requiredCapabilities = REQUIRED_RUNTIME_CAPABILITIES) {
  if (!response || typeof response !== 'object') {
    throw new RuntimeCompatibilityError('NO_RESPONSE', 'The extension background worker did not respond.');
  }
  const runtime = response.runtime;
  if (!runtime || typeof runtime !== 'object') {
    throw new RuntimeCompatibilityError('MISSING_RUNTIME_METADATA', 'The extension UI and background worker are out of sync.');
  }
  if (runtime.protocolVersion !== RUNTIME_PROTOCOL_VERSION) {
    throw new RuntimeCompatibilityError('PROTOCOL_MISMATCH', 'The extension UI and background worker use incompatible protocols.', {
      expected: RUNTIME_PROTOCOL_VERSION,
      actual: runtime.protocolVersion
    });
  }
  if (runtime.buildId !== RUNTIME_BUILD_ID) {
    throw new RuntimeCompatibilityError('BUILD_MISMATCH', 'The extension UI and background worker are from different builds.', {
      expected: RUNTIME_BUILD_ID,
      actual: runtime.buildId
    });
  }
  if (typeof runtime.version !== 'string' || !runtime.version) {
    throw new RuntimeCompatibilityError('INVALID_RUNTIME_METADATA', 'The extension background worker returned incomplete runtime metadata.');
  }
  const capabilities = Array.isArray(runtime.capabilities) ? runtime.capabilities : [];
  const missing = requiredCapabilities.filter((capability) => !capabilities.includes(capability));
  if (missing.length) {
    throw new RuntimeCompatibilityError('MISSING_CAPABILITY', 'The extension background worker is missing required features.', { missing });
  }
  if (typeof response.ok !== 'boolean' || (!response.ok && (typeof response.error !== 'string' || !response.error))) {
    throw new RuntimeCompatibilityError('INVALID_RESPONSE_ENVELOPE', 'The extension background worker returned an invalid response.');
  }
  return response;
}

export async function sendCheckedMessage(runtime, type, payload = {}, requiredCapabilities = REQUIRED_RUNTIME_CAPABILITIES) {
  let response;
  try {
    response = await runtime.sendMessage({ ...payload, type });
  } catch (error) {
    throw new RuntimeCompatibilityError('MESSAGE_FAILED', String(error?.message || error), { cause: error });
  }
  return assertCompatibleRuntimeResponse(response, requiredCapabilities);
}

export function formatRuntimeCompatibilityError(error) {
  const detail = error instanceof RuntimeCompatibilityError ? error.message : String(error?.message || error);
  return `Extension update incomplete: ${detail} Reload the extension, then reopen this page.`;
}
