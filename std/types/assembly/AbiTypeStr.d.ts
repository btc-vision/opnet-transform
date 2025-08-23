export declare type AllowedAbiTypes =
    | 'address'
    | 'bool'
    | 'bytes'
    | 'uint256'
    | 'uint128'
    | 'uint64'
    | 'int128'
    | 'uint32'
    | 'uint16'
    | 'uint8'
    | 'string'
    | 'bytes4'
    | 'bytes32'
    | 'tuple(address,uint256)[]'
    | 'address[]'
    | 'uint256[]'
    | 'uint128[]'
    | 'uint64[]'
    | 'uint32[]'
    | 'uint16[]'
    | 'uint8[]'
    | 'bytes[]'
    | 'string[]'
    | 'boolean';

export type MethodDecorator = <T>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void;
