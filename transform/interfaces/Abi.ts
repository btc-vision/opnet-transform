import { ABIDataTypes } from '@btc-vision/transaction';
import { MethodDeclaration } from '@btc-vision/assemblyscript/dist/assemblyscript.js';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * Widened ABI type: either a known ABIDataTypes enum value or a custom tuple string
 * (e.g. "tuple(uint256,bool,address)[]").
 */
export type AbiType = ABIDataTypes | `tuple(${string})[]`;

/**
 * A single parameter definition. It can be a bare string (e.g. "uint256")
 * or an object-literal (named parameter).
 */
export type ParamDefinition = string | NamedParameter;

/**
 * Example "NamedParameter":
 *   { name: "amount", type: "uint256" }
 */
export interface NamedParameter {
    name: string;
    type: string;
}

/**
 * Tracks each method's metadata so we can build the ABI.
 */
export interface MethodCollection {
    methodName: string;
    paramDefs: ParamDefinition[];
    returnDefs: ParamDefinition[];
    signature?: string;
    declaration: MethodDeclaration;
    selector?: number;
    internalName?: string;
    emittedEvents: string[];
    isView?: boolean;
    isPayable?: boolean;
    onlyOwner?: boolean;
    selectorOverride?: string;
}

export interface ABIFunctionEntry {
    name: string;
    type: 'Function' | 'View';
    payable: boolean;
    onlyOwner: boolean;
    inputs: { name: string; type: AbiType }[];
    outputs: { name: string; type: AbiType }[];
}

export interface ABIEventEntry {
    name: string;
    values: { name: string; type: AbiType }[];
    type: 'Event';
}

export interface ClassABI {
    functions: ABIFunctionEntry[];
    events: ABIEventEntry[];
}

export interface EventField {
    name: string;
    type: AbiType;
}

/**
 * For events that are declared.  e.g.:
 *   allEvents['Deposit'] = { eventName: 'Deposit', params: [ { name: 'user', type: ABIDataTypes.ADDRESS }, ... ] }
 */
export interface DeclaredEvent {
    eventName: string;
    params: EventField[];
}
