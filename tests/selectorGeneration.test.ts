import { describe, it, expect } from 'vitest';
import { ABIDataTypes } from '@btc-vision/transaction';
import { AbiTypeToStr } from '../transform/StrToAbiType.js';
import { abiTypeToSelectorString } from '../transform/utils/tupleParser.js';

describe('AbiTypeToStr for selector generation', () => {
    describe('produces correct canonical strings', () => {
        it('ADDRESS -> address (lowercase)', () => {
            expect(AbiTypeToStr[ABIDataTypes.ADDRESS]).toBe('address');
        });

        it('EXTENDED_ADDRESS -> extendedAddress (camelCase)', () => {
            expect(AbiTypeToStr[ABIDataTypes.EXTENDED_ADDRESS]).toBe('extendedAddress');
        });

        it('SCHNORR_SIGNATURE -> schnorrSignature (camelCase)', () => {
            expect(AbiTypeToStr[ABIDataTypes.SCHNORR_SIGNATURE]).toBe('schnorrSignature');
        });

        it('UINT256 -> uint256 (lowercase)', () => {
            expect(AbiTypeToStr[ABIDataTypes.UINT256]).toBe('uint256');
        });

        it('BOOL -> bool (lowercase)', () => {
            expect(AbiTypeToStr[ABIDataTypes.BOOL]).toBe('bool');
        });
    });

    describe('no PascalCase or Map aliases in canonical output', () => {
        const allValues = Object.values(AbiTypeToStr);

        it('no value starts with uppercase letter', () => {
            for (const val of allValues) {
                expect(val).not.toMatch(/^[A-Z]/);
            }
        });

        it('no value contains "Map"', () => {
            for (const val of allValues) {
                expect(val).not.toContain('Map');
            }
        });

        it('no value is a standalone PascalCase "Address"', () => {
            for (const val of allValues) {
                // "extendedAddress" is fine (camelCase), but standalone "Address" is not
                expect(val).not.toMatch(/^Address$/);
            }
        });

        it('no value contains "SchnorrSignature" (PascalCase)', () => {
            for (const val of allValues) {
                expect(val).not.toContain('SchnorrSignature');
            }
        });

        it('no value contains underscore (snake_case)', () => {
            for (const val of allValues) {
                expect(val).not.toContain('_');
            }
        });
    });

    describe('tuple strings are properly formatted', () => {
        it('ADDRESS_UINT256_TUPLE has correct tuple format', () => {
            const val = AbiTypeToStr[ABIDataTypes.ADDRESS_UINT256_TUPLE];
            expect(val).toBe('tuple(address,uint256)[]');
            expect(val).toMatch(/^tuple\([^)]+\)\[\]$/);
        });

        it('EXTENDED_ADDRESS_UINT256_TUPLE has correct tuple format', () => {
            const val = AbiTypeToStr[ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE];
            expect(val).toBe('tuple(extendedAddress,uint256)[]');
            expect(val).toMatch(/^tuple\([^)]+\)\[\]$/);
        });
    });

    describe('array types use correct format', () => {
        it('ARRAY_OF_ADDRESSES -> address[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ARRAY_OF_ADDRESSES]).toBe('address[]');
        });

        it('ARRAY_OF_EXTENDED_ADDRESSES -> extendedAddress[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ARRAY_OF_EXTENDED_ADDRESSES]).toBe(
                'extendedAddress[]',
            );
        });

        it('ARRAY_OF_UINT256 -> uint256[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ARRAY_OF_UINT256]).toBe('uint256[]');
        });

        it('ARRAY_OF_BYTES -> bytes[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ARRAY_OF_BYTES]).toBe('bytes[]');
        });

        it('ARRAY_OF_BUFFERS -> buffer[]', () => {
            expect(AbiTypeToStr[ABIDataTypes.ARRAY_OF_BUFFERS]).toBe('buffer[]');
        });
    });

    describe('abiTypeToSelectorString', () => {
        it('simple type: ADDRESS -> address', () => {
            expect(abiTypeToSelectorString(ABIDataTypes.ADDRESS)).toBe('address');
        });

        it('simple type: UINT256 -> uint256', () => {
            expect(abiTypeToSelectorString(ABIDataTypes.UINT256)).toBe('uint256');
        });

        it('single-element tuple: [ADDRESS] -> address[] (unwrapped)', () => {
            expect(abiTypeToSelectorString([ABIDataTypes.ADDRESS])).toBe('address[]');
        });

        it('multi-element tuple: [ADDRESS, UINT256] -> tuple(address,uint256)[]', () => {
            expect(abiTypeToSelectorString([ABIDataTypes.ADDRESS, ABIDataTypes.UINT256])).toBe(
                'tuple(address,uint256)[]',
            );
        });

        it('struct: { owner: ADDRESS, amount: UINT256 } -> tuple(address,uint256)', () => {
            expect(
                abiTypeToSelectorString({
                    owner: ABIDataTypes.ADDRESS,
                    amount: ABIDataTypes.UINT256,
                }),
            ).toBe('tuple(address,uint256)');
        });

        it('struct has no [] suffix (inline, not array)', () => {
            const result = abiTypeToSelectorString({ field: ABIDataTypes.BOOL });
            expect(result).toBe('tuple(bool)');
            expect(result).not.toContain('[]');
        });

        it('throws for unknown simple type', () => {
            expect(() => abiTypeToSelectorString('INVALID' as ABIDataTypes)).toThrow(
                'Unknown ABI type',
            );
        });
    });
});
