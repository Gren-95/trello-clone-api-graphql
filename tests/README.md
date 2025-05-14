# GraphQL API Tests

This directory contains tests that verify the GraphQL API's functionality and compare it with the original REST API.

## Test Structure

The tests are organized into several files, each focusing on a specific aspect of the GraphQL API:

1. **Schema Validation Tests** (`schema-test.js`): Validates the GraphQL schema structure and ensures all required types and fields are present.

2. **Response Structure Validation Tests** (`response-validation-test.js`): Verifies that GraphQL responses match the structure defined in the schema.

3. **API Feature Comparison Tests** (`test.js`): Compares the GraphQL API with the REST API by creating identical resources and verifying the responses.

4. **Error Handling Tests** (`error-test.js`): Tests that the GraphQL API properly handles error cases and returns appropriate error messages.

5. **Comprehensive Test Runner** (`run-all.js`): A JavaScript runner that executes all tests in sequence and provides a detailed summary.

## Running the Tests

### Prerequisites

Before running the tests, ensure that:

1. Both the REST API and GraphQL API servers are running
2. The REST API is accessible at http://localhost:3000
3. The GraphQL API is accessible at http://localhost:3066/graphql
4. All dependencies are installed (`npm install`)

### Running All Tests

To run all tests at once:

```bash
./test.sh
```

or

```bash
node tests/run-all.js
```

### Running Individual Tests

You can also run each test individually:

```bash
# Schema validation
node tests/schema-test.js

# Response structure validation
node tests/response-validation-test.js 

# API feature comparison
node tests/test.js

# Error handling
node tests/error-test.js
```

## Test Criteria

The tests verify that the GraphQL API meets the following criteria:

1. The GraphQL SDL validates and introspection works
2. All REST endpoints have equivalent GraphQL queries or mutations in the schema
3. The service can be started with a single command
4. All sample queries and mutations work and return logically correct responses
5. Automated tests compare REST and GraphQL responses for functional equivalence
6. GraphQL responses match the structure defined in the schema
7. Error cases are handled correctly with appropriate error messages
8. README.md provides clear build and run instructions

## Test Output

The test runner produces a colorful, formatted output that includes:

- Status of each test (passed/failed)
- Duration of each test
- A summary table with all test results
- Total duration of the test suite
- Final result (PASSED/FAILED)

If any test fails, the output will include detailed error messages to help diagnose the issue. 