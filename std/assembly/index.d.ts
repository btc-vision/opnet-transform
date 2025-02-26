/**
 * Environment definitions for compiling AssemblyScript to WebAssembly using asc.
 * @module std/assembly
 */

/// <reference no-default-lib="true"/>

// Types

import { AllowedAbiTypes, MethodDecorator } from '../types/assembly/AbiTypeStr';

declare global {
    /**
     * Describes a named parameter: `{ name: "paramName", type: "address" }`
     */
    interface NamedParameter {
        name: string;
        type: AllowedAbiTypes;
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
