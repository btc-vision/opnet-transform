import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync, rmSync } from 'fs';

/**
 * Set EXAMPLE_TOKENS_PATH to a checkout of btc-vision/example-tokens
 * that has opnet-transform linked (npm link / symlink).
 *
 *   EXAMPLE_TOKENS_PATH=/path/to/example-tokens npm test
 *
 * If not set, the entire integration suite is skipped.
 */
const EXAMPLE_TOKENS = process.env.EXAMPLE_TOKENS_PATH ?? '';
const HAS_EXAMPLE_TOKENS = EXAMPLE_TOKENS !== '' && existsSync(EXAMPLE_TOKENS);
const describeIf = HAS_EXAMPLE_TOKENS ? describe : describe.skip;

function compileTarget(target: string): void {
    execSync(`npm run build:${target}`, {
        cwd: EXAMPLE_TOKENS,
        stdio: 'pipe',
        timeout: 60_000,
    });
}

function readAbi(className: string): any {
    const path = `${EXAMPLE_TOKENS}/abis/${className}.abi.json`;
    return JSON.parse(readFileSync(path, 'utf-8'));
}

describeIf('MyToken compile (real AS code)', () => {
    beforeAll(() => {
        // Remove stale ABIs so we know they come from a fresh compile
        for (const f of ['MyToken.abi.json', 'OP20.abi.json']) {
            const p = `${EXAMPLE_TOKENS}/abis/${f}`;
            if (existsSync(p)) rmSync(p);
        }
        compileTarget('token');
    });

    it('generates MyToken.abi.json', () => {
        expect(existsSync(`${EXAMPLE_TOKENS}/abis/MyToken.abi.json`)).toBe(true);
    });

    it('generates OP20.abi.json', () => {
        expect(existsSync(`${EXAMPLE_TOKENS}/abis/OP20.abi.json`)).toBe(true);
    });

    describe('MyToken ABI', () => {
        let abi: any;
        beforeAll(() => {
            abi = readAbi('MyToken');
        });

        it('has functions array', () => {
            expect(Array.isArray(abi.functions)).toBe(true);
            expect(abi.functions.length).toBeGreaterThan(0);
        });

        it('has events array', () => {
            expect(Array.isArray(abi.events)).toBe(true);
        });

        it('mint function has correct inputs', () => {
            const mint = abi.functions.find((f: any) => f.name === 'mint');
            expect(mint).toBeDefined();
            expect(mint.inputs).toHaveLength(2);
            expect(mint.inputs[0]).toEqual({ name: 'address', type: 'ADDRESS' });
            expect(mint.inputs[1]).toEqual({ name: 'amount', type: 'UINT256' });
        });

        it('airdrop function uses ADDRESS_UINT256_TUPLE', () => {
            const airdrop = abi.functions.find((f: any) => f.name === 'airdrop');
            expect(airdrop).toBeDefined();
            expect(airdrop.inputs).toHaveLength(1);
            expect(airdrop.inputs[0].type).toBe('ADDRESS_UINT256_TUPLE');
        });

        it('all functions have type, payable, and onlyOwner fields', () => {
            for (const fn of abi.functions) {
                expect(fn.type).toMatch(/^(Function|View)$/);
                expect(typeof fn.payable).toBe('boolean');
                expect(typeof fn.onlyOwner).toBe('boolean');
            }
        });

        it('Minted event has correct fields', () => {
            const minted = abi.events.find((e: any) => e.name === 'Minted');
            expect(minted).toBeDefined();
            expect(minted.type).toBe('Event');
            expect(minted.values).toEqual([
                { name: 'to', type: 'ADDRESS' },
                { name: 'amount', type: 'UINT256' },
            ]);
        });
    });

    describe('OP20 ABI', () => {
        let abi: any;
        beforeAll(() => {
            abi = readAbi('OP20');
        });

        it('has standard OP20 methods', () => {
            const names = abi.functions.map((f: any) => f.name);
            expect(names).toContain('transfer');
            expect(names).toContain('transferFrom');
            expect(names).toContain('balanceOf');
            expect(names).toContain('allowance');
            expect(names).toContain('name');
            expect(names).toContain('symbol');
            expect(names).toContain('decimals');
            expect(names).toContain('totalSupply');
            expect(names).toContain('burn');
        });

        it('transfer has correct signature: address, uint256', () => {
            const transfer = abi.functions.find((f: any) => f.name === 'transfer');
            expect(transfer.inputs).toHaveLength(2);
            expect(transfer.inputs[0].type).toBe('ADDRESS');
            expect(transfer.inputs[1].type).toBe('UINT256');
        });

        it('transferFrom has 3 inputs: address, address, uint256', () => {
            const fn = abi.functions.find((f: any) => f.name === 'transferFrom');
            expect(fn.inputs).toHaveLength(3);
            expect(fn.inputs[0].type).toBe('ADDRESS');
            expect(fn.inputs[1].type).toBe('ADDRESS');
            expect(fn.inputs[2].type).toBe('UINT256');
        });

        it('balanceOf returns UINT256', () => {
            const fn = abi.functions.find((f: any) => f.name === 'balanceOf');
            expect(fn.outputs).toHaveLength(1);
            expect(fn.outputs[0].type).toBe('UINT256');
        });

        it('decimals returns UINT8', () => {
            const fn = abi.functions.find((f: any) => f.name === 'decimals');
            expect(fn.outputs).toHaveLength(1);
            expect(fn.outputs[0].type).toBe('UINT8');
        });

        it('safeTransfer has bytes param', () => {
            const fn = abi.functions.find((f: any) => f.name === 'safeTransfer');
            expect(fn).toBeDefined();
            const types = fn.inputs.map((i: any) => i.type);
            expect(types).toContain('BYTES');
        });

        it('increaseAllowanceBySignature has BYTES32, ADDRESS, UINT256, UINT64, BYTES', () => {
            const fn = abi.functions.find(
                (f: any) => f.name === 'increaseAllowanceBySignature',
            );
            expect(fn).toBeDefined();
            const types = fn.inputs.map((i: any) => i.type);
            expect(types).toContain('BYTES32');
            expect(types).toContain('ADDRESS');
            expect(types).toContain('UINT256');
            expect(types).toContain('UINT64');
            expect(types).toContain('BYTES');
        });

        it('has Transferred event with 4 fields', () => {
            const ev = abi.events.find((e: any) => e.name === 'Transferred');
            expect(ev).toBeDefined();
            expect(ev.values).toHaveLength(4);
            expect(ev.values.map((v: any) => v.type)).toEqual([
                'ADDRESS',
                'ADDRESS',
                'ADDRESS',
                'UINT256',
            ]);
        });

        it('has Approved event', () => {
            const ev = abi.events.find((e: any) => e.name === 'Approved');
            expect(ev).toBeDefined();
            expect(ev.values).toHaveLength(3);
        });

        it('has Burned event', () => {
            const ev = abi.events.find((e: any) => e.name === 'Burned');
            expect(ev).toBeDefined();
        });

        it('metadata returns multiple outputs', () => {
            const fn = abi.functions.find((f: any) => f.name === 'metadata');
            expect(fn).toBeDefined();
            expect(fn.outputs.length).toBeGreaterThan(1);
            const types = fn.outputs.map((o: any) => o.type);
            expect(types).toContain('STRING');
            expect(types).toContain('UINT8');
            expect(types).toContain('UINT256');
            expect(types).toContain('BYTES32');
        });
    });
});

