import { describe, it, expect } from 'vitest';
import { ABIDataTypes } from '@btc-vision/transaction';
import { StrToAbiType, AbiTypeToStr } from '../transform/StrToAbiType.js';

describe('StrToAbiType', () => {
    describe('canonical camelCase keys', () => {
        it('maps address -> ADDRESS', () => {
            expect(StrToAbiType['address']).toBe(ABIDataTypes.ADDRESS);
        });

        it('maps extendedAddress -> EXTENDED_ADDRESS', () => {
            expect(StrToAbiType['extendedAddress']).toBe(ABIDataTypes.EXTENDED_ADDRESS);
        });

        it('maps bool -> BOOL', () => {
            expect(StrToAbiType['bool']).toBe(ABIDataTypes.BOOL);
        });

        it('maps bytes -> BYTES', () => {
            expect(StrToAbiType['bytes']).toBe(ABIDataTypes.BYTES);
        });

        it('maps uint256 -> UINT256', () => {
            expect(StrToAbiType['uint256']).toBe(ABIDataTypes.UINT256);
        });

        it('maps uint128 -> UINT128', () => {
            expect(StrToAbiType['uint128']).toBe(ABIDataTypes.UINT128);
        });

        it('maps uint64 -> UINT64', () => {
            expect(StrToAbiType['uint64']).toBe(ABIDataTypes.UINT64);
        });

        it('maps uint32 -> UINT32', () => {
            expect(StrToAbiType['uint32']).toBe(ABIDataTypes.UINT32);
        });

        it('maps uint16 -> UINT16', () => {
            expect(StrToAbiType['uint16']).toBe(ABIDataTypes.UINT16);
        });

        it('maps uint8 -> UINT8', () => {
            expect(StrToAbiType['uint8']).toBe(ABIDataTypes.UINT8);
        });

        it('maps int128 -> INT128', () => {
            expect(StrToAbiType['int128']).toBe(ABIDataTypes.INT128);
        });

        it('maps int64 -> INT64', () => {
            expect(StrToAbiType['int64']).toBe(ABIDataTypes.INT64);
        });

        it('maps int32 -> INT32', () => {
            expect(StrToAbiType['int32']).toBe(ABIDataTypes.INT32);
        });

        it('maps int16 -> INT16', () => {
            expect(StrToAbiType['int16']).toBe(ABIDataTypes.INT16);
        });

        it('maps int8 -> INT8', () => {
            expect(StrToAbiType['int8']).toBe(ABIDataTypes.INT8);
        });

        it('maps string -> STRING', () => {
            expect(StrToAbiType['string']).toBe(ABIDataTypes.STRING);
        });

        it('maps bytes4 -> BYTES4', () => {
            expect(StrToAbiType['bytes4']).toBe(ABIDataTypes.BYTES4);
        });

        it('maps bytes32 -> BYTES32', () => {
            expect(StrToAbiType['bytes32']).toBe(ABIDataTypes.BYTES32);
        });

        it('maps schnorrSignature -> SCHNORR_SIGNATURE', () => {
            expect(StrToAbiType['schnorrSignature']).toBe(ABIDataTypes.SCHNORR_SIGNATURE);
        });

        it('maps tuple(address,uint256)[] -> ADDRESS_UINT256_TUPLE', () => {
            expect(StrToAbiType['tuple(address,uint256)[]']).toBe(
                ABIDataTypes.ADDRESS_UINT256_TUPLE,
            );
        });

        it('maps tuple(extendedAddress,uint256)[] -> EXTENDED_ADDRESS_UINT256_TUPLE', () => {
            expect(StrToAbiType['tuple(extendedAddress,uint256)[]']).toBe(
                ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE,
            );
        });

        it('maps address[] -> ARRAY_OF_ADDRESSES', () => {
            expect(StrToAbiType['address[]']).toBe(ABIDataTypes.ARRAY_OF_ADDRESSES);
        });

        it('maps extendedAddress[] -> ARRAY_OF_EXTENDED_ADDRESSES', () => {
            expect(StrToAbiType['extendedAddress[]']).toBe(
                ABIDataTypes.ARRAY_OF_EXTENDED_ADDRESSES,
            );
        });

        it('maps uint256[] -> ARRAY_OF_UINT256', () => {
            expect(StrToAbiType['uint256[]']).toBe(ABIDataTypes.ARRAY_OF_UINT256);
        });

        it('maps uint128[] -> ARRAY_OF_UINT128', () => {
            expect(StrToAbiType['uint128[]']).toBe(ABIDataTypes.ARRAY_OF_UINT128);
        });

        it('maps uint64[] -> ARRAY_OF_UINT64', () => {
            expect(StrToAbiType['uint64[]']).toBe(ABIDataTypes.ARRAY_OF_UINT64);
        });

        it('maps uint32[] -> ARRAY_OF_UINT32', () => {
            expect(StrToAbiType['uint32[]']).toBe(ABIDataTypes.ARRAY_OF_UINT32);
        });

        it('maps uint16[] -> ARRAY_OF_UINT16', () => {
            expect(StrToAbiType['uint16[]']).toBe(ABIDataTypes.ARRAY_OF_UINT16);
        });

        it('maps uint8[] -> ARRAY_OF_UINT8', () => {
            expect(StrToAbiType['uint8[]']).toBe(ABIDataTypes.ARRAY_OF_UINT8);
        });

        it('maps bytes[] -> ARRAY_OF_BYTES', () => {
            expect(StrToAbiType['bytes[]']).toBe(ABIDataTypes.ARRAY_OF_BYTES);
        });

        it('maps buffer[] -> ARRAY_OF_BUFFERS', () => {
            expect(StrToAbiType['buffer[]']).toBe(ABIDataTypes.ARRAY_OF_BUFFERS);
        });

        it('maps string[] -> ARRAY_OF_STRING', () => {
            expect(StrToAbiType['string[]']).toBe(ABIDataTypes.ARRAY_OF_STRING);
        });
    });

    describe('AssemblyScript aliases resolve correctly', () => {
        it('u256 -> UINT256', () => {
            expect(StrToAbiType['u256']).toBe(ABIDataTypes.UINT256);
        });

        it('u128 -> UINT128', () => {
            expect(StrToAbiType['u128']).toBe(ABIDataTypes.UINT128);
        });

        it('u64 -> UINT64', () => {
            expect(StrToAbiType['u64']).toBe(ABIDataTypes.UINT64);
        });

        it('u32 -> UINT32', () => {
            expect(StrToAbiType['u32']).toBe(ABIDataTypes.UINT32);
        });

        it('u16 -> UINT16', () => {
            expect(StrToAbiType['u16']).toBe(ABIDataTypes.UINT16);
        });

        it('u8 -> UINT8', () => {
            expect(StrToAbiType['u8']).toBe(ABIDataTypes.UINT8);
        });

        it('i128 -> INT128', () => {
            expect(StrToAbiType['i128']).toBe(ABIDataTypes.INT128);
        });

        it('i64 -> INT64', () => {
            expect(StrToAbiType['i64']).toBe(ABIDataTypes.INT64);
        });

        it('i32 -> INT32', () => {
            expect(StrToAbiType['i32']).toBe(ABIDataTypes.INT32);
        });

        it('i16 -> INT16', () => {
            expect(StrToAbiType['i16']).toBe(ABIDataTypes.INT16);
        });

        it('i8 -> INT8', () => {
            expect(StrToAbiType['i8']).toBe(ABIDataTypes.INT8);
        });

        it('AddressMap<u256> -> ADDRESS_UINT256_TUPLE', () => {
            expect(StrToAbiType['AddressMap<u256>']).toBe(ABIDataTypes.ADDRESS_UINT256_TUPLE);
        });

        it('ExtendedAddressMap<u256> -> EXTENDED_ADDRESS_UINT256_TUPLE', () => {
            expect(StrToAbiType['ExtendedAddressMap<u256>']).toBe(
                ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE,
            );
        });

        it('Address -> ADDRESS', () => {
            expect(StrToAbiType['Address']).toBe(ABIDataTypes.ADDRESS);
        });

        it('ExtendedAddress -> EXTENDED_ADDRESS', () => {
            expect(StrToAbiType['ExtendedAddress']).toBe(ABIDataTypes.EXTENDED_ADDRESS);
        });

        it('SchnorrSignature -> SCHNORR_SIGNATURE', () => {
            expect(StrToAbiType['SchnorrSignature']).toBe(ABIDataTypes.SCHNORR_SIGNATURE);
        });

        it('boolean -> BOOL', () => {
            expect(StrToAbiType['boolean']).toBe(ABIDataTypes.BOOL);
        });

        it('Uint8Array -> BYTES', () => {
            expect(StrToAbiType['Uint8Array']).toBe(ABIDataTypes.BYTES);
        });

        it('Uint8Array[] -> ARRAY_OF_BYTES', () => {
            expect(StrToAbiType['Uint8Array[]']).toBe(ABIDataTypes.ARRAY_OF_BYTES);
        });
    });

    describe('no old snake_case keys', () => {
        it('extended_address is not present', () => {
            expect(StrToAbiType['extended_address']).toBeUndefined();
        });

        it('schnorr_signature is not present', () => {
            expect(StrToAbiType['schnorr_signature']).toBeUndefined();
        });

        it('tuple(extended_address,uint256)[] is not present', () => {
            expect(StrToAbiType['tuple(extended_address,uint256)[]']).toBeUndefined();
        });

        it('extended_address[] is not present', () => {
            expect(StrToAbiType['extended_address[]']).toBeUndefined();
        });
    });
});

