# Trello Clone GraphQL API

This project provides a GraphQL API for a Trello-like application. It allows users to create boards, lists, cards, and manage comments - all through GraphQL queries and mutations.

## Table of Contents
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Example Queries and Mutations](#example-queries-and-mutations)

## Installation

This project can be installed and run using Docker (recommended) or directly with Node.js.

### Using Docker

```bash
# Build the Docker image
docker build -t trello-clone-api .

# Run the container
docker run -p 3066:3066 trello-clone-api
```

### Using Node.js

```bash
# Install dependencies
npm install
```

## Getting Started

### Using the run script

```bash
# Make the script executable
chmod +x scripts/run.sh

# Run the server
./scripts/run.sh
```

### Starting manually

```bash
# Start the server
npm start
# OR
node server.js
```

After starting, the GraphQL API will be available at:
- http://localhost:3066/graphql

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```
JWT_SECRET=your_secret_key_here
PORT=3066
```

- `JWT_SECRET`: Secret key for JWT authentication (required)
- `PORT`: Port number for the server (defaults to 3066 if not specified)

## API Overview

The API provides GraphQL schema for the following entities:
- **Users**: Registration, authentication, and profile management
- **Boards**: Create and manage Trello-like boards
- **Lists**: Create and manage lists within boards
- **Cards**: Create and manage cards within lists
- **Comments**: Add comments to cards

## Authentication

The API uses JWT (JSON Web Token) for authentication.

### Registration and Login

1. Register a new user using the `registerUser` mutation
2. Login using the `login` mutation
3. Include the received token in the Authorization header for subsequent requests:
   ```
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

## Example Queries and Mutations

### User Registration

```graphql
mutation {
  registerUser(input: { username: "testuser", password: "Password123!" }) {
    token
    user {
      id
      username
    }
  }
}
```

### User Login

```graphql
mutation {
  login(input: { username: "testuser", password: "Password123!" }) {
    token
    user {
      id
      username
    }
  }
}
```

### Create a Board

```graphql
mutation {
  createBoard(input: { name: "My First Board" }) {
    id
    name
    createdAt
  }
}
```

### Get User's Boards

```graphql
query {
  boards {
    id
    name
    lists {
      id
      title
    }
  }
}
```

### Create a List

```graphql
mutation {
  createList(
    boardId: "1", 
    input: { title: "To Do" }
  ) {
    id
    title
    board {
      id
      name
    }
  }
}
```

### Create a Card

```graphql
mutation {
  createCard(
    listId: "1", 
    input: {
      title: "Implement GraphQL API",
      description: "Convert REST API to GraphQL",
      dueDate: "2023-06-01T12:00:00Z"
    }
  ) {
    id
    title
    description
    dueDate
  }
}
```

## Testing

```bash
# Run tests
npm test
```

## License

This project is licensed under the MIT License. 