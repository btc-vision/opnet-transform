import { ABIDataTypes } from 'opnet';

export interface EventAbiParam {
    name: string;
    type: ABIDataTypes;
}

export interface EventAbi {
    eventName: string;
    params: EventAbiParam[];
}
