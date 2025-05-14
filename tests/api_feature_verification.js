const axios = require('axios');
const { spawn } = require('child_process');
const { promisify } = require('util');
const wait = promisify(setTimeout);

// Configuration
const GRAPHQL_API_URL = 'http://localhost:3066/graphql';
let graphqlToken = null;

// User credentials
const username = `user_${Date.now()}`;
const password = 'SecurePassword123!';
const boardName = `Board ${Date.now()}`;
const listName = `List ${Date.now()}`;

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

// User Registration
async function verifyUserRegistration() {
  console.log('\n===== Verifying User Registration =====');
  
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
  
  return { 
    graphqlUserId: graphqlResponse.registerUser.user.id 
  };
}

// Create Board
async function verifyCreateBoard() {
  console.log('\n===== Verifying Board Creation =====');
  
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
  
  return { 
    graphqlBoardId: graphqlResponse.createBoard.id 
  };
}

// Create List
async function verifyCreateList(graphqlBoardId) {
  console.log('\n===== Verifying List Creation =====');
  
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
  
  return { 
    graphqlListId: graphqlResponse.createList.id 
  };
}

// Create Card
async function verifyCreateCard(graphqlListId) {
  console.log('\n===== Verifying Card Creation =====');
  
  // REST API Create Card
  const cardTitle = `Card ${Date.now()}`;
  const cardDescription = 'Card description';
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  
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
    graphqlCardId: graphqlResponse.createCard.id 
  };
}

// Add Comment to Card
async function verifyAddComment(graphqlCardId) {
  console.log('\n===== Verifying Comment Creation =====');
  
  const commentText = `Comment ${Date.now()}`;
  
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
  
  return { 
    graphqlCommentId: graphqlResponse.createComment.id 
  };
}

// Query Board Structure
async function verifyQueryBoardStructure(graphqlBoardId) {
  console.log('\n===== Verifying Board Query =====');
  
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
  
  return { graphqlResponse: graphqlResponse.board };
}

// Run all verifications
async function runVerifications() {
  try {
    console.log('\n🧪 STARTING API VERIFICATION\n');
    
    // Step 1: User Registration
    const userIds = await verifyUserRegistration();
    
    // Step 2: Create Board
    const boardIds = await verifyCreateBoard();
    
    // Step 3: Create List
    const listIds = await verifyCreateList(boardIds.graphqlBoardId);
    
    // Step 4: Create Card
    const cardIds = await verifyCreateCard(listIds.graphqlListId);
    
    // Step 5: Add Comment
    const commentIds = await verifyAddComment(cardIds.graphqlCardId);
    
    // Step 6: Query Board Structure
    const boardResults = await verifyQueryBoardStructure(boardIds.graphqlBoardId);
    
    console.log('\n🎉 API VERIFICATION COMPLETED SUCCESSFULLY 🎉');
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

// Run the verifications
runVerifications(); 