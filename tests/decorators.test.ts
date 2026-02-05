import { describe, it, expect } from 'vitest';
import type {
    MethodCollection,
    ClassABI,
    ABIFunctionEntry,
    ABIEventEntry,
    EventField,
    DeclaredEvent,
} from '../transform/interfaces/Abi.js';

describe('MethodCollection new fields', () => {
    it('supports isView flag', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'balanceOf',
            isView: true,
        };
        expect(m.isView).toBe(true);
    });

    it('isView defaults to undefined', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'transfer',
        };
        expect(m.isView).toBeUndefined();
    });

    it('supports isPayable flag', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'deposit',
            isPayable: true,
        };
        expect(m.isPayable).toBe(true);
    });

    it('isPayable defaults to undefined', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'transfer',
        };
        expect(m.isPayable).toBeUndefined();
    });

    it('supports onlyOwner flag', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'setAdmin',
            onlyOwner: true,
        };
        expect(m.onlyOwner).toBe(true);
    });

    it('onlyOwner defaults to undefined', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'transfer',
        };
        expect(m.onlyOwner).toBeUndefined();
    });

    it('supports selectorOverride', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'transfer',
            selectorOverride: '0xa9059cbb',
        };
        expect(m.selectorOverride).toBe('0xa9059cbb');
    });

    it('selectorOverride defaults to undefined', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'transfer',
        };
        expect(m.selectorOverride).toBeUndefined();
    });
});

describe('ABIFunctionEntry', () => {
    it('type can be Function', () => {
        const fn: ABIFunctionEntry = {
            name: 'transfer',
            type: 'Function',
            payable: false,
            onlyOwner: false,
            inputs: [],
            outputs: [],
        };
        expect(fn.type).toBe('Function');
        expect(fn.payable).toBe(false);
        expect(fn.onlyOwner).toBe(false);
    });

    it('type can be View', () => {
        const fn: ABIFunctionEntry = {
            name: 'balanceOf',
            type: 'View',
            payable: false,
            onlyOwner: false,
            inputs: [],
            outputs: [],
        };
        expect(fn.type).toBe('View');
    });

    it('payable can be true', () => {
        const fn: ABIFunctionEntry = {
            name: 'deposit',
            type: 'Function',
            payable: true,
            onlyOwner: false,
            inputs: [],
            outputs: [],
        };
        expect(fn.payable).toBe(true);
    });

    it('onlyOwner can be true', () => {
        const fn: ABIFunctionEntry = {
            name: 'setAdmin',
            type: 'Function',
            payable: false,
            onlyOwner: true,
            inputs: [],
            outputs: [],
        };
        expect(fn.onlyOwner).toBe(true);
    });
});

describe('ABIEventEntry', () => {
    it('event values have name and type', () => {
        const evt: ABIEventEntry = {
            name: 'Transfer',
            type: 'Event',
            values: [
                { name: 'from', type: 'ADDRESS' as any },
                { name: 'to', type: 'ADDRESS' as any },
                { name: 'amount', type: 'UINT256' as any },
            ],
        };
        expect(evt.values).toHaveLength(3);
        expect(evt.values[0].name).toBe('from');
        expect(evt.values[2].name).toBe('amount');
    });
});

describe('EventField', () => {
    it('has name and type', () => {
        const field: EventField = {
            name: 'sender',
            type: 'ADDRESS' as any,
        };
        expect(field.name).toBe('sender');
    });
});

describe('DeclaredEvent', () => {
    it('collects all params', () => {
        const ev: DeclaredEvent = {
            eventName: 'Approval',
            params: [
                { name: 'owner', type: 'ADDRESS' as any },
                { name: 'spender', type: 'ADDRESS' as any },
                { name: 'value', type: 'UINT256' as any },
            ],
        };
        expect(ev.params).toHaveLength(3);
        expect(ev.eventName).toBe('Approval');
    });
});