describeIf('MyNFT compile (real AS code)', () => {
    beforeAll(() => {
        const p = `${EXAMPLE_TOKENS}/abis/MyNFT.abi.json`;
        if (existsSync(p)) rmSync(p);
        compileTarget('nft');
    });

    it('generates MyNFT.abi.json', () => {
        expect(existsSync(`${EXAMPLE_TOKENS}/abis/MyNFT.abi.json`)).toBe(true);
    });

    describe('MyNFT ABI', () => {
        let abi: any;
        beforeAll(() => {
            abi = readAbi('MyNFT');
        });

        it('has functions', () => {
            expect(abi.functions.length).toBeGreaterThan(0);
        });

        it('setMintEnabled takes BOOL', () => {
            const fn = abi.functions.find((f: any) => f.name === 'setMintEnabled');
            expect(fn).toBeDefined();
            expect(fn.inputs).toHaveLength(1);
            expect(fn.inputs[0].type).toBe('BOOL');
        });

        it('isMintEnabled returns BOOL', () => {
            const fn = abi.functions.find((f: any) => f.name === 'isMintEnabled');
            expect(fn).toBeDefined();
            expect(fn.outputs).toHaveLength(1);
            expect(fn.outputs[0].type).toBe('BOOL');
        });

        it('airdrop takes ARRAY_OF_ADDRESSES and ARRAY_OF_UINT8', () => {
            const fn = abi.functions.find((f: any) => f.name === 'airdrop');
            expect(fn).toBeDefined();
            const types = fn.inputs.map((i: any) => i.type);
            expect(types).toContain('ARRAY_OF_ADDRESSES');
            expect(types).toContain('ARRAY_OF_UINT8');
        });

        it('reserve returns UINT64 outputs', () => {
            const fn = abi.functions.find((f: any) => f.name === 'reserve');
            expect(fn).toBeDefined();
            expect(fn.outputs.length).toBeGreaterThan(0);
            const types = fn.outputs.map((o: any) => o.type);
            expect(types).toContain('UINT64');
        });

        it('all functions have payable and onlyOwner fields', () => {
            for (const fn of abi.functions) {
                expect(typeof fn.payable).toBe('boolean');
                expect(typeof fn.onlyOwner).toBe('boolean');
            }
        });
    });
});

describeIf('generated .d.ts files', () => {
    it('MyToken.d.ts exists and contains interface', () => {
        const dts = readFileSync(`${EXAMPLE_TOKENS}/abis/MyToken.d.ts`, 'utf-8');
        expect(dts).toContain('IMyToken');
        expect(dts).toContain('mint(');
        expect(dts).toContain('airdrop(');
    });

    it('OP20.d.ts contains IOP20 interface with standard methods', () => {
        const dts = readFileSync(`${EXAMPLE_TOKENS}/abis/OP20.d.ts`, 'utf-8');
        expect(dts).toContain('IOP20');
        expect(dts).toContain('transfer(');
        expect(dts).toContain('balanceOf(');
        expect(dts).toContain('allowance(');
    });

    it('MyNFT.d.ts exists', () => {
        const dts = readFileSync(`${EXAMPLE_TOKENS}/abis/MyNFT.d.ts`, 'utf-8');
        expect(dts).toContain('IMyNFT');
    });
});
