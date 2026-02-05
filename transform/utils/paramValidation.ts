import { StrToAbiType } from '../StrToAbiType.js';
import { isTupleString } from './tupleParser.js';
import { ParamDefinition } from '../interfaces/Abi.js';

/**
 * Determines whether a parsed parameter definition is recognizable as
 * an ABI type (as opposed to a method name override).
 */
export function isParamDefinition(param: ParamDefinition): boolean {
    if (typeof param === 'string') {
        return param in StrToAbiType || param.startsWith('ABIDataTypes.') || isTupleString(param);
    } else {
        if (param.type.startsWith('ABIDataTypes.')) return true;
        if (param.type in StrToAbiType) return true;
        return isTupleString(param.type);
    }
}
