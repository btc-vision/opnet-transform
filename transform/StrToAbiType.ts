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
    bytes4: ABIDataTypes.BYTES4,
    bytes32: ABIDataTypes.BYTES32,
    'tuple(address,uint256)[]': ABIDataTypes.ADDRESS_UINT256_TUPLE,
    'address[]': ABIDataTypes.ARRAY_OF_ADDRESSES,
    'uint256[]': ABIDataTypes.ARRAY_OF_UINT256,
    'uint128[]': ABIDataTypes.ARRAY_OF_UINT128,
    'uint64[]': ABIDataTypes.ARRAY_OF_UINT64,
    'uint32[]': ABIDataTypes.ARRAY_OF_UINT32,
    'uint16[]': ABIDataTypes.ARRAY_OF_UINT16,
    'uint8[]': ABIDataTypes.ARRAY_OF_UINT8,
    'bytes[]': ABIDataTypes.ARRAY_OF_BYTES,
    'string[]': ABIDataTypes.ARRAY_OF_STRING,

    u256: ABIDataTypes.UINT256,
    u128: ABIDataTypes.UINT128,
    u64: ABIDataTypes.UINT64,
    i128: ABIDataTypes.INT128,
    u32: ABIDataTypes.UINT32,
    u16: ABIDataTypes.UINT16,
    u8: ABIDataTypes.UINT8,

    'AddressMap<u256>': ABIDataTypes.ADDRESS_UINT256_TUPLE,
    Address: ABIDataTypes.ADDRESS,
    'u256[]': ABIDataTypes.ARRAY_OF_UINT256,
    'u128[]': ABIDataTypes.ARRAY_OF_UINT128,
    'u64[]': ABIDataTypes.ARRAY_OF_UINT64,
    'u32[]': ABIDataTypes.ARRAY_OF_UINT32,
    'u16[]': ABIDataTypes.ARRAY_OF_UINT16,
    'u8[]': ABIDataTypes.ARRAY_OF_UINT8,
    'Address[]': ABIDataTypes.ARRAY_OF_ADDRESSES,
    'Uint8Array[]': ABIDataTypes.ARRAY_OF_BYTES,
    Uint8Array: ABIDataTypes.BYTES,
    boolean: ABIDataTypes.BOOL,
};

// reverse key -> value

// @ts-ignore
export const AbiTypeToStr: { [key in ABIDataTypes]: string } = {};
for (const key in StrToAbiType) {
    AbiTypeToStr[StrToAbiType[key]] = key as ABIDataTypes;
}
