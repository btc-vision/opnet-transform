import { ABIDataTypes } from 'opnet';
import { MethodDeclaration } from 'assemblyscript/dist/assemblyscript.js';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

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
}

export interface ClassABI {
    functions: {
        name: string;
        type: 'Function';
        inputs: { name: string; type: ABIDataTypes }[];
        outputs: { name: string; type: ABIDataTypes }[];
    }[];
    events: {
        name: string;
        values: { name: string; type: ABIDataTypes }[];
        type: 'Event';
    }[];
}

export interface EventField {
    name: string;
    type: ABIDataTypes;
}

/**
 * For events that are declared.  e.g.:
 *   allEvents['Deposit'] = { eventName: 'Deposit', params: [ { name: 'user', type: ABIDataTypes.ADDRESS }, ... ] }
 */
export interface DeclaredEvent {
    eventName: string;
    params: EventField[];
}
