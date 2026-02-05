export declare type AllowedAbiTypes =
    | 'address'
    | 'extendedAddress'
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
    | 'schnorrSignature'
    | 'tuple(address,uint256)[]'
    | 'tuple(extendedAddress,uint256)[]'
    | 'address[]'
    | 'extendedAddress[]'
    | 'uint256[]'
    | 'uint128[]'
    | 'uint64[]'
    | 'uint32[]'
    | 'uint16[]'
    | 'uint8[]'
    | 'bytes[]'
    | 'buffer[]'
    | 'string[]'
    | 'boolean'
    | `tuple(${string})[]`;

export type MethodDecorator = <T>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void;
