import { describe, it, expect } from 'vitest';
import { ABIDataTypes } from '@btc-vision/transaction';
import {
    isTupleString,
    parseTupleTypes,
    resolveTupleToAbiType,
    validateTupleInnerTypes,
    canonicalizeTupleString,
} from '../transform/utils/tupleParser.js';

describe('isTupleString', () => {
    it('returns true for tuple(address,uint256)[]', () => {
        expect(isTupleString('tuple(address,uint256)[]')).toBe(true);
    });

    it('returns true for tuple(extendedAddress,uint256)[]', () => {
        expect(isTupleString('tuple(extendedAddress,uint256)[]')).toBe(true);
    });

    it('returns true for tuple(foo,bar,baz)[]', () => {
        expect(isTupleString('tuple(foo,bar,baz)[]')).toBe(true);
    });

    it('returns false for plain type address', () => {
        expect(isTupleString('address')).toBe(false);
    });

    it('returns false for uint256', () => {
        expect(isTupleString('uint256')).toBe(false);
    });

    it('returns false for address[]', () => {
        expect(isTupleString('address[]')).toBe(false);
    });

    it('returns false for AddressMap<u256>', () => {
        expect(isTupleString('AddressMap<u256>')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isTupleString('')).toBe(false);
    });

    it('returns false for tuple without trailing []', () => {
        expect(isTupleString('tuple(address,uint256)')).toBe(false);
    });
});

describe('parseTupleTypes', () => {
    it('extracts types from tuple(address,uint256)[]', () => {
        expect(parseTupleTypes('tuple(address,uint256)[]')).toEqual(['address', 'uint256']);
    });

    it('extracts types from tuple(extendedAddress,uint256)[]', () => {
        expect(parseTupleTypes('tuple(extendedAddress,uint256)[]')).toEqual([
            'extendedAddress',
            'uint256',
        ]);
    });

    it('extracts types from tuple(foo,bar,baz)[]', () => {
        expect(parseTupleTypes('tuple(foo,bar,baz)[]')).toEqual(['foo', 'bar', 'baz']);
    });

    it('returns empty array for non-tuple string', () => {
        expect(parseTupleTypes('uint256')).toEqual([]);
    });

    it('trims spaces around inner types', () => {
        expect(parseTupleTypes('tuple(address, uint256)[]')).toEqual(['address', 'uint256']);
    });
});

describe('resolveTupleToAbiType', () => {
    it('resolves tuple(address,uint256)[] to ADDRESS_UINT256_TUPLE', () => {
        expect(resolveTupleToAbiType('tuple(address,uint256)[]')).toBe(
            ABIDataTypes.ADDRESS_UINT256_TUPLE,
        );
    });

    it('resolves tuple(extendedAddress,uint256)[] to EXTENDED_ADDRESS_UINT256_TUPLE', () => {
        expect(resolveTupleToAbiType('tuple(extendedAddress,uint256)[]')).toBe(
            ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE,
        );
    });

    it('returns undefined for unknown tuple', () => {
        expect(resolveTupleToAbiType('tuple(foo,bar)[]')).toBeUndefined();
    });

    it('returns the StrToAbiType value for a non-tuple string present in mapping', () => {
        // resolveTupleToAbiType uses StrToAbiType lookup, so known types resolve
        expect(resolveTupleToAbiType('uint256')).toBe(ABIDataTypes.UINT256);
    });

    it('returns undefined for an unknown non-tuple string', () => {
        expect(resolveTupleToAbiType('unknownType')).toBeUndefined();
    });
});

describe('validateTupleInnerTypes', () => {
    it('returns empty array when all inner types are valid', () => {
        expect(validateTupleInnerTypes('tuple(address,uint256)[]')).toEqual([]);
    });

    it('returns empty array for valid types with aliases', () => {
        expect(validateTupleInnerTypes('tuple(Address,u256)[]')).toEqual([]);
    });

    it('returns invalid type names', () => {
        expect(validateTupleInnerTypes('tuple(address,foobar)[]')).toEqual(['foobar']);
    });

    it('returns multiple invalid types', () => {
        expect(validateTupleInnerTypes('tuple(foo,bar,uint256)[]')).toEqual(['foo', 'bar']);
    });

    it('returns the input string for non-tuple strings', () => {
        expect(validateTupleInnerTypes('notATuple')).toEqual(['notATuple']);
    });

    it('handles three valid types', () => {
        expect(validateTupleInnerTypes('tuple(uint256,bool,address)[]')).toEqual([]);
    });
});

describe('canonicalizeTupleString', () => {
    it('canonicalizes aliases to canonical form', () => {
        expect(canonicalizeTupleString('tuple(Address,u256)[]')).toBe(
            'tuple(address,uint256)[]',
        );
    });

    it('preserves already-canonical types', () => {
        expect(canonicalizeTupleString('tuple(address,uint256)[]')).toBe(
            'tuple(address,uint256)[]',
        );
    });

    it('canonicalizes three types', () => {
        expect(canonicalizeTupleString('tuple(u256,bool,Address)[]')).toBe(
            'tuple(uint256,bool,address)[]',
        );
    });

    it('returns undefined for invalid inner types', () => {
        expect(canonicalizeTupleString('tuple(address,foobar)[]')).toBeUndefined();
    });

    it('returns undefined for non-tuple strings', () => {
        expect(canonicalizeTupleString('uint256')).toBeUndefined();
    });

    it('handles AssemblyScript aliases', () => {
        expect(canonicalizeTupleString('tuple(u8,i64,u128)[]')).toBe(
            'tuple(uint8,int64,uint128)[]',
        );
    });
});
