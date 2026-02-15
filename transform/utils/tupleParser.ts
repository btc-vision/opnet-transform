import { ABIDataTypes } from '@btc-vision/transaction';
import { AbiTypeToStr, StrToAbiType } from '../StrToAbiType.js';
import { AbiType, TupleType } from '../interfaces/Abi.js';

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

/**
 * Parses a tuple string like "tuple(address,uint8)[]" into a structured ABIDataTypes array.
 * Returns undefined if any inner type cannot be resolved.
 *
 * E.g. "tuple(address,uint8)[]" → [ABIDataTypes.ADDRESS, ABIDataTypes.UINT8]
 */
export function parseTupleToStructuredArray(str: string): ABIDataTypes[] | undefined {
    const inner = parseTupleTypes(str);
    if (inner.length === 0) return undefined;

    const result: ABIDataTypes[] = [];
    for (const t of inner) {
        const abiType = StrToAbiType[t];
        if (abiType === undefined) return undefined;
        result.push(abiType);
    }
    return result;
}

/**
 * Type guard: returns true if the AbiType value is a structured tuple array (ABIDataTypes[]).
 */
export function isTupleArrayType(type: AbiType): type is TupleType {
    return Array.isArray(type);
}

/**
 * Converts a structured ABIDataTypes array back to a canonical tuple string
 * for use in selector computation.
 *
 * E.g. [ABIDataTypes.ADDRESS, ABIDataTypes.UINT8] → "tuple(address,uint8)[]"
 */
export function structuredArrayToTupleString(arr: ABIDataTypes[]): `tuple(${string})[]` {
    const names = arr.map((t) => AbiTypeToStr[t]);
    return `tuple(${names.join(',')})[]`;
}

/**
 * Converts a structured AbiType into a canonical selector string.
 * Matches the behavior of transaction's abiTypeToSelectorString:
 * - Simple: ABIDataTypes.ADDRESS → "address"
 * - Struct: { a: ADDRESS, b: UINT256 } → "tuple(address,uint256)" (no [])
 * - Single-element tuple: [UINT256] → "uint256[]"
 * - Multi-element tuple: [ADDRESS, UINT256] → "tuple(address,uint256)[]"
 */
export function abiTypeToSelectorString(type: AbiType): string {
    // Simple ABIDataTypes enum value
    if (typeof type === 'string') {
        const str = AbiTypeToStr[type as ABIDataTypes];
        if (!str) {
            throw new Error(`Unknown ABI type: ${type}`);
        }
        return str;
    }

    // Struct: inline tuple (no [] suffix)
    if (!Array.isArray(type)) {
        const inner = Object.values(type).map((t) => abiTypeToSelectorString(t)).join(',');
        return `tuple(${inner})`;
    }

    // Single-element tuple: unwrap to "type[]"
    const firstType = type[0];
    if (type.length === 1 && firstType !== undefined) {
        return `${abiTypeToSelectorString(firstType)}[]`;
    }

    // Multi-element tuple: "tuple(types...)[]"
    const inner = type.map((t) => abiTypeToSelectorString(t)).join(',');
    return `tuple(${inner})[]`;
}
