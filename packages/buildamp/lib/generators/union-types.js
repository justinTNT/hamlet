/**
 * Union Type Code Generation
 *
 * Generates Elm code for union types:
 * - Type definitions
 * - JSON encoders
 * - JSON decoders
 *
 * Encoding strategy (JSON):
 * - Simple variants: { "tag": "Active" }
 * - Single arg: { "tag": "Pending", "value": "string" }
 * - Multiple args: { "tag": "Pair", "value": [1, "string"] }
 * - Record args: { "tag": "Extended", "value": { "code": 1 } }
 */

/**
 * Convert Elm type to encoder expression
 */
function elmTypeToEncoder(elmType) {
    const type = elmType.trim();

    if (type === 'String') return 'Json.Encode.string';
    if (type === 'Int') return 'Json.Encode.int';
    if (type === 'Float') return 'Json.Encode.float';
    if (type === 'Bool') return 'Json.Encode.bool';

    if (type.startsWith('Maybe ')) {
        const inner = type.slice(6).trim();
        const innerEncoder = elmTypeToEncoder(inner);
        return `(Maybe.map ${innerEncoder} >> Maybe.withDefault Json.Encode.null)`;
    }

    if (type.startsWith('List ')) {
        const inner = type.slice(5).trim();
        const innerEncoder = elmTypeToEncoder(inner);
        return `(Json.Encode.list ${innerEncoder})`;
    }

    // Record type - inline
    if (type.startsWith('{') && type.endsWith('}')) {
        return `encodeInlineRecord`; // Will need custom handling
    }

    // Custom type - assume encoder exists with naming convention
    const encoderName = type.charAt(0).toLowerCase() + type.slice(1) + 'Encoder';
    return encoderName;
}

/**
 * Convert Elm type to decoder expression
 */
function elmTypeToDecoder(elmType) {
    const type = elmType.trim();

    if (type === 'String') return 'Json.Decode.string';
    if (type === 'Int') return 'Json.Decode.int';
    if (type === 'Float') return 'Json.Decode.float';
    if (type === 'Bool') return 'Json.Decode.bool';

    if (type.startsWith('Maybe ')) {
        const inner = type.slice(6).trim();
        const innerDecoder = elmTypeToDecoder(inner);
        return `(Json.Decode.maybe ${innerDecoder})`;
    }

    if (type.startsWith('List ')) {
        const inner = type.slice(5).trim();
        const innerDecoder = elmTypeToDecoder(inner);
        return `(Json.Decode.list ${innerDecoder})`;
    }

    // Record type - inline
    if (type.startsWith('{') && type.endsWith('}')) {
        return `decodeInlineRecord`; // Will need custom handling
    }

    // Custom type - assume decoder exists with naming convention
    const decoderName = type.charAt(0).toLowerCase() + type.slice(1) + 'Decoder';
    return decoderName;
}

/**
 * Generate Elm type definition for a union type
 * (Usually just re-exports the original, but useful for documentation)
 */
export function generateUnionTypeDefinition(unionType) {
    const { name, typeParams, variants } = unionType;

    const typeParamStr = typeParams.length > 0 ? ' ' + typeParams.join(' ') : '';

    const variantLines = variants.map((variant, index) => {
        const prefix = index === 0 ? '=' : '|';
        const argsStr = variant.args.length > 0 ? ' ' + variant.args.join(' ') : '';
        return `    ${prefix} ${variant.name}${argsStr}`;
    });

    return `type ${name}${typeParamStr}
${variantLines.join('\n')}`;
}

/**
 * Generate JSON encoder for a union type
 */