describe('AbiTypeToStr', () => {
    describe('covers all ABIDataTypes', () => {
        const allTypes = Object.values(ABIDataTypes);

        it('has an entry for every ABIDataTypes value', () => {
            for (const type of allTypes) {
                expect(AbiTypeToStr[type]).toBeDefined();
                expect(typeof AbiTypeToStr[type]).toBe('string');
            }
        });
    });

    describe('canonical camelCase strings match opnet TypeToStr', () => {
        it('ADDRESS -> address', () => {
            expect(AbiTypeToStr[ABIDataTypes.ADDRESS]).toBe('address');
        });

        it('EXTENDED_ADDRESS -> extendedAddress', () => {
            expect(AbiTypeToStr[ABIDataTypes.EXTENDED_ADDRESS]).toBe('extendedAddress');
        });

        it('SCHNORR_SIGNATURE -> schnorrSignature', () => {
            expect(AbiTypeToStr[ABIDataTypes.SCHNORR_SIGNATURE]).toBe('schnorrSignature');
        });

        it('ADDRESS_UINT256_TUPLE -> tuple(address,uint256)[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ADDRESS_UINT256_TUPLE]).toBe(
                'tuple(address,uint256)[]',
            );
        });

        it('EXTENDED_ADDRESS_UINT256_TUPLE -> tuple(extendedAddress,uint256)[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE]).toBe(
                'tuple(extendedAddress,uint256)[]',
            );
        });

        it('ARRAY_OF_EXTENDED_ADDRESSES -> extendedAddress[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ARRAY_OF_EXTENDED_ADDRESSES]).toBe(
                'extendedAddress[]',
            );
        });
    });

    describe('round-trip consistency', () => {
        it('AbiTypeToStr values reverse-map back to the same ABIDataTypes via StrToAbiType', () => {
            const allTypes = Object.values(ABIDataTypes);
            for (const type of allTypes) {
                const str = AbiTypeToStr[type];
                expect(StrToAbiType[str]).toBe(type);
            }
        });
    });
});
