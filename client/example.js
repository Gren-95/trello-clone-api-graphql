// GraphQL API Client Example
// Run with: node example.js

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3066/graphql';
let token = null;

// Helper function for GraphQL requests
async function graphqlRequest(query, variables = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

// Example workflow
async function runExample() {
  // Generate a unique username for each run
  const username = `user_${Date.now()}`;
  const password = 'Password123!';
  
  console.log('Trello Clone GraphQL API Example:');
  console.log('--------------------------------');
  console.log(`Using test user: ${username}`);
  
  try {
    // Step 1: Register a new user
    console.log('\n1. Register a new user');
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
    
    const registerResult = await graphqlRequest(registerMutation, {
      input: {
        username,
        password
      }
    });
    
    if (registerResult.errors) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResult.errors)}`);
    }
    
    token = registerResult.data.registerUser.token;
    const userId = registerResult.data.registerUser.user.id;
    console.log(`✅ User registered with ID: ${userId}`);
    console.log(`✅ Token received: ${token.substring(0, 15)}...`);
    
    // Step 2: Create a board
    console.log('\n2. Create a board');
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
    
    const createBoardResult = await graphqlRequest(createBoardMutation, {
      input: {
        name: 'Example Board'
      }
    });
    
    if (createBoardResult.errors) {
      throw new Error(`Create board failed: ${JSON.stringify(createBoardResult.errors)}`);
    }
    
    const boardId = createBoardResult.data.createBoard.id;
    console.log(`✅ Board created with ID: ${boardId}`);
    
    // Step 3: Create a list in the board
    console.log('\n3. Create a list in the board');
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
    
    const createListResult = await graphqlRequest(createListMutation, {
      boardId,
      input: {
        title: 'Example List'
      }
    });
    
    if (createListResult.errors) {
      throw new Error(`Create list failed: ${JSON.stringify(createListResult.errors)}`);
    }
    
    const listId = createListResult.data.createList.id;
    console.log(`✅ List created with ID: ${listId}`);
    
    // Step 4: Create a card in the list
    console.log('\n4. Create a card in the list');
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
    
    const createCardResult = await graphqlRequest(createCardMutation, {
      listId,
      input: {
        title: 'Example Card',
        description: 'This is an example card created by the client example',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }
    });
    
    if (createCardResult.errors) {
      throw new Error(`Create card failed: ${JSON.stringify(createCardResult.errors)}`);
    }
    
    const cardId = createCardResult.data.createCard.id;
    console.log(`✅ Card created with ID: ${cardId}`);
    
    // Step 5: Query for the board with all its content
    console.log('\n5. Query for the board with all its content');
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
            }
          }
        }
      }
    `;
    
    const boardResult = await graphqlRequest(boardQuery, {
      id: boardId
    });
    
    if (boardResult.errors) {
      throw new Error(`Query board failed: ${JSON.stringify(boardResult.errors)}`);
    }
    
    console.log('✅ Successfully queried board structure:');
    console.log(JSON.stringify(boardResult.data.board, null, 2));
    
    console.log('\nExample completed successfully!');
    
  } catch (error) {
    console.error(`Example failed: ${error.message}`);
  }
}

// Run the example
runExample(); 