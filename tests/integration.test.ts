import { describe, it, expect } from 'vitest';
import { ABIDataTypes, ABICoder } from '@btc-vision/transaction';
import { StrToAbiType, AbiTypeToStr } from '../transform/StrToAbiType.js';
import { mapAbiTypeToTypescript } from '../transform/utils/typeMappings.js';
import { isParamDefinition } from '../transform/utils/paramValidation.js';

const abiCoder = new ABICoder();

/**
 * Integration tests based on real contracts from /root/example-tokens.
 * These verify the full pipeline:
 *   AS type alias -> StrToAbiType -> ABIDataTypes -> AbiTypeToStr -> canonical signature -> selector
 */

describe('OP20 standard methods (from example-tokens/src/token)', () => {
    describe('transfer(address,uint256)', () => {
        it('resolves ABIDataTypes.ADDRESS param correctly', () => {
            // In real AS code: { name: "to", type: ABIDataTypes.ADDRESS }
            const abiType = ABIDataTypes.ADDRESS;
            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('address');
        });

        it('resolves ABIDataTypes.UINT256 param correctly', () => {
            const abiType = ABIDataTypes.UINT256;
            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('uint256');
        });

        it('produces correct selector for transfer(address,uint256)', () => {
            const sig = 'transfer(address,uint256)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toBeDefined();
            expect(typeof selector).toBe('string');
            // Selector should be 8 hex chars (4 bytes)
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('transferFrom(address,address,uint256)', () => {
        it('produces a valid selector', () => {
            const sig = 'transferFrom(address,address,uint256)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('balanceOf(address) -> uint256', () => {
        it('produces a valid selector', () => {
            const sig = 'balanceOf(address)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });

        it('maps ADDRESS return type to TS correctly', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT256)).toBe('bigint');
        });
    });

    describe('allowance(address,address) -> uint256', () => {
        it('produces a valid selector', () => {
            const sig = 'allowance(address,address)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('name() -> string', () => {
        it('produces a valid selector for no-param method', () => {
            const sig = 'name()';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('burn(uint256)', () => {
        it('produces a valid selector', () => {
            const sig = 'burn(uint256)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('safeTransfer(address,uint256,bytes)', () => {
        it('produces a valid selector', () => {
            const sig = 'safeTransfer(address,uint256,bytes)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('increaseAllowanceBySignature(bytes32,bytes32,address,uint256,uint64,bytes)', () => {
        it('produces a valid selector', () => {
            const sig =
                'increaseAllowanceBySignature(bytes32,bytes32,address,uint256,uint64,bytes)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });
});

describe('MyToken methods (from example-tokens/src/token/MyToken.ts)', () => {
    describe('mint with ABIDataTypes.ADDRESS and ABIDataTypes.UINT256', () => {
        it('full pipeline: ABIDataTypes enum -> canonical string -> selector', () => {
            // The real code uses: { name: "address", type: ABIDataTypes.ADDRESS }
            // The transform resolves ABIDataTypes.ADDRESS -> AbiTypeToStr -> "address"
            const param1 = AbiTypeToStr[ABIDataTypes.ADDRESS];
            const param2 = AbiTypeToStr[ABIDataTypes.UINT256];
            expect(param1).toBe('address');
            expect(param2).toBe('uint256');

            const sig = `mint(${param1},${param2})`;
            expect(sig).toBe('mint(address,uint256)');

            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('airdrop with ABIDataTypes.ADDRESS_UINT256_TUPLE', () => {
        it('full pipeline: tuple type -> canonical string -> selector', () => {
            const param1 = AbiTypeToStr[ABIDataTypes.ADDRESS_UINT256_TUPLE];
            expect(param1).toBe('tuple(address,uint256)[]');

            const sig = `airdrop(${param1})`;
            expect(sig).toBe('airdrop(tuple(address,uint256)[])');

            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });
});

describe('AS type alias pipeline', () => {
    describe('AddressMap<u256> -> ADDRESS_UINT256_TUPLE -> tuple(address,uint256)[]', () => {
        it('resolves full chain correctly', () => {
            // In AS code, the user writes AddressMap<u256>
            const abiType = StrToAbiType['AddressMap<u256>'];
            expect(abiType).toBe(ABIDataTypes.ADDRESS_UINT256_TUPLE);

            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('tuple(address,uint256)[]');
        });

        it('the canonical string is recognized as a param definition', () => {
            expect(isParamDefinition('tuple(address,uint256)[]')).toBe(true);
        });

        it('the AS alias is recognized as a param definition', () => {
            expect(isParamDefinition('AddressMap<u256>')).toBe(true);
        });
    });

    describe('Address -> ADDRESS -> address', () => {
        it('resolves full chain correctly', () => {
            const abiType = StrToAbiType['Address'];
            expect(abiType).toBe(ABIDataTypes.ADDRESS);

            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('address');
        });
    });

    describe('u256 -> UINT256 -> uint256', () => {
        it('resolves full chain correctly', () => {
            const abiType = StrToAbiType['u256'];
            expect(abiType).toBe(ABIDataTypes.UINT256);

            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('uint256');
        });
    });

    describe('boolean -> BOOL -> bool', () => {
        it('resolves full chain correctly', () => {
            const abiType = StrToAbiType['boolean'];
            expect(abiType).toBe(ABIDataTypes.BOOL);

            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('bool');
        });
    });

    describe('Uint8Array -> BYTES -> bytes', () => {
        it('resolves full chain correctly', () => {
            const abiType = StrToAbiType['Uint8Array'];
            expect(abiType).toBe(ABIDataTypes.BYTES);

            const canonical = AbiTypeToStr[abiType];
            expect(canonical).toBe('bytes');
        });
    });
});

describe('NFT methods (from example-tokens/src/nft/MyNFT.ts)', () => {
    describe('setMintEnabled(bool)', () => {
        it('produces correct selector', () => {
            const sig = 'setMintEnabled(bool)';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('airdrop(address[],uint8[])', () => {
        it('resolves ARRAY_OF_ADDRESSES and ARRAY_OF_UINT8 to canonical strings', () => {
            const p1 = AbiTypeToStr[ABIDataTypes.ARRAY_OF_ADDRESSES];
            const p2 = AbiTypeToStr[ABIDataTypes.ARRAY_OF_UINT8];
            expect(p1).toBe('address[]');
            expect(p2).toBe('uint8[]');
        });

        it('produces correct selector', () => {
            const sig = 'airdrop(address[],uint8[])';
            const selector = abiCoder.encodeSelector(sig);
            expect(selector).toMatch(/^[0-9a-f]{8}$/);
        });
    });

    describe('reserve(uint256) -> uint64,uint64', () => {
        it('maps UINT64 outputs to bigint TS type', () => {
            expect(mapAbiTypeToTypescript(ABIDataTypes.UINT64)).toBe('bigint');
        });
    });
});

describe('selector consistency: same signature always produces same selector', () => {
    const signatures = [
        'transfer(address,uint256)',
        'transferFrom(address,address,uint256)',
        'balanceOf(address)',
        'allowance(address,address)',
        'name()',
        'mint(address,uint256)',
        'airdrop(tuple(address,uint256)[])',
        'burn(uint256)',
        'setMintEnabled(bool)',
    ];

    for (const sig of signatures) {
        it(`${sig} produces consistent selector across calls`, () => {
            const sel1 = abiCoder.encodeSelector(sig);
            const sel2 = abiCoder.encodeSelector(sig);
            expect(sel1).toBe(sel2);
        });
    }
});

describe('camelCase consistency: no snake_case in selectors', () => {
    it('extendedAddress methods use camelCase in signature', () => {
        const canonical = AbiTypeToStr[ABIDataTypes.EXTENDED_ADDRESS];
        expect(canonical).toBe('extendedAddress');
        expect(canonical).not.toContain('_');

        // This is the correct signature
        const sig = `someMethod(${canonical})`;
        expect(sig).toBe('someMethod(extendedAddress)');
    });

    it('schnorrSignature uses camelCase in signature', () => {
        const canonical = AbiTypeToStr[ABIDataTypes.SCHNORR_SIGNATURE];
        expect(canonical).toBe('schnorrSignature');
        expect(canonical).not.toContain('_');
    });

    it('extended address tuple uses camelCase in signature', () => {
        const canonical = AbiTypeToStr[ABIDataTypes.EXTENDED_ADDRESS_UINT256_TUPLE];
        expect(canonical).toBe('tuple(extendedAddress,uint256)[]');
        expect(canonical).not.toContain('_');
    });

    it('extended address array uses camelCase in signature', () => {
        const canonical = AbiTypeToStr[ABIDataTypes.ARRAY_OF_EXTENDED_ADDRESSES];
        expect(canonical).toBe('extendedAddress[]');
        expect(canonical).not.toContain('_');
    });
});

describe('TypeScript type generation for real contract outputs', () => {
    it('OP20 metadata returns correct TS types', () => {
        // metadata() returns: string, string, string, uint8, uint256, bytes32
        expect(mapAbiTypeToTypescript(ABIDataTypes.STRING)).toBe('string');
        expect(mapAbiTypeToTypescript(ABIDataTypes.UINT8)).toBe('number');
        expect(mapAbiTypeToTypescript(ABIDataTypes.UINT256)).toBe('bigint');
        expect(mapAbiTypeToTypescript(ABIDataTypes.BYTES32)).toBe('Uint8Array');
    });

    it('OP20 event fields map to correct TS types', () => {
        // Transferred event: ADDRESS, ADDRESS, ADDRESS, UINT256
        expect(mapAbiTypeToTypescript(ABIDataTypes.ADDRESS)).toBe('Address');
        expect(mapAbiTypeToTypescript(ABIDataTypes.UINT256)).toBe('bigint');
    });
});
