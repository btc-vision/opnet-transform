import { describe, it, expect } from 'vitest';
import { ABIDataTypes } from '@btc-vision/transaction';
import { mapAbiTypeToTypescript } from '../transform/utils/typeMappings.js';

describe('mapAbiTypeToTypescript', () => {
    describe('every ABIDataTypes maps to a non-unknown TS type', () => {
        const allTypes = Object.values(ABIDataTypes);

        it('maps all known types to non-unknown', () => {
            for (const type of allTypes) {
                const ts = mapAbiTypeToTypescript(type);
                expect(ts).not.toBe('unknown');
            }
        });
    });

    describe('tuple types -> Map types', () => {
        it('ADDRESS_UINT256_TUPLE -> AddressMap<bigint>', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ADDRESS_UINT256_TUPLE)).toBe(
                'AddressMap<bigint>',
            );
        });

        it('EXTENDED_ADDRESS_UINT256_TUPLE -> ExtendedAddressMap<bigint>', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE)).toBe(
                'ExtendedAddressMap<bigint>',
            );
        });
    });

    describe('integer size -> number vs bigint', () => {
        it('UINT8 -> number', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT8)).toBe('number');
        });

        it('UINT16 -> number', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT16)).toBe('number');
        });

        it('UINT32 -> number', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT32)).toBe('number');
        });

        it('INT8 -> number', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.INT8)).toBe('number');
        });

        it('INT16 -> number', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.INT16)).toBe('number');
        });

        it('INT32 -> number', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.INT32)).toBe('number');
        });

        it('UINT64 -> bigint', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT64)).toBe('bigint');
        });

        it('INT64 -> bigint', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.INT64)).toBe('bigint');
        });

        it('INT128 -> bigint', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.INT128)).toBe('bigint');
        });

        it('UINT128 -> bigint', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT128)).toBe('bigint');
        });

        it('UINT256 -> bigint', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT256)).toBe('bigint');
        });
    });

    describe('array types', () => {
        it('ARRAY_OF_UINT8 -> number[]', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ARRAY_OF_UINT8)).toBe('number[]');
        });

        it('ARRAY_OF_UINT256 -> bigint[]', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ARRAY_OF_UINT256)).toBe('bigint[]');
        });

        it('ARRAY_OF_ADDRESSES -> Address[]', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ARRAY_OF_ADDRESSES)).toBe('Address[]');
        });

        it('ARRAY_OF_BYTES -> Uint8Array[]', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ARRAY_OF_BYTES)).toBe('Uint8Array[]');
        });

        it('ARRAY_OF_BUFFERS -> Uint8Array[]', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ARRAY_OF_BUFFERS)).toBe('Uint8Array[]');
        });

        it('ARRAY_OF_STRING -> string[]', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ARRAY_OF_STRING)).toBe('string[]');
        });
    });

    describe('special types', () => {
        it('SCHNORR_SIGNATURE -> SchnorrSignature', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.SCHNORR_SIGNATURE)).toBe('SchnorrSignature');
        });

        it('ADDRESS -> Address', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.ADDRESS)).toBe('Address');
        });

        it('EXTENDED_ADDRESS -> Address', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.EXTENDED_ADDRESS)).toBe('Address');
        });

        it('BOOL -> boolean', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.BOOL)).toBe('boolean');
        });

        it('STRING -> string', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.STRING)).toBe('string');
        });

        it('BYTES -> Uint8Array', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.BYTES)).toBe('Uint8Array');
        });

        it('BYTES4 -> Uint8Array', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.BYTES4)).toBe('Uint8Array');
        });

        it('BYTES32 -> Uint8Array', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.BYTES32)).toBe('Uint8Array');
        });
    });

    describe('unknown type', () => {
        it('returns unknown for unrecognized type', () => {
            expect(mapAbiTypeToTypescript('NONEXISTENT' as ABIDataTypes)).toBe('unknown');
        });
    });

    describe('custom tuple types (legacy string form)', () => {
        it('tuple(uint256,bool)[] -> [bigint, boolean][]', () => {
            expect(mapAbiTypeToTypescript('tuple(uint256,bool)[]')).toBe('[bigint, boolean][]');
        });

        it('tuple(address,uint256,bool)[] -> [Address, bigint, boolean][]', () => {
            expect(mapAbiTypeToTypescript('tuple(address,uint256,bool)[]')).toBe(
                '[Address, bigint, boolean][]',
            );
        });

        it('tuple(uint8,string)[] -> [number, string][]', () => {
            expect(mapAbiTypeToTypescript('tuple(uint8,string)[]')).toBe('[number, string][]');
        });

        it('tuple with unknown inner type produces unknown element', () => {
            expect(mapAbiTypeToTypescript('tuple(address,foobar)[]')).toBe('[Address, unknown][]');
        });

        it('tuple(uint256,uint256)[] -> [bigint, bigint][]', () => {
            expect(mapAbiTypeToTypescript('tuple(uint256,uint256)[]')).toBe('[bigint, bigint][]');
        });
    });

    describe('structured tuple arrays (ABIDataTypes[])', () => {
        it('[ADDRESS, UINT8] -> [Address, number][]', () => {
            expect(
                mapAbiTypeToTypescript([ABIDataTypes.ADDRESS, ABIDataTypes.UINT8]),
            ).toBe('[Address, number][]');
        });

        it('[UINT256, BOOL, ADDRESS] -> [bigint, boolean, Address][]', () => {
            expect(
                mapAbiTypeToTypescript([
                    ABIDataTypes.UINT256,
                    ABIDataTypes.BOOL,
                    ABIDataTypes.ADDRESS,
                ]),
            ).toBe('[bigint, boolean, Address][]');
        });

        it('[STRING] -> string[] (single-element unwrap)', () => {
            expect(mapAbiTypeToTypescript([ABIDataTypes.STRING])).toBe('string[]');
        });

        it('[ADDRESS, ADDRESS, UINT256] -> [Address, Address, bigint][]', () => {
            expect(
                mapAbiTypeToTypescript([
                    ABIDataTypes.ADDRESS,
                    ABIDataTypes.ADDRESS,
                    ABIDataTypes.UINT256,
                ]),
            ).toBe('[Address, Address, bigint][]');
        });
    });

    describe('structured objects (StructType)', () => {
        it('{ owner: ADDRESS } -> { owner: Address }', () => {
            expect(
                mapAbiTypeToTypescript({ owner: ABIDataTypes.ADDRESS }),
            ).toBe('{ owner: Address }');
        });

        it('{ owner: ADDRESS; amount: UINT256 } -> { owner: Address; amount: bigint }', () => {
            expect(
                mapAbiTypeToTypescript({
                    owner: ABIDataTypes.ADDRESS,
                    amount: ABIDataTypes.UINT256,
                }),
            ).toBe('{ owner: Address; amount: bigint }');
        });
    });
});
