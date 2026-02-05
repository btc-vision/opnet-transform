import { ABIDataTypes } from '@btc-vision/transaction';
import { AbiTypeToStr, StrToAbiType } from '../StrToAbiType.js';

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

/**
 * Validates that all inner types of a tuple string are known ABI types.
 * Returns an array of invalid type names (empty array = all valid).
 *
 * E.g. `validateTupleInnerTypes("tuple(address,foobar)[]")` → `["foobar"]`
 */
export function validateTupleInnerTypes(str: string): string[] {
    const inner = parseTupleTypes(str);
    if (inner.length === 0) return [str]; // not a valid tuple string at all
    return inner.filter((t) => !(t in StrToAbiType));
}

/**
 * Converts inner types of a tuple string to their canonical ABI form via
 * StrToAbiType → AbiTypeToStr round-trip.
 *
 * E.g. `"tuple(Address,u256)[]"` → `"tuple(address,uint256)[]"`
 *
 * Returns `undefined` if any inner type is not recognized.
 */
export function canonicalizeTupleString(str: string): `tuple(${string})[]` | undefined {
    const inner = parseTupleTypes(str);
    if (inner.length === 0) return undefined;

    const canonical: string[] = [];
    for (const t of inner) {
        const abiType = StrToAbiType[t];
        if (abiType === undefined) return undefined;
        const canonicalName = AbiTypeToStr[abiType];
        if (!canonicalName) return undefined;
        canonical.push(canonicalName);
    }

    return `tuple(${canonical.join(',')})[]`;
}
