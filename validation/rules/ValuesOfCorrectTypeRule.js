'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.ValuesOfCorrectTypeRule = ValuesOfCorrectTypeRule;

var _keyMap = require('../../jsutils/keyMap.js');

var _inspect = require('../../jsutils/inspect.js');

var _didYouMean = require('../../jsutils/didYouMean.js');

var _suggestionList = require('../../jsutils/suggestionList.js');

var _GraphQLError = require('../../error/GraphQLError.js');

var _printer = require('../../language/printer.js');

var _definition = require('../../type/definition.js');

/**
 * Value literals of correct type
 *
 * A GraphQL document is only valid if all value literals are of the type
 * expected at their position.
 *
 * See https://spec.graphql.org/draft/#sec-Values-of-Correct-Type
 */
function ValuesOfCorrectTypeRule(context) {
  return {
    ListValue(node) {
      // Note: TypeInfo will traverse into a list's item type, so look to the
      // parent input type to check if it is a list.
      const type = (0, _definition.getNullableType)(
        context.getParentInputType(),
      );

      if (!(0, _definition.isListType)(type)) {
        isValidValueNode(context, node);
        return false; // Don't traverse further.
      }
    },

    ObjectValue(node) {
      const type = (0, _definition.getNamedType)(context.getInputType());

      if (!(0, _definition.isInputObjectType)(type)) {
        isValidValueNode(context, node);
        return false; // Don't traverse further.
      } // Ensure every required field exists.

      const fieldNodeMap = (0, _keyMap.keyMap)(
        node.fields,
        (field) => field.name.value,
      );

      for (const fieldDef of Object.values(type.getFields())) {
        const fieldNode = fieldNodeMap[fieldDef.name];

        if (!fieldNode && (0, _definition.isRequiredInputField)(fieldDef)) {
          const typeStr = (0, _inspect.inspect)(fieldDef.type);
          context.reportError(
            new _GraphQLError.GraphQLError(
              `Field "${type.name}.${fieldDef.name}" of required type "${typeStr}" was not provided.`,
              node,
            ),
          );
        }
      }
    },

    ObjectField(node) {
      const parentType = (0, _definition.getNamedType)(
        context.getParentInputType(),
      );
      const fieldType = context.getInputType();

      if (!fieldType && (0, _definition.isInputObjectType)(parentType)) {
        const suggestions = (0, _suggestionList.suggestionList)(
          node.name.value,
          Object.keys(parentType.getFields()),
        );
        context.reportError(
          new _GraphQLError.GraphQLError(
            `Field "${node.name.value}" is not defined by type "${parentType.name}".` +
              (0, _didYouMean.didYouMean)(suggestions),
            node,
          ),
        );
      }
    },

    NullValue(node) {
      const type = context.getInputType();

      if ((0, _definition.isNonNullType)(type)) {
        context.reportError(
          new _GraphQLError.GraphQLError(
            `Expected value of type "${(0, _inspect.inspect)(
              type,
            )}", found ${(0, _printer.print)(node)}.`,
            node,
          ),
        );
      }
    },

    EnumValue: (node) => isValidValueNode(context, node),
    IntValue: (node) => isValidValueNode(context, node),
    FloatValue: (node) => isValidValueNode(context, node),
    StringValue: (node) => isValidValueNode(context, node),
    BooleanValue: (node) => isValidValueNode(context, node),
  };
}
/**
 * Any value literal may be a valid representation of a Scalar, depending on
 * that scalar type.
 */

function isValidValueNode(context, node) {
  // Report any error at the full type expected by the location.
  const locationType = context.getInputType();

  if (!locationType) {
    return;
  }

  const type = (0, _definition.getNamedType)(locationType);

  if (!(0, _definition.isLeafType)(type)) {
    const typeStr = (0, _inspect.inspect)(locationType);
    context.reportError(
      new _GraphQLError.GraphQLError(
        `Expected value of type "${typeStr}", found ${(0, _printer.print)(
          node,
        )}.`,
        node,
      ),
    );
    return;
  } // Scalars and Enums determine if a literal value is valid via parseLiteral(),
  // which may throw or return an invalid value to indicate failure.

  try {
    const parseResult = type.parseLiteral(
      node,
      undefined,
      /* variables */
    );

    if (parseResult === undefined) {
      const typeStr = (0, _inspect.inspect)(locationType);
      context.reportError(
        new _GraphQLError.GraphQLError(
          `Expected value of type "${typeStr}", found ${(0, _printer.print)(
            node,
          )}.`,
          node,
        ),
      );
    }
  } catch (error) {
    const typeStr = (0, _inspect.inspect)(locationType);

    if (error instanceof _GraphQLError.GraphQLError) {
      context.reportError(error);
    } else {
      context.reportError(
        new _GraphQLError.GraphQLError(
          `Expected value of type "${typeStr}", found ${(0, _printer.print)(
            node,
          )}; ` + error.message,
          node,
          undefined,
          undefined,
          undefined,
          error,
        ),
      );
    }
  }
}