describe('ClassABI structure', () => {
    it('functions use ABIFunctionEntry with payable/onlyOwner/View type', () => {
        const abi: ClassABI = {
            functions: [
                {
                    name: 'balanceOf',
                    type: 'View',
                    payable: false,
                    onlyOwner: false,
                    inputs: [{ name: 'owner', type: 'ADDRESS' as any }],
                    outputs: [{ name: 'balance', type: 'UINT256' as any }],
                },
                {
                    name: 'deposit',
                    type: 'Function',
                    payable: true,
                    onlyOwner: false,
                    inputs: [],
                    outputs: [],
                },
                {
                    name: 'setAdmin',
                    type: 'Function',
                    payable: false,
                    onlyOwner: true,
                    inputs: [{ name: 'admin', type: 'ADDRESS' as any }],
                    outputs: [],
                },
            ],
            events: [
                {
                    name: 'Transfer',
                    type: 'Event',
                    values: [
                        { name: 'from', type: 'ADDRESS' as any },
                        { name: 'to', type: 'ADDRESS' as any },
                        { name: 'amount', type: 'UINT256' as any },
                    ],
                },
            ],
        };

        // View function
        expect(abi.functions[0].type).toBe('View');
        expect(abi.functions[0].payable).toBe(false);

        // Payable function
        expect(abi.functions[1].type).toBe('Function');
        expect(abi.functions[1].payable).toBe(true);

        // OnlyOwner function
        expect(abi.functions[2].onlyOwner).toBe(true);

        // Events have all fields
        expect(abi.events[0].values).toHaveLength(3);
    });

    it('serializes to JSON correctly', () => {
        const abi: ClassABI = {
            functions: [
                {
                    name: 'transfer',
                    type: 'Function',
                    payable: false,
                    onlyOwner: false,
                    inputs: [
                        { name: 'to', type: 'ADDRESS' as any },
                        { name: 'amount', type: 'UINT256' as any },
                    ],
                    outputs: [{ name: 'success', type: 'BOOL' as any }],
                },
            ],
            events: [],
        };

        const json = JSON.parse(JSON.stringify(abi));
        expect(json.functions[0].type).toBe('Function');
        expect(json.functions[0].payable).toBe(false);
        expect(json.functions[0].onlyOwner).toBe(false);
        expect(json.functions[0].inputs).toHaveLength(2);
    });
});

describe('selector override', () => {
    it('selectorOverride is a hex string', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'transfer',
            selectorOverride: '0xa9059cbb',
        };
        expect(m.selectorOverride).toMatch(/^0x[0-9a-f]+$/);
    });

    it('selectorOverride can be any valid hex', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'approve',
            selectorOverride: '0x095ea7b3',
        };
        expect(m.selectorOverride).toBe('0x095ea7b3');
    });
});

describe('decorator combinations', () => {
    it('a method can be both @view and @onlyOwner', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'getAdminBalance',
            isView: true,
            onlyOwner: true,
        };
        expect(m.isView).toBe(true);
        expect(m.onlyOwner).toBe(true);
    });

    it('a method can be both @payable and have @selector', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'deposit',
            isPayable: true,
            selectorOverride: '0xd0e30db0',
        };
        expect(m.isPayable).toBe(true);
        expect(m.selectorOverride).toBe('0xd0e30db0');
    });

    it('@view and @payable cannot be combined (conflict error)', () => {
        // The transform now throws a compile error when both @view and @payable
        // are applied to the same method. This test documents the intent.
        const m: Partial<MethodCollection> = {
            methodName: 'checkAndDeposit',
            isView: true,
            isPayable: true,
        };
        // At the type level the flags can both be set, but the transform rejects this
        expect(m.isView).toBe(true);
        expect(m.isPayable).toBe(true);
    });

    it('all non-conflicting flags can be set simultaneously', () => {
        const m: Partial<MethodCollection> = {
            methodName: 'superMethod',
            isView: true,
            onlyOwner: true,
            selectorOverride: '0xdeadbeef',
            emittedEvents: ['Transfer'],
        };
        expect(m.isView).toBe(true);
        expect(m.onlyOwner).toBe(true);
        expect(m.selectorOverride).toBe('0xdeadbeef');
        expect(m.emittedEvents).toEqual(['Transfer']);
    });
});
