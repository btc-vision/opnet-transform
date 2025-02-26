import { ABIDataTypes } from 'opnet';

export interface MethodAbi {
    methodName: string; // e.g. "mint"
    paramTypes: string[]; // e.g. ["address", "uint256"]
    signature?: string; // e.g. "mint(address,uint256)"
    selector?: number; // computed from signature
}

export interface EventAbiParam {
    name: string; // e.g. field name
    type: ABIDataTypes; // e.g. ABIDataTypes.ADDRESS
}

export interface EventAbi {
    eventName: string;
    params: EventAbiParam[];
}
