export declare type AllowedAbiTypes =
    | 'address'
    | 'extended_address'
    | 'bool'
    | 'bytes'
    | 'uint256'
    | 'uint128'
    | 'uint64'
    | 'uint32'
    | 'uint16'
    | 'uint8'
    | 'int128'
    | 'int64'
    | 'int32'
    | 'int16'
    | 'int8'
    | 'string'
    | 'bytes4'
    | 'bytes32'
    | 'schnorr_signature'
    | 'tuple(address,uint256)[]'
    | 'tuple(extended_address,uint256)[]'
    | 'address[]'
    | 'extended_address[]'
    | 'uint256[]'
    | 'uint128[]'
    | 'uint64[]'
    | 'uint32[]'
    | 'uint16[]'
    | 'uint8[]'
    | 'bytes[]'
    | 'buffer[]'
    | 'string[]'
    | 'boolean';

export type MethodDecorator = <T>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void;
