import { ABIDataTypes } from '@btc-vision/transaction';
import { StrToAbiType } from '../StrToAbiType.js';

const TUPLE_RE = /^tuple\(([^)]+)\)\[\]$/;

/**
 * Returns true if the string looks like a tuple type, e.g. "tuple(address,uint256)[]".
 */
export function isTupleString(str: string): boolean {
    return TUPLE_RE.test(str);
}

/**
 * Extracts the inner comma-separated types from a tuple string.
 * E.g. "tuple(address,uint256)[]" -> ["address", "uint256"]
 */
export function parseTupleTypes(str: string): string[] {
    const match = TUPLE_RE.exec(str);
    if (!match) return [];
    return match[1].split(',').map((s) => s.trim());
}

/**
 * Attempts to resolve a tuple string to a known ABIDataTypes value.
 * Returns undefined if the tuple is not recognized.
 */
export function resolveTupleToAbiType(str: string): ABIDataTypes | undefined {
    return StrToAbiType[str];
}
