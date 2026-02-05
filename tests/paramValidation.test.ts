import { describe, it, expect } from 'vitest';
import { isParamDefinition } from '../transform/utils/paramValidation.js';

describe('isParamDefinition', () => {
    describe('canonical ABI strings are recognized', () => {
        it('recognizes address', () => {
            expect(isParamDefinition('address')).toBe(true);
        });

        it('recognizes uint256', () => {
            expect(isParamDefinition('uint256')).toBe(true);
        });

        it('recognizes extendedAddress', () => {
            expect(isParamDefinition('extendedAddress')).toBe(true);
        });

        it('recognizes schnorrSignature', () => {
            expect(isParamDefinition('schnorrSignature')).toBe(true);
        });

        it('recognizes bool', () => {
            expect(isParamDefinition('bool')).toBe(true);
        });

        it('recognizes bytes', () => {
            expect(isParamDefinition('bytes')).toBe(true);
        });

        it('recognizes tuple(address,uint256)[]', () => {
            expect(isParamDefinition('tuple(address,uint256)[]')).toBe(true);
        });

        it('recognizes tuple(extendedAddress,uint256)[]', () => {
            expect(isParamDefinition('tuple(extendedAddress,uint256)[]')).toBe(true);
        });

        it('recognizes address[]', () => {
            expect(isParamDefinition('address[]')).toBe(true);
        });

        it('recognizes uint256[]', () => {
            expect(isParamDefinition('uint256[]')).toBe(true);
        });
    });

    describe('AssemblyScript aliases are recognized', () => {
        it('recognizes u256', () => {
            expect(isParamDefinition('u256')).toBe(true);
        });

        it('recognizes u8', () => {
            expect(isParamDefinition('u8')).toBe(true);
        });

        it('recognizes i64', () => {
            expect(isParamDefinition('i64')).toBe(true);
        });

        it('recognizes Address', () => {
            expect(isParamDefinition('Address')).toBe(true);
        });

        it('recognizes ExtendedAddress', () => {
            expect(isParamDefinition('ExtendedAddress')).toBe(true);
        });

        it('recognizes AddressMap<u256>', () => {
            expect(isParamDefinition('AddressMap<u256>')).toBe(true);
        });

        it('recognizes Uint8Array', () => {
            expect(isParamDefinition('Uint8Array')).toBe(true);
        });

        it('recognizes boolean', () => {
            expect(isParamDefinition('boolean')).toBe(true);
        });
    });

    describe('ABIDataTypes.X format', () => {
        it('recognizes ABIDataTypes.UINT256', () => {
            expect(isParamDefinition('ABIDataTypes.UINT256')).toBe(true);
        });

        it('recognizes ABIDataTypes.ADDRESS', () => {
            expect(isParamDefinition('ABIDataTypes.ADDRESS')).toBe(true);
        });

        it('recognizes ABIDataTypes.SCHNORR_SIGNATURE', () => {
            expect(isParamDefinition('ABIDataTypes.SCHNORR_SIGNATURE')).toBe(true);
        });
    });

    describe('tuple syntax via isTupleString', () => {
        it('recognizes tuple(foo,bar)[] even if not in StrToAbiType', () => {
            expect(isParamDefinition('tuple(foo,bar)[]')).toBe(true);
        });
    });

    describe('method names are rejected', () => {
        it('rejects transfer', () => {
            expect(isParamDefinition('transfer')).toBe(false);
        });

        it('rejects approve', () => {
            expect(isParamDefinition('approve')).toBe(false);
        });

        it('rejects balanceOf', () => {
            expect(isParamDefinition('balanceOf')).toBe(false);
        });

        it('rejects myCustomMethod', () => {
            expect(isParamDefinition('myCustomMethod')).toBe(false);
        });
    });

    describe('named parameter objects', () => {
        it('recognizes named param with known type', () => {
            expect(isParamDefinition({ name: 'amount', type: 'uint256' })).toBe(true);
        });

        it('recognizes named param with ABIDataTypes prefix', () => {
            expect(isParamDefinition({ name: 'to', type: 'ABIDataTypes.ADDRESS' })).toBe(true);
        });

        it('recognizes named param with tuple type', () => {
            expect(
                isParamDefinition({ name: 'data', type: 'tuple(address,uint256)[]' }),
            ).toBe(true);
        });

        it('rejects named param with unknown type', () => {
            expect(isParamDefinition({ name: 'x', type: 'unknownType' })).toBe(false);
        });
    });
});
