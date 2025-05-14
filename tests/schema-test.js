const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { buildSchema, validateSchema, introspectionFromSchema } = require('graphql');

// Configuration
const GRAPHQL_API_URL = 'http://localhost:3066/graphql';
const SCHEMA_PATH = path.join(__dirname, '../schema/schema.graphql');

// Test GraphQL schema validation
async function testSchemaValidation() {
  console.log('\n===== Testing GraphQL Schema Validation =====');
  
  try {
    // Read schema file
    console.log('Reading schema file...');
    const schemaString = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    // Parse and validate schema
    console.log('Validating schema syntax...');
    const schema = buildSchema(schemaString);
    
    // Check for validation errors
    const validationErrors = validateSchema(schema);
    if (validationErrors.length > 0) {
      console.error('❌ Schema validation failed:');
      validationErrors.forEach(error => {
        console.error(`- ${error.message}`);
      });
      throw new Error('Schema validation failed');
    }
    
    console.log('✅ Schema syntax is valid');
    
    // Test introspection
    console.log('\nTesting introspection query...');
    
    const introspectionQuery = `
      {
        __schema {
          queryType {
            name
          }
          mutationType {
            name
          }
          types {
            kind
            name
            description
          }
        }
      }
    `;
    
    const response = await axios({
      method: 'POST',
      url: GRAPHQL_API_URL,
      headers: { 'Content-Type': 'application/json' },
      data: { query: introspectionQuery }
    });
    
    if (!response.data.data.__schema) {
      throw new Error('Introspection query failed');
    }
    
    console.log('✅ Introspection query successful');
    
    // Verify all REST endpoints have GraphQL equivalents
    console.log('\nVerifying all REST endpoints have GraphQL equivalents...');
    
    // Check if all required types exist
    const requiredTypes = ['User', 'Board', 'List', 'Card', 'Comment', 'Checklist'];
    const types = response.data.data.__schema.types.map(t => t.name);
    
    for (const type of requiredTypes) {
      if (!types.includes(type)) {
        throw new Error(`Required type '${type}' is missing from schema`);
      }
    }
    
    console.log('✅ All required types are present in the schema');
    
    // Check if Query type has required fields
    const queryTypeFields = await getTypeFields('Query');
    const requiredQueryFields = ['boards', 'board', 'listsForBoard', 'cardsForList', 'card'];
    
    for (const field of requiredQueryFields) {
      if (!queryTypeFields.includes(field)) {
        throw new Error(`Required query field '${field}' is missing from schema`);
      }
    }
    
    console.log('✅ All required query fields are present in the schema');
    
    // Check if Mutation type has required fields
    const mutationTypeFields = await getTypeFields('Mutation');
    const requiredMutationFields = [
      'registerUser', 'login', 'createBoard', 'updateBoard', 'deleteBoard',
      'createList', 'updateList', 'deleteList',
      'createCard', 'updateCard', 'deleteCard',
      'createComment', 'updateComment', 'deleteComment'
    ];
    
    for (const field of requiredMutationFields) {
      if (!mutationTypeFields.includes(field)) {
        throw new Error(`Required mutation field '${field}' is missing from schema`);
      }
    }
    
    console.log('✅ All required mutation fields are present in the schema');
    
    console.log('\n✅ Schema validation completed successfully!');
    return true;
  } catch (error) {
    console.error(`❌ Schema validation failed: ${error.message}`);
    throw error;
  }
}

// Helper function to get fields of a specific type
async function getTypeFields(typeName) {
  const typeQuery = `
    {
      __type(name: "${typeName}") {
        fields {
          name
        }
      }
    }
  `;
  
  const response = await axios({
    method: 'POST',
    url: GRAPHQL_API_URL,
    headers: { 'Content-Type': 'application/json' },
    data: { query: typeQuery }
  });
  
  if (!response.data.data.__type || !response.data.data.__type.fields) {
    throw new Error(`Could not get fields for type '${typeName}'`);
  }
  
  return response.data.data.__type.fields.map(f => f.name);
}

// Run schema validation tests
async function runTests() {
  try {
    console.log('\n🧪 STARTING SCHEMA VALIDATION TESTS\n');
    await testSchemaValidation();
    console.log('\n🎉 SCHEMA VALIDATION TESTS COMPLETED SUCCESSFULLY 🎉');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SCHEMA VALIDATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 