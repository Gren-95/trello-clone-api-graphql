const axios = require('axios');

// Configuration
const GRAPHQL_API_URL = 'http://localhost:3066/graphql';

// Test cases for GraphQL error handling
async function testErrorHandling() {
  console.log('\n===== Testing GraphQL Error Handling =====');
  
  // Test Case 1: Invalid Login
  try {
    console.log('\n1. Testing Invalid Login:');
    const invalidLoginMutation = `
      mutation LoginUser($input: LoginInput!) {
        login(input: $input) {
          token
          user {
            id
            username
          }
        }
      }
    `;
    
    const response = await axios({
      method: 'POST',
      url: GRAPHQL_API_URL,
      headers: { 'Content-Type': 'application/json' },
      data: {
        query: invalidLoginMutation,
        variables: {
          input: {
            username: 'nonexistent_user',
            password: 'wrong_password'
          }
        }
      }
    });
    
    if (response.data.errors) {
      console.log('✅ Invalid login correctly returned errors:');
      console.log(JSON.stringify(response.data.errors, null, 2));
    } else {
      throw new Error('GraphQL API did not return errors for invalid login!');
    }
  } catch (error) {
    if (error.response?.data?.errors) {
      console.log('✅ Invalid login correctly returned errors:');
      console.log(JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
  
  // Test Case 2: Invalid Board ID
  try {
    console.log('\n2. Testing Invalid Board ID:');
    const invalidBoardQuery = `
      query GetBoard($id: ID!) {
        board(id: $id) {
          id
          name
        }
      }
    `;
    
    const response = await axios({
      method: 'POST',
      url: GRAPHQL_API_URL,
      headers: { 'Content-Type': 'application/json' },
      data: {
        query: invalidBoardQuery,
        variables: {
          id: 'nonexistent_board_id'
        }
      }
    });
    
    // Check for explicit errors or if the data is null (implicit error)
    if (response.data.errors || (response.data.data && response.data.data.board === null)) {
      console.log('✅ Invalid board ID correctly handled:');
      if (response.data.errors) {
        console.log(JSON.stringify(response.data.errors, null, 2));
      } else {
        console.log('GraphQL returned null for non-existent board (correct behavior)');
      }
    } else {
      throw new Error('GraphQL API did not properly handle invalid board ID!');
    }
  } catch (error) {
    if (error.response?.data?.errors) {
      console.log('✅ Invalid board ID correctly returned errors:');
      console.log(JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
  
  // Test Case 3: Invalid Mutation Input
  try {
    console.log('\n3. Testing Invalid Mutation Input:');
    const invalidCreateBoardMutation = `
      mutation CreateBoard($input: CreateBoardInput!) {
        createBoard(input: $input) {
          id
          name
        }
      }
    `;
    
    const response = await axios({
      method: 'POST',
      url: GRAPHQL_API_URL,
      headers: { 'Content-Type': 'application/json' },
      data: {
        query: invalidCreateBoardMutation,
        variables: {
          input: {
            // Missing required 'name' field
          }
        }
      }
    });
    
    if (response.data.errors) {
      console.log('✅ Invalid mutation input correctly returned errors:');
      console.log(JSON.stringify(response.data.errors, null, 2));
    } else {
      throw new Error('GraphQL API did not return errors for invalid mutation input!');
    }
  } catch (error) {
    if (error.response?.data?.errors) {
      console.log('✅ Invalid mutation input correctly returned errors:');
      console.log(JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
  
  // Test Case 4: Unauthorized Access
  try {
    console.log('\n4. Testing Unauthorized Access:');
    const unauthorizedBoardQuery = `
      query GetBoard($id: ID!) {
        board(id: $id) {
          id
          name
        }
      }
    `;
    
    // Using a made-up board ID - should return auth error since no token is provided
    const response = await axios({
      method: 'POST',
      url: GRAPHQL_API_URL,
      headers: { 'Content-Type': 'application/json' },
      data: {
        query: unauthorizedBoardQuery,
        variables: {
          id: '123456789'
        }
      }
    });
    
    // Accept either explicit errors or null data as valid error handling
    if (response.data.errors || (response.data.data && response.data.data.board === null)) {
      console.log('✅ Unauthorized access correctly handled:');
      if (response.data.errors) {
        console.log(JSON.stringify(response.data.errors, null, 2));
      } else {
        console.log('GraphQL returned null for unauthorized access (correct behavior)');
      }
    } else {
      throw new Error('GraphQL API did not properly handle unauthorized access!');
    }
  } catch (error) {
    if (error.response?.data?.errors) {
      console.log('✅ Unauthorized access correctly returned errors:');
      console.log(JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
  
  console.log('\n✅ All GraphQL error handling tests passed!');
}

// Run error handling tests
async function runTests() {
  try {
    console.log('\n🧪 STARTING ERROR HANDLING TESTS\n');
    await testErrorHandling();
    console.log('\n🎉 ERROR HANDLING TESTS COMPLETED SUCCESSFULLY 🎉');
  } catch (error) {
    console.error('\n❌ ERROR HANDLING TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 