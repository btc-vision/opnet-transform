import { ABIDataTypes } from '@btc-vision/transaction';
import { AbiType, StructType } from '../interfaces/Abi.js';
import { isTupleString, parseTupleTypes } from './tupleParser.js';
import { StrToAbiType } from '../StrToAbiType.js';

/**
 * Maps an ABIDataTypes enum value, structured tuple array, structured object,
 * or legacy tuple string to a TypeScript type string for use in generated .d.ts files.
 */
export function mapAbiTypeToTypescript(abiType: AbiType): string {
    // Handle structured tuple arrays
    if (Array.isArray(abiType)) {
        // Single-element tuple: unwrap to Type[] (e.g. [ADDRESS] → Address[])
        const firstType = abiType[0];
        if (abiType.length === 1 && firstType !== undefined) {
            return `${mapAbiTypeToTypescript(firstType)}[]`;
        }
        // Multi-element tuple: [Address, number][]
        const tsTypes = abiType.map((t) => mapAbiTypeToTypescript(t));
        return `[${tsTypes.join(', ')}][]`;
    }

    // Handle structured objects (structs): { owner: ABIDataTypes.ADDRESS } → { owner: Address }
    if (typeof abiType === 'object' && abiType !== null) {
        const entries = Object.entries(abiType as StructType)
            .map(([key, val]) => `${key}: ${mapAbiTypeToTypescript(val)}`)
            .join('; ');
        return `{ ${entries} }`;
    }

    // Handle legacy custom tuple strings like "tuple(uint256,bool,address)[]"
    if (typeof abiType === 'string' && isTupleString(abiType)) {
        const inner = parseTupleTypes(abiType);
        const tsTypes = inner.map((t) => {
            const resolved = StrToAbiType[t];
            if (resolved === undefined) return 'unknown';
            return mapAbiTypeToTypescript(resolved);
        });
        return `[${tsTypes.join(', ')}][]`;
    }

    switch (abiType as ABIDataTypes) {
        case ABIDataTypes.ADDRESS:
            return 'Address';
        case ABIDataTypes.EXTENDED_ADDRESS:
            return 'Address';
        case ABIDataTypes.STRING:
            return 'string';
        case ABIDataTypes.BOOL:
            return 'boolean';
        case ABIDataTypes.BYTES:
            return 'Uint8Array';
        case ABIDataTypes.UINT8:
        case ABIDataTypes.UINT16:
        case ABIDataTypes.UINT32:
        case ABIDataTypes.INT8:
        case ABIDataTypes.INT16:
        case ABIDataTypes.INT32:
            return 'number';
        case ABIDataTypes.UINT64:
        case ABIDataTypes.INT64:
        case ABIDataTypes.INT128:
        case ABIDataTypes.UINT128:
        case ABIDataTypes.UINT256:
            return 'bigint';
        case ABIDataTypes.ADDRESS_UINT256_TUPLE:
            return 'AddressMap<bigint>';
        case ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE:
            return 'ExtendedAddressMap<bigint>';
        case ABIDataTypes.SCHNORR_SIGNATURE:
            return 'SchnorrSignature';
        case ABIDataTypes.ARRAY_OF_ADDRESSES:
            return 'Address[]';
        case ABIDataTypes.ARRAY_OF_EXTENDED_ADDRESSES:
            return 'Address[]';
        case ABIDataTypes.ARRAY_OF_STRING:
            return 'string[]';
        case ABIDataTypes.ARRAY_OF_BYTES:
        case ABIDataTypes.ARRAY_OF_BUFFERS:
            return 'Uint8Array[]';
        case ABIDataTypes.ARRAY_OF_UINT8:
        case ABIDataTypes.ARRAY_OF_UINT16:
        case ABIDataTypes.ARRAY_OF_UINT32:
            return 'number[]';
        case ABIDataTypes.ARRAY_OF_UINT64:
        case ABIDataTypes.ARRAY_OF_UINT128:
        case ABIDataTypes.ARRAY_OF_UINT256:
            return 'bigint[]';
        case ABIDataTypes.BYTES4:
        case ABIDataTypes.BYTES32:
            return 'Uint8Array';
        default:
            return 'unknown';
    }
}
