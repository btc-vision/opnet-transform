import { ABIDataTypes } from 'opnet';

export const StrToAbiType: { [key: string]: ABIDataTypes } = {
    address: ABIDataTypes.ADDRESS,
    bool: ABIDataTypes.BOOL,
    bytes: ABIDataTypes.BYTES,
    uint256: ABIDataTypes.UINT256,
    uint128: ABIDataTypes.UINT128,
    uint64: ABIDataTypes.UINT64,
    int128: ABIDataTypes.INT128,
    uint32: ABIDataTypes.UINT32,
    uint16: ABIDataTypes.UINT16,
    uint8: ABIDataTypes.UINT8,
    string: ABIDataTypes.STRING,
    bytes32: ABIDataTypes.BYTES32,
    'tuple(address,uint256)': ABIDataTypes.ADDRESS_UINT256_TUPLE,
    'address[]': ABIDataTypes.ARRAY_OF_ADDRESSES,
    'uint256[]': ABIDataTypes.ARRAY_OF_UINT256,
    'uint128[]': ABIDataTypes.ARRAY_OF_UINT128,
    'uint64[]': ABIDataTypes.ARRAY_OF_UINT64,
    'uint32[]': ABIDataTypes.ARRAY_OF_UINT32,
    'uint16[]': ABIDataTypes.ARRAY_OF_UINT16,
    'uint8[]': ABIDataTypes.ARRAY_OF_UINT8,
    'bytes[]': ABIDataTypes.ARRAY_OF_BYTES,
    'string[]': ABIDataTypes.ARRAY_OF_STRING,
};

export const AbiTypeToStr: { [key in ABIDataTypes]: string } = {
    [ABIDataTypes.ADDRESS]: 'address',
    [ABIDataTypes.BOOL]: 'bool',
    [ABIDataTypes.BYTES]: 'bytes',
    [ABIDataTypes.UINT256]: 'uint256',
    [ABIDataTypes.UINT128]: 'uint128',
    [ABIDataTypes.UINT64]: 'uint64',
    [ABIDataTypes.INT128]: 'int128',
    [ABIDataTypes.UINT32]: 'uint32',
    [ABIDataTypes.UINT16]: 'uint16',
    [ABIDataTypes.UINT8]: 'uint8',
    [ABIDataTypes.STRING]: 'string',
    [ABIDataTypes.BYTES32]: 'bytes32',
    [ABIDataTypes.ADDRESS_UINT256_TUPLE]: 'tuple(address,uint256)',
    [ABIDataTypes.ARRAY_OF_ADDRESSES]: 'address[]',
    [ABIDataTypes.ARRAY_OF_UINT256]: 'uint256[]',
    [ABIDataTypes.ARRAY_OF_UINT128]: 'uint128[]',
    [ABIDataTypes.ARRAY_OF_UINT64]: 'uint64[]',
    [ABIDataTypes.ARRAY_OF_UINT32]: 'uint32[]',
    [ABIDataTypes.ARRAY_OF_UINT16]: 'uint16[]',
    [ABIDataTypes.ARRAY_OF_UINT8]: 'uint8[]',
    [ABIDataTypes.ARRAY_OF_BYTES]: 'bytes[]',
    [ABIDataTypes.ARRAY_OF_STRING]: 'string[]',
};