export function generateUnionEncoder(unionType) {
    const { name, typeParams, variants } = unionType;

    // Skip types with type parameters for now (like Maybe a)
    if (typeParams.length > 0) {
        return null;
    }

    const encoderName = name.charAt(0).toLowerCase() + name.slice(1) + 'Encoder';

    const cases = variants.map(variant => {
        const { name: variantName, args } = variant;

        if (args.length === 0) {
            // Simple variant: encode as { "tag": "VariantName" }
            return `        ${variantName} ->
            Json.Encode.object [ ( "tag", Json.Encode.string "${variantName}" ) ]`;
        } else if (args.length === 1) {
            // Single arg: encode as { "tag": "VariantName", "value": encodedArg }
            const encoder = elmTypeToEncoder(args[0]);
            return `        ${variantName} value0 ->
            Json.Encode.object
                [ ( "tag", Json.Encode.string "${variantName}" )
                , ( "value", ${encoder} value0 )
                ]`;
        } else {
            // Multiple args: encode as { "tag": "VariantName", "value": [arg0, arg1, ...] }
            const argNames = args.map((_, i) => `value${i}`);
            const encodedArgs = args.map((arg, i) => `${elmTypeToEncoder(arg)} value${i}`);
            return `        ${variantName} ${argNames.join(' ')} ->
            Json.Encode.object
                [ ( "tag", Json.Encode.string "${variantName}" )
                , ( "value", Json.Encode.list identity [ ${encodedArgs.join(', ')} ] )
                ]`;
        }
    });

    return `${encoderName} : ${name} -> Json.Encode.Value
${encoderName} value =
    case value of
${cases.join('\n\n')}`;
}

/**
 * Generate JSON decoder for a union type
 */
export function generateUnionDecoder(unionType) {
    const { name, typeParams, variants } = unionType;

    // Skip types with type parameters for now
    if (typeParams.length > 0) {
        return null;
    }

    const decoderName = name.charAt(0).toLowerCase() + name.slice(1) + 'Decoder';

    const cases = variants.map(variant => {
        const { name: variantName, args } = variant;

        if (args.length === 0) {
            // Simple variant
            return `                    "${variantName}" ->
                        Json.Decode.succeed ${variantName}`;
        } else if (args.length === 1) {
            // Single arg
            const decoder = elmTypeToDecoder(args[0]);
            return `                    "${variantName}" ->
                        Json.Decode.map ${variantName} (Json.Decode.field "value" ${decoder})`;
        } else {
            // Multiple args - decode from array
            const decoderSteps = args.map((arg, i) => {
                const decoder = elmTypeToDecoder(arg);
                return `                            |> Json.Decode.andThen (\\f -> Json.Decode.map f (Json.Decode.index ${i} ${decoder}))`;
            });
            return `                    "${variantName}" ->
                        Json.Decode.field "value"
                            (Json.Decode.succeed ${variantName}
${decoderSteps.join('\n')}
                            )`;
        }
    });

    return `${decoderName} : Json.Decode.Decoder ${name}
${decoderName} =
    Json.Decode.field "tag" Json.Decode.string
        |> Json.Decode.andThen
            (\\tag ->
                case tag of
${cases.join('\n\n')}

                    _ ->
                        Json.Decode.fail ("Unknown ${name} variant: " ++ tag)
            )`;
}

/**
 * Generate all code for a union type (definition, encoder, decoder)
 */
export function generateUnionTypeCode(unionType) {
    const definition = generateUnionTypeDefinition(unionType);
    const encoder = generateUnionEncoder(unionType);
    const decoder = generateUnionDecoder(unionType);

    const parts = [definition];
    if (encoder) parts.push(encoder);
    if (decoder) parts.push(decoder);

    return parts.join('\n\n\n');
}

/**
 * Generate code for multiple union types
 */
export function generateAllUnionTypes(unionTypes) {
    return unionTypes
        .map(generateUnionTypeCode)
        .join('\n\n\n');
}

// Test exports
export const _test = {
    elmTypeToEncoder,
    elmTypeToDecoder,
    generateUnionTypeDefinition,
    generateUnionEncoder,
    generateUnionDecoder,
    generateUnionTypeCode,
    generateAllUnionTypes
};

export default {
    generateUnionTypeDefinition,
    generateUnionEncoder,
    generateUnionDecoder,
    generateUnionTypeCode,
    generateAllUnionTypes,
    _test
};
