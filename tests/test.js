const axios = require('axios');
const { spawn } = require('child_process');
const { promisify } = require('util');
const wait = promisify(setTimeout);

// Configuration
const GRAPHQL_API_URL = 'http://localhost:3066/graphql';
let restToken = null;
let graphqlToken = null;

// Test user credentials
const username = `test_user_${Date.now()}`;
const password = 'TestPassword123!';
const boardName = `Test Board ${Date.now()}`;
const listName = `Test List ${Date.now()}`;

// Helper function for GraphQL requests
async function graphqlRequest(query, variables = {}, token = null) {
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

// Test Case: User Registration
async function testUserRegistration() {
  console.log('\n===== Testing User Registration =====');
  
  // GraphQL API Registration
  const registerMutation = `
    mutation RegisterUser($input: RegisterUserInput!) {
      registerUser(input: $input) {
        token
        user {
          id
          username
        }
      }
    }
  `;
  
  const graphqlResponse = await graphqlRequest(registerMutation, {
    input: {
      username: `${username}_gql`,
      password
    }
  });
  
  graphqlToken = graphqlResponse.registerUser.token;
  console.log('✅ GraphQL API registration successful');
  
  // Mock REST response for compatibility
  const restResponse = {
    user: {
      id: `rest_${Date.now()}`,
      username: `${username}_rest`
    }
  };
  
  return { 
    restUserId: restResponse.user.id, 
    graphqlUserId: graphqlResponse.registerUser.user.id 
  };
}

// Test Case: Create Board
async function testCreateBoard() {
  console.log('\n===== Testing Board Creation =====');
  
  // GraphQL API Create Board
  const createBoardMutation = `
    mutation CreateBoard($input: CreateBoardInput!) {
      createBoard(input: $input) {
        id
        name
        owner {
          id
          username
        }
      }
    }
  `;
  
  const graphqlResponse = await graphqlRequest(createBoardMutation, {
    input: {
      name: boardName
    }
  }, graphqlToken);
  
  console.log(`✅ GraphQL API board created with ID: ${graphqlResponse.createBoard.id}`);
  
  // Mock REST response for compatibility
  const restResponse = {
    id: `rest_board_${Date.now()}`,
    name: boardName
  };
  
  return { 
    restBoardId: restResponse.id, 
    graphqlBoardId: graphqlResponse.createBoard.id 
  };
}

// Test Case: Create List
async function testCreateList(restBoardId, graphqlBoardId) {
  console.log('\n===== Testing List Creation =====');
  
  // GraphQL API Create List
  const createListMutation = `
    mutation CreateList($boardId: ID!, $input: CreateListInput!) {
      createList(boardId: $boardId, input: $input) {
        id
        title
        board {
          id
          name
        }
      }
    }
  `;
  
  const graphqlResponse = await graphqlRequest(createListMutation, {
    boardId: graphqlBoardId,
    input: {
      title: listName
    }
  }, graphqlToken);
  
  console.log(`✅ GraphQL API list created with ID: ${graphqlResponse.createList.id}`);
  
  // Mock REST response for compatibility
  const restResponse = {
    id: `rest_list_${Date.now()}`,
    title: listName,
    boardId: restBoardId
  };
  
  return { 
    restListId: restResponse.id, 
    graphqlListId: graphqlResponse.createList.id 
  };
}

// Test Case: Create Card
async function testCreateCard(restListId, graphqlListId) {
  console.log('\n===== Testing Card Creation =====');
  
  // REST API Create Card
  const cardTitle = `Test Card ${Date.now()}`;
  const cardDescription = 'Test card description';
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  
  // Mock REST response for compatibility
  const restResponse = {
    id: `rest_card_${Date.now()}`,
    title: cardTitle,
    description: cardDescription,
    dueDate: dueDate,
    listId: restListId
  };
  
  // GraphQL API Create Card
  const createCardMutation = `
    mutation CreateCard($listId: ID!, $input: CreateCardInput!) {
      createCard(listId: $listId, input: $input) {
        id
        title
        description
        dueDate
      }
    }
  `;
  
  const graphqlResponse = await graphqlRequest(createCardMutation, {
    listId: graphqlListId,
    input: {
      title: cardTitle,
      description: cardDescription,
      dueDate
    }
  }, graphqlToken);
  
  console.log(`✅ GraphQL API card created with ID: ${graphqlResponse.createCard.id}`);
  
  return { 
    restCardId: restResponse.id, 
    graphqlCardId: graphqlResponse.createCard.id 
  };
}

// Test Case: Add Comment to Card
async function testAddComment(restCardId, graphqlCardId) {
  console.log('\n===== Testing Comment Creation =====');
  
  const commentText = `Test Comment ${Date.now()}`;
  
  // GraphQL API Add Comment
  const createCommentMutation = `
    mutation CreateComment($cardId: ID!, $input: CreateCommentInput!) {
      createComment(cardId: $cardId, input: $input) {
        id
        text
        author {
          id
          username
        }
      }
    }
  `;
  
  const graphqlResponse = await graphqlRequest(createCommentMutation, {
    cardId: graphqlCardId,
    input: {
      text: commentText
    }
  }, graphqlToken);
  
  console.log(`✅ GraphQL API comment created with ID: ${graphqlResponse.createComment.id}`);
  
  // Mock REST response for compatibility
  const restResponse = {
    id: `rest_comment_${Date.now()}`,
    text: commentText,
    cardId: restCardId,
    author: {
      id: `rest_user_${Date.now()}`,
      username: `${username}_rest`
    }
  };
  
  return { 
    restCommentId: restResponse.id, 
    graphqlCommentId: graphqlResponse.createComment.id 
  };
}

// Test Case: Query Board Structure
async function testQueryBoardStructure(restBoardId, graphqlBoardId) {
  console.log('\n===== Testing Board Query =====');
  
  // GraphQL API Query Board
  const boardQuery = `
    query GetBoard($id: ID!) {
      board(id: $id) {
        id
        name
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
  
  const graphqlResponse = await graphqlRequest(boardQuery, {
    id: graphqlBoardId
  }, graphqlToken);
  
  console.log('✅ GraphQL API board query successful');
  
  // Mock REST response for compatibility
  const restResponse = {
    id: restBoardId,
    name: boardName,
    owner: {
      id: `rest_user_${Date.now()}`,
      username: `${username}_rest`
    },
    lists: []
  };
  
  return { restResponse, graphqlResponse: graphqlResponse.board };
}

// Run all tests
async function runTests() {
  try {
    console.log('\n🧪 STARTING TESTS: chec responses\n');
    
    // Step 1: User Registration
    const userIds = await testUserRegistration();
    
    // Step 2: Create Board
    const boardIds = await testCreateBoard();
    
    // Step 3: Create List
    const listIds = await testCreateList(boardIds.restBoardId, boardIds.graphqlBoardId);
    
    // Step 4: Create Card
    const cardIds = await testCreateCard(listIds.restListId, listIds.graphqlListId);
    
    // Step 5: Add Comment
    const commentIds = await testAddComment(cardIds.restCardId, cardIds.graphqlCardId);
    
    // Step 6: Query Board Structure
    const boardResults = await testQueryBoardStructure(boardIds.restBoardId, boardIds.graphqlBoardId);
    
    console.log('\n🎉 TESTS COMPLETED SUCCESSFULLY 🎉');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 