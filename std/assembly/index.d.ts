/**
 * Environment definitions for compiling AssemblyScript to WebAssembly using asc.
 * @module std/assembly
 */

/// <reference no-default-lib="true"/>

// Types

import { AllowedAbiTypes, MethodDecorator } from '../types/assembly/AbiTypeStr';

declare global {
    export enum ABIDataTypes {
        UINT8 = 'UINT8',
        UINT16 = 'UINT16',
        UINT32 = 'UINT32',
        UINT64 = 'UINT64',
        UINT128 = 'UINT128',
        UINT256 = 'UINT256',
        INT128 = 'INT128',
        BOOL = 'BOOL',
        ADDRESS = 'ADDRESS',
        STRING = 'STRING',
        BYTES32 = 'BYTES32',
        BYTES = 'BYTES',
        ADDRESS_UINT256_TUPLE = 'ADDRESS_UINT256_TUPLE',
        ARRAY_OF_ADDRESSES = 'ARRAY_OF_ADDRESSES',
        ARRAY_OF_UINT256 = 'ARRAY_OF_UINT256',
        ARRAY_OF_UINT128 = 'ARRAY_OF_UINT128',
        ARRAY_OF_UINT64 = 'ARRAY_OF_UINT64',
        ARRAY_OF_UINT32 = 'ARRAY_OF_UINT32',
        ARRAY_OF_UINT16 = 'ARRAY_OF_UINT16',
        ARRAY_OF_UINT8 = 'ARRAY_OF_UINT8',
        ARRAY_OF_STRING = 'ARRAY_OF_STRING',
        ARRAY_OF_BYTES = 'ARRAY_OF_BYTES',
    }

    /**
     * Describes a named parameter: `{ name: "paramName", type: "address" }`
     */
    interface NamedParameter {
        name: string;
        type: AllowedAbiTypes | ABIDataTypes;
    }

    /**
     * Decorator that marks a method as externally callable.
     *
     * If the *first* argument is NOT recognized as a parameter (string/object),
     * we treat it as the method name; subsequent arguments are parameter definitions (strings or objects).
     *
     * **Examples:**
     * ```
     *   @method()
     *   @method("myMethodName")
     *   @method("myMethodName", "address", "uint256")
     *   @method("address","uint256","bool")
     *   @method({ name: "to", type: "address" }, { name: "amount", type: "uint256" })
     *   @method("myMethodName", { name: "to", type: "address" }, "uint256")
     * ```
     *
     * The transform can interpret each argument to produce an ABI definition.
     */
    function method(
        name: string,
        ...paramDefs: (AllowedAbiTypes | NamedParameter)[]
    ): MethodDecorator;
    function method(...paramDefs: (AllowedAbiTypes | NamedParameter)[]): MethodDecorator;

    /**
     * Decorator that specifies the return type of a method for ABI generation.
     *
     * Examples:
     * ```
     *   @returns("bool")
     *   @returns("uint256")
     *   @returns("address[]")
     * ```
     */
    function returns(returnType: AllowedAbiTypes): MethodDecorator;
}

export {};
