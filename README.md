# Trello Clone GraphQL API

This project provides a GraphQL API for a Trello-like application. It allows users to create boards, lists, cards, and manage comments - all through GraphQL queries and mutations.

## Getting Started

### Using the run script

```bash
# Make the script executable
chmod +x scripts/run.sh

# Run the server
./scripts/run.sh
```

After starting, the GraphQL API will be available at:

- [http://localhost:3066/graphql](http://localhost:3066/graphql)

## Testing

```bash
# Run tests
chmod +x tests/test.sh

# Run the server
./tests/test.sh
```


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

   ```http
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

