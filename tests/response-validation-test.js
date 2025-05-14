const axios = require('axios');
const { promisify } = require('util');
const wait = promisify(setTimeout);

// Configuration
const GRAPHQL_API_URL = 'http://localhost:3066/graphql';
let token = null;

// Test user credentials - unique for each test run
const username = `test_user_${Date.now()}`;
const password = 'TestPassword123!';

// Helper function for GraphQL requests
async function graphqlRequest(query, variables = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await axios({
      method: 'POST',
      url: GRAPHQL_API_URL,
      headers,
      data: {
        query,
        variables
      }
    });
    
    if (response.data.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
    }
    
    return response.data.data;
  } catch (error) {
    console.error('GraphQL Request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Validate response against expected structure
function validateResponseStructure(response, expectedFields, path = '') {
  for (const field of expectedFields) {
    const value = path ? path.split('.').reduce((obj, key) => obj?.[key], response)?.[field] : response?.[field];
    
    if (value === undefined) {
      throw new Error(`Missing expected field '${path ? path + '.' : ''}${field}' in response`);
    }
  }
  
  return true;
}

// Test GraphQL response validation
async function testResponseValidation() {
  console.log('\n===== Testing GraphQL Response Validation =====');
  
  try {
    // Step 1: Register and get auth token
    console.log('\n1. Register a new user and test response structure');
    const registerMutation = `
      mutation RegisterUser($input: RegisterUserInput!) {
        registerUser(input: $input) {
          token
          user {
            id
            username
            createdAt
          }
        }
      }
    `;
    
    const registerResult = await graphqlRequest(registerMutation, {
      input: {
        username,
        password
      }
    });
    
    // Validate register response structure
    validateResponseStructure(registerResult, ['registerUser']);
    validateResponseStructure(registerResult.registerUser, ['token', 'user']);
    validateResponseStructure(registerResult.registerUser.user, ['id', 'username', 'createdAt']);
    
    token = registerResult.registerUser.token;
    console.log('✅ User registration response structure is valid');
    
    // Step 2: Create a board and test response
    console.log('\n2. Create a board and test response structure');
    const createBoardMutation = `
      mutation CreateBoard($input: CreateBoardInput!) {
        createBoard(input: $input) {
          id
          name
          createdAt
          owner {
            id
            username
          }
          members {
            role
            user {
              id
              username
            }
          }
          lists {
            id
            title
          }
        }
      }
    `;
    
    const createBoardResult = await graphqlRequest(createBoardMutation, {
      input: {
        name: 'Test Board for Response Validation'
      }
    });
    
    // Validate board response structure
    validateResponseStructure(createBoardResult, ['createBoard']);
    validateResponseStructure(createBoardResult.createBoard, ['id', 'name', 'createdAt', 'owner', 'members', 'lists']);
    validateResponseStructure(createBoardResult.createBoard.owner, ['id', 'username']);
    
    const boardId = createBoardResult.createBoard.id;
    console.log('✅ Board creation response structure is valid');
    
    // Step 3: Create a list and test response
    console.log('\n3. Create a list and test response structure');
    const createListMutation = `
      mutation CreateList($boardId: ID!, $input: CreateListInput!) {
        createList(boardId: $boardId, input: $input) {
          id
          title
          createdAt
          position
          board {
            id
            name
          }
          cards {
            id
            title
          }
        }
      }
    `;
    
    const createListResult = await graphqlRequest(createListMutation, {
      boardId,
      input: {
        title: 'Test List for Response Validation'
      }
    });
    
    // Validate list response structure
    validateResponseStructure(createListResult, ['createList']);
    validateResponseStructure(createListResult.createList, ['id', 'title', 'createdAt', 'board', 'cards']);
    validateResponseStructure(createListResult.createList.board, ['id', 'name']);
    
    const listId = createListResult.createList.id;
    console.log('✅ List creation response structure is valid');
    
    // Step 4: Create a card and test response
    console.log('\n4. Create a card and test response structure');
    const createCardMutation = `
      mutation CreateCard($listId: ID!, $input: CreateCardInput!) {
        createCard(listId: $listId, input: $input) {
          id
          title
          description
          createdAt
          dueDate
          position
          list {
            id
            title
          }
          comments {
            id
            text
          }
          labels
        }
      }
    `;
    
    const createCardResult = await graphqlRequest(createCardMutation, {
      listId,
      input: {
        title: 'Test Card for Response Validation',
        description: 'Testing the response structure',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        labels: ["important", "test"]
      }
    });
    
    // Validate card response structure
    validateResponseStructure(createCardResult, ['createCard']);
    validateResponseStructure(createCardResult.createCard, ['id', 'title', 'description', 'createdAt', 'dueDate', 'list', 'comments', 'labels']);
    validateResponseStructure(createCardResult.createCard.list, ['id', 'title']);
    
    const cardId = createCardResult.createCard.id;
    console.log('✅ Card creation response structure is valid');
    
    // Step 5: Add a comment and test response
    console.log('\n5. Add a comment and test response structure');
    const createCommentMutation = `
      mutation CreateComment($cardId: ID!, $input: CreateCommentInput!) {
        createComment(cardId: $cardId, input: $input) {
          id
          text
          createdAt
          author {
            id
            username
          }
          card {
            id
            title
          }
        }
      }
    `;
    
    const createCommentResult = await graphqlRequest(createCommentMutation, {
      cardId,
      input: {
        text: 'Test Comment for Response Validation'
      }
    });
    
    // Validate comment response structure
    validateResponseStructure(createCommentResult, ['createComment']);
    validateResponseStructure(createCommentResult.createComment, ['id', 'text', 'createdAt', 'author', 'card']);
    validateResponseStructure(createCommentResult.createComment.author, ['id', 'username']);
    validateResponseStructure(createCommentResult.createComment.card, ['id', 'title']);
    
    console.log('✅ Comment creation response structure is valid');
    
    // Step 6: Query the board with all its content and test response
    console.log('\n6. Query the full board structure and test response');
    const boardQuery = `
      query GetBoard($id: ID!) {
        board(id: $id) {
          id
          name
          createdAt
          owner {
            id
            username
          }
          lists {
            id
            title
            cards {
              id
              title
              description
              comments {
                id
                text
                author {
                  id
                  username
                }
              }
            }
          }
        }
      }
    `;
    
    const boardResult = await graphqlRequest(boardQuery, {
      id: boardId
    });
    
    // Validate board query response structure
    validateResponseStructure(boardResult, ['board']);
    validateResponseStructure(boardResult.board, ['id', 'name', 'createdAt', 'owner', 'lists']);
    validateResponseStructure(boardResult.board.owner, ['id', 'username']);
    validateResponseStructure(boardResult.board.lists[0], ['id', 'title', 'cards']);
    validateResponseStructure(boardResult.board.lists[0].cards[0], ['id', 'title', 'description', 'comments']);
    validateResponseStructure(boardResult.board.lists[0].cards[0].comments[0], ['id', 'text', 'author']);
    validateResponseStructure(boardResult.board.lists[0].cards[0].comments[0].author, ['id', 'username']);
    
    console.log('✅ Board query response structure is valid');
    
    console.log('\n✅ All response structures match the schema definitions!');
    return true;
  } catch (error) {
    console.error(`❌ Response validation failed: ${error.message}`);
    throw error;
  }
}

// Run response validation tests
async function runTests() {
  try {
    console.log('\n🧪 STARTING RESPONSE VALIDATION TESTS\n');
    await testResponseValidation();
    console.log('\n🎉 RESPONSE VALIDATION TESTS COMPLETED SUCCESSFULLY 🎉');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RESPONSE VALIDATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 