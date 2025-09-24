/**
 * ESLint rule to prevent plaintext logging of sensitive data
 * This rule catches patterns like console.log(message.content) or logger.info(user.email)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent logging of sensitive data fields',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenFields: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'content',
              'contentEnc',
              'message',
              'email',
              'password',
              'token',
              'accessToken',
              'refreshToken',
              'apiKey',
              'secret',
              'feedback',
              'displayName',
              'displayNameEnc',
              'summaryText',
              'summaryTextEnc'
            ]
          },
          forbiddenMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['console.log', 'console.info', 'console.warn', 'console.error', 'console.debug']
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      plaintextLog: 'Logging sensitive field "{{field}}" is forbidden. Use logger from @sync/logger instead.',
      forbiddenMethod: 'Using {{method}} is forbidden. Use logger from @sync/logger instead.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const forbiddenFields = options.forbiddenFields || [
      'content', 'contentEnc', 'message', 'email', 'password', 'token',
      'accessToken', 'refreshToken', 'apiKey', 'secret', 'feedback',
      'displayName', 'displayNameEnc', 'summaryText', 'summaryTextEnc'
    ];
    const forbiddenMethods = options.forbiddenMethods || [
      'console.log', 'console.info', 'console.warn', 'console.error', 'console.debug'
    ];

    return {
      // Catch console.log(message.content) patterns
      CallExpression(node) {
        const { callee, arguments: args } = node;

        // Check for forbidden console methods
        if (callee.type === 'MemberExpression' && 
            callee.object.name === 'console' && 
            forbiddenMethods.includes(`console.${callee.property.name}`)) {
          context.report({
            node,
            messageId: 'forbiddenMethod',
            data: {
              method: `console.${callee.property.name}`
            }
          });
        }

        // Check for logging sensitive fields
        args.forEach(arg => {
          if (arg.type === 'MemberExpression') {
            const fieldName = arg.property.name;
            if (forbiddenFields.includes(fieldName)) {
              context.report({
                node: arg,
                messageId: 'plaintextLog',
                data: {
                  field: fieldName
                }
              });
            }
          }

          // Check for object expressions with sensitive fields
          if (arg.type === 'ObjectExpression') {
            arg.properties.forEach(prop => {
              if (prop.type === 'Property' && 
                  prop.key.type === 'Identifier' && 
                  forbiddenFields.includes(prop.key.name)) {
                context.report({
                  node: prop,
                  messageId: 'plaintextLog',
                  data: {
                    field: prop.key.name
                  }
                });
              }
            });
          }
        });
      },

      // Catch logger calls with sensitive fields
      CallExpression(node) {
        const { callee, arguments: args } = node;

        // Check if it's a logger call
        if (callee.type === 'MemberExpression' && 
            callee.object.name === 'logger') {
          
          args.forEach(arg => {
            if (arg.type === 'ObjectExpression') {
              arg.properties.forEach(prop => {
                if (prop.type === 'Property' && 
                    prop.key.type === 'Identifier' && 
                    forbiddenFields.includes(prop.key.name)) {
                  context.report({
                    node: prop,
                    messageId: 'plaintextLog',
                    data: {
                      field: prop.key.name
                    }
                  });
                }
              });
            }
          });
        }
      }
    };
  }
};
