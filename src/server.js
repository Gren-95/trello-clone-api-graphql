const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const { ApolloServer } = require('apollo-server-express');
const { readFileSync } = require('fs'); // fs is already imported, but this is explicit for readFileSync
const { GraphQLScalarType, Kind } = require('graphql');

const app = express();
const port = 3066;

// Load GraphQL Schema (type definitions)
const typeDefs = readFileSync(path.join(__dirname, '../schema/schema.graphql'), 'utf-8');

// Initial Resolvers
const resolvers = {
    Query: {
        currentUser: (parent, args, context) => {
            if (context.user) {
                const foundUser = users.find(u => u.id === context.user.id);
                if (foundUser) {
                    const { password, ...userWithoutPassword } = foundUser;
                    return userWithoutPassword;
                }
            }
            return null;
        },
        users: (parent, args, context) => {
            if (!context.user) return [];
            return users.map(({ password, ...user }) => user);
        },
        board: (parent, { id }, context) => {
            if (!context.user) return null;
            // Ensure id is an integer for comparison if your stored IDs are numbers
            const boardIdInt = parseInt(id);
            const board = boards.find(b => b.id === boardIdInt && b.userId === context.user.id);
            return board || null;
        },
        boards: (parent, args, context) => {
            if (!context.user) return [];
            return boards.filter(b => b.userId === context.user.id);
        },
        list: (parent, { id }, context) => {
            if (!context.user) return null;
            const listIdInt = parseInt(id);
            const list = lists.find(l => l.id === listIdInt);
            if (list) {
                const board = boards.find(b => b.id === list.boardId && b.userId === context.user.id);
                if (board) return list;
            }
            return null;
        },
        listsForBoard: (parent, { boardId }, context) => {
            if (!context.user) return [];
            const boardIdInt = parseInt(boardId);
            const board = boards.find(b => b.id === boardIdInt && b.userId === context.user.id);
            if (!board) return [];
            return lists.filter(l => l.boardId === boardIdInt);
        },
        card: (parent, { id }, context) => {
            if (!context.user) return null;
            const cardIdInt = parseInt(id);
            const card = cards.find(c => c.id === cardIdInt);
            if (card) {
                const list = lists.find(l => l.id === card.listId);
                if (list) {
                    const board = boards.find(b => b.id === list.boardId && b.userId === context.user.id);
                    if (board) return card;
                }
            }
            return null;
        },
        cardsForList: (parent, { listId }, context) => {
            if (!context.user) return [];
            const listIdInt = parseInt(listId);
            const list = lists.find(l => l.id === listIdInt);
            if (list) {
                const board = boards.find(b => b.id === list.boardId && b.userId === context.user.id);
                if (board) return cards.filter(c => c.listId === listIdInt);
            }
            return [];
        },
        comment: (parent, { id }, context) => {
            if (!context.user) return null;
            const commentIdInt = parseInt(id);
            const comment = comments.find(c => c.id === commentIdInt);
            if (comment) {
                if (comment.userId === context.user.id) return comment;
                // Add more advanced auth: check if user can access the card the comment belongs to
                const parentCard = cards.find(c => c.id === comment.cardId);
                if (parentCard) {
                    const list = lists.find(l => l.id === parentCard.listId);
                    if (list) {
                        const board = boards.find(b => b.id === list.boardId && b.userId === context.user.id);
                        if (board) return comment; // User can see the card, so can see the comment
                    }
                }
            }
            return null;
        },
        comments: (parent, { cardId, authorId }, context) => {
            if (!context.user) return [];
            let filteredComments = [...comments]; // Create a copy to avoid modifying the original array

            if (cardId) {
                const cardIdInt = parseInt(cardId);
                const card = cards.find(c => c.id === cardIdInt);
                let canAccessCard = false;
                if (card) {
                    const list = lists.find(l => l.id === card.listId);
                    if (list) {
                        const board = boards.find(b => b.id === list.boardId && b.userId === context.user.id);
                        if (board) canAccessCard = true;
                    }
                }
                if (!canAccessCard) return [];
                filteredComments = filteredComments.filter(c => c.cardId === cardIdInt);
            }

            if (authorId) {
                const authorIdInt = parseInt(authorId);
                filteredComments = filteredComments.filter(c => c.userId === authorIdInt);
            }

            return filteredComments.filter(comment => {
                if (comment.userId === context.user.id) return true; // Author can always see their comment
                // If not author, and not already filtered by an accessible cardId, check card access
                const parentCard = cards.find(c => c.id === comment.cardId);
                if (parentCard) {
                    const list = lists.find(l => l.id === parentCard.listId);
                    if (list) {
                        const board = boards.find(b => b.id === list.boardId && b.userId === context.user.id);
                        if (board) return true; // User can access the card this comment belongs to
                    }
                }
                return false; // No access
            });
        },
    },
    Mutation: {
        registerUser: (parent, { input }, context) => {
            const { username, password } = input;
            if (!username || !password) {
                throw new Error('Username and password are required.'); 
            }
            if (users.find(u => u.username === username)) {
                throw new Error('Username already exists.');
            }
            const newUser = {
                id: nextUserId++, 
                username,
                password, // In a real app, hash this password!
                createdAt: new Date().toISOString()
            };
            users.push(newUser);

            const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });
            const { password: _, ...userWithoutPassword } = newUser;
            return { token, user: userWithoutPassword };
        },

        login: (parent, { input }, context) => {
            const { username, password } = input;
            if (!username || !password) {
                throw new Error('Username and password are required.');
            }
            const user = users.find(u => u.username === username && u.password === password);
            if (!user) {
                throw new Error('Invalid credentials.');
            }
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });
            const { password: _, ...userWithoutPassword } = user;
            return { token, user: userWithoutPassword };
        },

        logout: (parent, args, context) => {
            if (!context.user || !context.token) {
                // For GraphQL, it's better to use Apollo's error types
                // const { AuthenticationError } = require('apollo-server-express');
                // throw new AuthenticationError('Not authenticated for logout.');
                throw new Error('Not authenticated for logout.');
            }
            blacklistedTokens.add(context.token);
            return { message: 'Logged out successfully.', success: true };
        },

        updatePassword: (parent, { input }, context) => {
            if (!context.user) {
                // const { AuthenticationError } = require('apollo-server-express');
                // throw new AuthenticationError('Not authenticated.');
                throw new Error('Not authenticated for password update.');
            }
            const { currentPassword, newPassword } = input;
            if (!currentPassword || !newPassword) {
                // const { UserInputError } = require('apollo-server-express');
                // throw new UserInputError('Current and new passwords are required.');
                throw new Error('Current and new passwords are required.');
            }
            if (newPassword.length < 6) {
                // const { UserInputError } = require('apollo-server-express');
                // throw new UserInputError('New password must be at least 6 characters long.');
                throw new Error('New password must be at least 6 characters long.');
            }

            const userIndex = users.findIndex(u => u.id === context.user.id);
            if (userIndex === -1) {
                // Should not happen if context.user is valid and sourced from users array
                // const { ApolloError } = require('apollo-server-express');
                // throw new ApolloError('User not found in database.', 'INTERNAL_SERVER_ERROR');
                throw new Error('User not found during password update.'); 
            }
            // In a real app, compare hashed passwords
            if (users[userIndex].password !== currentPassword) {
                // const { UserInputError } = require('apollo-server-express');
                // throw new UserInputError('Current password is incorrect.');
                throw new Error('Current password is incorrect.');
            }
            users[userIndex].password = newPassword; // In real app, hash newPassword
            // users[userIndex].updatedAt = new Date().toISOString(); // Good practice to track updates
            return { message: 'Password updated successfully.', success: true };
        },

        deleteCurrentUser: (parent, args, context) => {
            if (!context.user || !context.token) {
                // const { AuthenticationError } = require('apollo-server-express');
                // throw new AuthenticationError('Not authenticated.');
                throw new Error('Not authenticated for deleting user.');
            }
            const userIdToDelete = context.user.id;
            const userIndex = users.findIndex(u => u.id === userIdToDelete);

            if (userIndex === -1) {
                // const { ApolloError } = require('apollo-server-express');
                // throw new ApolloError('User not found for deletion.', 'INTERNAL_SERVER_ERROR');
                throw new Error('User not found for deletion, this should not happen.');
            }

            // Cascade delete logic (ensure this is correct based on how data is linked)
            const userBoards = boards.filter(b => b.userId === userIdToDelete).map(b => b.id);
            boards = boards.filter(b => b.userId !== userIdToDelete);
            
            const listsFromUserBoards = lists.filter(l => userBoards.includes(l.boardId)).map(l => l.id);
            lists = lists.filter(l => !userBoards.includes(l.boardId));
            
            const cardsFromUserLists = cards.filter(c => listsFromUserBoards.includes(c.listId)).map(c => c.id);
            cards = cards.filter(c => !listsFromUserBoards.includes(c.listId));
            
            // Remove comments made by the user AND comments on cards that are being deleted.
            comments = comments.filter(c => c.userId !== userIdToDelete && !cardsFromUserLists.includes(c.cardId));

            users.splice(userIndex, 1); // More efficient removal from array
            blacklistedTokens.add(context.token); // Invalidate the token of the deleted user

            return { message: 'User account deleted successfully.', success: true };
        },

        createBoard: (parent, { input }, context) => {
            if (!context.user) {
                // const { AuthenticationError } = require('apollo-server-express');
                // throw new AuthenticationError('Not authenticated.');
                throw new Error('Not authenticated to create board.');
            }
            const { name } = input;
            if (!name || name.trim() === '') {
                // const { UserInputError } = require('apollo-server-express');
                // throw new UserInputError('Board name cannot be empty.');
                throw new Error('Board name cannot be empty.');
            }

            const newBoard = {
                id: nextBoardId++,
                name: name.trim(),
                userId: context.user.id, // Owner of the board
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), // Also set updatedAt on creation
                isArchived: false,
                background: null, // Default background should be null
                isTemplate: false,
                isFavorite: false
                // CORRECTED: No 'members' array here; Board.members resolver handles this
            };
            boards.push(newBoard);
            return newBoard;
        },

        updateBoard: (parent, { id, input }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to update board.');
            }
            const boardId = parseInt(id);
            const boardIndex = boards.findIndex(b => b.id === boardId && b.userId === context.user.id);

            if (boardIndex === -1) {
                throw new Error('Board not found or you do not have permission to update it.');
            }

            const boardToUpdate = { ...boards[boardIndex] };
            let updated = false;

            if (input.name !== undefined && input.name !== null) {
                if (input.name.trim() === '') throw new Error('Board name cannot be empty.');
                boardToUpdate.name = input.name.trim();
                updated = true;
            }
            if (input.background !== undefined && input.background !== null) {
                boardToUpdate.background = input.background;
                updated = true;
            }
            if (input.isTemplate !== undefined && input.isTemplate !== null) {
                boardToUpdate.isTemplate = input.isTemplate;
                updated = true;
            }
            if (input.isFavorite !== undefined && input.isFavorite !== null) {
                boardToUpdate.isFavorite = input.isFavorite;
                updated = true;
            }
            if (input.isArchived !== undefined && input.isArchived !== null) {
                boardToUpdate.isArchived = input.isArchived;
                updated = true;
            }

            if (updated) {
                boardToUpdate.updatedAt = new Date().toISOString();
                boards[boardIndex] = boardToUpdate;
            }
            return boards[boardIndex];
        },

        deleteBoard: (parent, { id }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to delete board.');
            }
            const boardId = parseInt(id);
            const boardIndex = boards.findIndex(b => b.id === boardId && b.userId === context.user.id);

            if (boardIndex === -1) {
                throw new Error('Board not found or you do not have permission to delete it.');
            }

            const listsToDelete = lists.filter(l => l.boardId === boardId).map(l => l.id);
            const cardsToDelete = cards.filter(c => listsToDelete.includes(c.listId)).map(c => c.id);

            comments = comments.filter(c => !cardsToDelete.includes(c.cardId));
            cards = cards.filter(c => !listsToDelete.includes(c.listId));
            lists = lists.filter(l => l.boardId !== boardId);
            boards.splice(boardIndex, 1);

            return { message: 'Board deleted successfully.', success: true };
        },

        createList: (parent, { boardId, input }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to create list.');
            }
            const { title } = input;
            if (!title || title.trim() === '') {
                throw new Error('List title cannot be empty.');
            }

            const numericBoardId = parseInt(boardId);
            const board = boards.find(b => b.id === numericBoardId);

            if (!board) {
                throw new Error('Board not found.');
            }
            // Authorization: Check if the user is the owner of the board or a member (if members were fully implemented)
            // For now, only the board owner (board.userId) can add lists.
            if (board.userId !== context.user.id) {
                 throw new Error('Not authorized to add lists to this board.');
            }

            const newList = {
                id: nextListId++,
                boardId: numericBoardId,
                title: title.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // position: lists.filter(l => l.boardId === numericBoardId).length // Default position at the end
            };
            lists.push(newList);
            return newList;
        },

        updateList: (parent, { id, input }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to update list.');
            }
            const listId = parseInt(id);
            const { title, position } = input;

            const listIndex = lists.findIndex(l => l.id === listId);
            if (listIndex === -1) {
                throw new Error('List not found.');
            }

            const list = lists[listIndex]; // Get a reference to the object in the array
            const board = boards.find(b => b.id === list.boardId);

            if (!board) {
                // This should ideally not happen if data integrity is maintained
                throw new Error('Parent board not found for this list.'); 
            }

            if (board.userId !== context.user.id) {
                throw new Error('Not authorized to update this list.');
            }

            let updated = false;
            if (title !== undefined && title !== null) {
                if (title.trim() === '') throw new Error('List title cannot be empty.');
                lists[listIndex].title = title.trim(); // Modify the object in the array directly
                updated = true;
            }

            if (position !== undefined && position !== null) {
                if (typeof position !== 'number' || position < 0) {
                    throw new Error('Position must be a non-negative number.');
                }
                lists[listIndex].position = position; // Modify the object in the array directly
                updated = true;
            }

            if (updated) {
                lists[listIndex].updatedAt = new Date().toISOString();
            }
            
            return lists[listIndex]; // Return the (potentially) modified object from the array
        },

        deleteList: (parent, { id }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to delete list.');
            }
            const listId = parseInt(id);

            const listIndex = lists.findIndex(l => l.id === listId);
            if (listIndex === -1) {
                throw new Error('List not found.');
            }

            const listToDelete = lists[listIndex];
            const board = boards.find(b => b.id === listToDelete.boardId);

            if (!board) {
                // This should ideally not happen if data integrity is maintained
                throw new Error('Parent board not found for this list.'); 
            }

            // Authorization: Check if the user is the owner of the board.
            if (board.userId !== context.user.id) {
                throw new Error('Not authorized to delete this list.');
            }

            // Cascade delete: Remove cards in this list and their comments
            const cardsInListToDelete = cards.filter(card => card.listId === listId);
            if (cardsInListToDelete.length > 0) {
                const cardIdsToDelete = cardsInListToDelete.map(card => card.id);
                
                // Remove comments associated with these cards
                comments = comments.filter(comment => !cardIdsToDelete.includes(comment.cardId));
                
                // Remove the cards themselves
                cards = cards.filter(card => card.listId !== listId);
            }

            // Remove the list itself
            lists.splice(listIndex, 1);

            return { message: 'List and its associated cards and comments deleted successfully.', success: true };
        },

        createCard: (parent, { listId, input }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to create card.');
            }
            const numericListId = parseInt(listId);
            const { title, description, dueDate, labels, position } = input;

            if (!title || title.trim() === '') {
                throw new Error('Card title cannot be empty.');
            }

            const list = lists.find(l => l.id === numericListId);
            if (!list) {
                throw new Error('List not found.');
            }

            const board = boards.find(b => b.id === list.boardId);
            if (!board) {
                // This should ideally not happen if data integrity is maintained
                throw new Error('Parent board not found for the list.'); 
            }

            // Authorization: Check if the user is the owner of the board.
            if (board.userId !== context.user.id) {
                throw new Error('Not authorized to add cards to this list.');
            }

            const newCard = {
                id: nextCardId++,
                listId: numericListId,
                title: title.trim(),
                description: description || null, // Default to null if not provided
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                dueDate: dueDate || null, // Default to null if not provided
                labels: labels || [],     // Default to empty array
                checklists: [],           // Initialize as empty array
                comments: [],             // Initialize as empty array
                // position will be handled below
            };

            if (position !== undefined && position !== null) {
                if (typeof position === 'number' && position >= 0) {
                    newCard.position = position;
                } else {
                    // Optional: throw an error for invalid position, or log a warning and ignore.
                    // For now, we'll ignore invalid position values if provided.
                    // console.warn('Invalid position provided for new card, ignoring.');
                }
            } else {
                // Default position: if not provided, can be set to the end of the list.
                // For simplicity, if not provided, it can remain undefined or be explicitly set.
                // newCard.position = cards.filter(c => c.listId === numericListId).length;
            }

            cards.push(newCard);
            return newCard;
        },

        updateCard: (parent, { id, input }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to update card.');
            }
            const cardId = parseInt(id);
            // Use a more specific name for input.listId to avoid confusion with currentList.id
            const { title, description, listId: targetListIdString, dueDate, labels, position } = input;

            const cardIndex = cards.findIndex(c => c.id === cardId);
            if (cardIndex === -1) {
                throw new Error('Card not found.');
            }

            // It's generally safer to work with a copy for modifications, then update the array.
            const cardToUpdate = { ...cards[cardIndex] };

            // Authorization: User must own the board of the card's current list.
            const currentList = lists.find(l => l.id === cardToUpdate.listId);
            if (!currentList) {
                throw new Error('Consistency error: Current list for the card not found.');
            }
            const currentBoard = boards.find(b => b.id === currentList.boardId);
            if (!currentBoard) {
                throw new Error('Consistency error: Current board for the card not found.');
            }
            if (currentBoard.userId !== context.user.id) {
                throw new Error('Not authorized to update this card.');
            }

            let hasChanges = false;

            // Handle moving card to a new list
            if (targetListIdString !== undefined && targetListIdString !== null) {
                const numericTargetListId = parseInt(targetListIdString);
                if (numericTargetListId !== cardToUpdate.listId) { // Check if it's a move to a different list
                    const targetList = lists.find(l => l.id === numericTargetListId);
                    if (!targetList) {
                        throw new Error('Target list for moving card not found.');
                    }
                    // Ensure target list is on the same board
                    if (targetList.boardId !== currentBoard.id) {
                        throw new Error('Cannot move card to a list on a different board.');
                    }
                    // No need to re-check targetBoard.userId if it's the same board and user owns currentBoard
                    cardToUpdate.listId = numericTargetListId;
                    hasChanges = true;
                }
            }

            // Update other card properties
            if (title !== undefined && title !== null) {
                if (title.trim() === '') throw new Error('Card title cannot be empty when provided for update.');
                cardToUpdate.title = title.trim();
                hasChanges = true;
            }
            if (description !== undefined) { // Allow setting description to null or empty string
                cardToUpdate.description = description;
                hasChanges = true;
            }
            if (dueDate !== undefined) { // Allow setting dueDate to null
                cardToUpdate.dueDate = dueDate;
                hasChanges = true;
            }
            if (labels !== undefined && labels !== null) {
                cardToUpdate.labels = labels; // Assumes labels is an array
                hasChanges = true;
            }
            if (position !== undefined && position !== null) {
                if (typeof position === 'number' && position >= 0) {
                    cardToUpdate.position = position;
                    hasChanges = true;
                } else {
                    // console.warn('Invalid position value provided during card update, ignoring.');
                }
            }

            if (hasChanges) {
                cardToUpdate.updatedAt = new Date().toISOString();
                cards[cardIndex] = cardToUpdate; // Apply changes to the card in the main array
            }

            return cards[cardIndex]; // Return the updated card from the array
        },

        deleteCard: (parent, { id }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to delete card.');
            }
            const cardId = parseInt(id);
            
            const cardIndex = cards.findIndex(c => c.id === cardId);
            if (cardIndex === -1) {
                throw new Error('Card not found.');
            }
            
            const card = cards[cardIndex];
            const list = lists.find(l => l.id === card.listId);
            if (!list) {
                throw new Error('Parent list for card not found.');
            }
            
            const board = boards.find(b => b.id === list.boardId);
            if (!board || board.userId !== context.user.id) {
                throw new Error('Not authorized to delete this card.');
            }
            
            // Remove comments associated with this card
            comments = comments.filter(comment => comment.cardId !== cardId);
            
            // Remove the card
            cards.splice(cardIndex, 1);
            
            return { message: 'Card and associated comments deleted successfully.', success: true };
        },
        
        createComment: (parent, { cardId, input }, context) => {
            console.log("createComment called with:", { cardId, input, userId: context.user?.id });
            
            if (!context.user) {
                throw new Error('Not authenticated to create comment.');
            }
            
            const { text } = input;
            if (!text || text.trim() === '') {
                throw new Error('Comment text cannot be empty.');
            }
            
            const numericCardId = parseInt(cardId);
            const card = cards.find(c => c.id === numericCardId);
            if (!card) {
                throw new Error('Card not found.');
            }
            
            const list = lists.find(l => l.id === card.listId);
            if (!list) {
                throw new Error('Parent list for card not found.');
            }
            
            const board = boards.find(b => b.id === list.boardId);
            if (!board || board.userId !== context.user.id) {
                throw new Error('Not authorized to comment on this card.');
            }
            
            const newComment = {
                id: nextCommentId++,
                cardId: numericCardId,
                userId: context.user.id,
                text: text.trim(),
                createdAt: new Date().toISOString()
            };
            
            console.log("Creating new comment:", newComment);
            comments.push(newComment);
            console.log("Returning comment:", newComment);
            return newComment;
        },

        updateComment: (parent, { id, input }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to update comment.');
            }
            
            const commentId = parseInt(id);
            const { text } = input;
            
            const commentIndex = comments.findIndex(c => c.id === commentId);
            if (commentIndex === -1) {
                throw new Error('Comment not found.');
            }
            
            const comment = comments[commentIndex];
            if (comment.userId !== context.user.id) {
                throw new Error('Not authorized to update this comment.');
            }
            
            if (text !== undefined) {
                comment.text = text.trim();
                comment.updatedAt = new Date().toISOString();
            }
            
            return comment;
        },

        deleteComment: (parent, { id }, context) => {
            if (!context.user) {
                throw new Error('Not authenticated to delete comment.');
            }
            
            const commentId = parseInt(id);
            
            const commentIndex = comments.findIndex(c => c.id === commentId);
            if (commentIndex === -1) {
                throw new Error('Comment not found.');
            }
            
            const comment = comments[commentIndex];
            if (comment.userId !== context.user.id) {
                throw new Error('Not authorized to delete this comment.');
            }
            
            comments.splice(commentIndex, 1);
            
            return { message: 'Comment deleted successfully.', success: true };
        },

        // More mutations to be added here
    },
    User: {
        boards: (parent, args, context) => {
            if (!context.user) return [];
            // A user can see their own boards. 
            // If parent.id is different from context.user.id, apply admin/specific permission logic if any.
            if (parent.id !== context.user.id) return []; // For now, only user's own boards
            return boards.filter(b => b.userId === parent.id);
        }
    },
    Board: {
        owner: (parent, args, context) => {
            const ownerUser = users.find(u => u.id === parent.userId);
            if (ownerUser) {
                const { password, ...userWithoutPassword } = ownerUser;
                return userWithoutPassword;
            }
            return null;
        },
        lists: (parent, args, context) => {
            if (!context.user) return [];
            // Check if the requesting user owns the board to see its lists
            if (parent.userId !== context.user.id) return []; // Simplified auth
            return lists.filter(l => l.boardId === parent.id);
        },
        members: (parent, args, context) => {
            // Assuming parent is a Board object and context.user is the authenticated user.
            // Check if context.user has permission to view members of this board (e.g., is owner or member).
            if (!context.user || parent.userId !== context.user.id) {
                // Add more sophisticated member check if board.members is populated from REST API
                // For now, only owner can see members (which is just the owner itself).
                // return []; // Or throw AuthorizationError
            }

            // The 'members' field in the REST API openapi.yaml for Board was:
            // members:
            //   type: array
            //   items:
            //     type: object
            //     properties:
            //       userId: type: string
            //       role: type: string, enum: [owner, admin, member]
            // The in-memory 'boards' array in server.js does not store this 'members' array directly.
            // It only has 'userId' for the owner.
            // We need to simulate this based on the owner.
            const ownerUser = users.find(u => u.id === parent.userId);
            if (ownerUser) {
                const { password, ...userWithoutPassword } = ownerUser;
                return [{ user: userWithoutPassword, role: 'OWNER' }];
            }
            return [];
        }
    },
    List: {
        board: (parent, args, context) => {
            if (!context.user) return null;
            const board = boards.find(b => b.id === parent.boardId);
            // Check if the requesting user owns the board this list belongs to
            if (board && board.userId === context.user.id) {
                return board;
            }
            return null;
        },
        cards: (parent, args, context) => {
            if (!context.user) return [];
            // Check if user can access this list (e.g., by owning the parent board)
            const listParentBoard = boards.find(b => b.id === parent.boardId);
            if (!listParentBoard || listParentBoard.userId !== context.user.id) return [];
            return cards.filter(c => c.listId === parent.id);
        }
    },
    Card: {
        list: (parent, args, context) => {
            if (!context.user) return null;
            const list = lists.find(l => l.id === parent.listId);
            // Check if user can access this list (e.g., by owning the parent board)
            if (list) {
                const board = boards.find(b => b.id === list.boardId);
                if (board && board.userId === context.user.id) return list;
            }
            return null;
        },
        comments: (parent, args, context) => {
            if (!context.user) return [];
            // Check if user can access this card (e.g., by owning parent board/list)
            const list = lists.find(l => l.id === parent.listId);
            if (list) {
                const board = boards.find(b => b.id === list.boardId);
                if (board && board.userId === context.user.id) {
                    return comments.filter(c => c.cardId === parent.id);
                }
            }
            return [];
        },
        checklists: (parent, args, context) => {
            // Card object `parent` from in-memory store doesn't have a `checklists` field yet.
            // The REST API (server.js) handles checklist creation by adding to a `card.checklists` array.
            // We need to ensure our in-memory card objects can store this.
            // For now, if `parent.checklists` exists (as it would if created via REST API), return it.
            // Auth: user must be able to access the card.
            if (!context.user) return [];
            const list = lists.find(l => l.id === parent.listId);
            if (list) {
                const board = boards.find(b => b.id === list.boardId);
                if (board && board.userId === context.user.id) {
                     return parent.checklists || []; // Assumes card object might have checklists
                }
            }
            return [];
        }
    },
    Comment: {
        author: (parent, args, context) => {
            const authorUser = users.find(u => u.id === parent.userId);
            if (authorUser) {
                const { password, ...userWithoutPassword } = authorUser;
                return userWithoutPassword;
            }
            return null;
        },
        card: (parent, args, context) => {
            if (!context.user) return null;
            const card = cards.find(c => c.id === parent.cardId);
            // Check if user can access this card
            if (card) {
                const list = lists.find(l => l.id === card.listId);
                if (list) {
                    const board = boards.find(b => b.id === list.boardId);
                    if (board && board.userId === context.user.id) return card;
                }
            }
            return null;
        }
    },
    DateTime: new GraphQLScalarType({
        name: 'DateTime',
        description: 'A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.',
        serialize(value) {
            // Check if it's a Date object or a string
            if (value instanceof Date) {
                return value.toISOString(); // Convert Date objects to ISO string
            }
            if (typeof value === 'string') {
                // Attempt to parse it to ensure it's a valid date string, then return
                // This also helps to normalize it if it was a slightly different but valid format
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new TypeError(`DateTime Scalar serializer expected a valid Date string but got: ${value}`);
                }
                return date.toISOString(); 
            }
            throw new TypeError('DateTime Scalar serializer expected a Date object or a string.');
        },
        parseValue(value) {
            if (typeof value !== 'string') {
                throw new TypeError(`DateTime Scalar parser expected a string but got: ${typeof value}`);
            }
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                     throw new TypeError(`DateTime Scalar parser expected a valid Date string but got: ${value}`);
                }
                return date.toISOString(); // Or return new Date(value) if your resolvers expect Date objects
            } catch (e) {
                throw new TypeError(`DateTime Scalar parser error: ${e.message}`);
            }
        },
        parseLiteral(ast) {
            if (ast.kind !== Kind.STRING) {
                throw new TypeError(`DateTime Scalar literal parser expected a StringValue ast but got: ${ast.kind}`);
            }
            // Validate it as a date string
            try {
                const date = new Date(ast.value);
                if (isNaN(date.getTime())) {
                     throw new TypeError(`DateTime Scalar literal parser expected a valid Date string but got: ${ast.value}`);
                }
                return date.toISOString(); // Or return new Date(ast.value) if resolvers expect Date objects
            } catch (e) {
                throw new TypeError(`DateTime Scalar literal parser error: ${e.message}`);
            }
        }
    })
};

// Middleware to parse JSON
app.use(express.json());

// Add this line to enable parsing JSON in DELETE requests
app.use((req, res, next) => {
    if (req.method === 'DELETE' && req.headers['content-type'] === 'application/json') {
        express.json()(req, res, next);
    } else {
        next();
    }
});

// Store blacklisted (logged out) tokens
const blacklistedTokens = new Set();

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is required.' });
    }

    // Check if token is blacklisted (logged out)
    if (blacklistedTokens.has(token)) {
        return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        req.token = token; // Store token for logout
        next();
    });
};

// In-memory storage (for demonstration purposes)
let users = [];
let boards = [];
let lists = [];
let cards = [];
let comments = [];
let nextUserId = 1;
let nextBoardId = 1;
let nextListId = 1;
let nextCardId = 1;
let nextCommentId = 1;
let nextChecklistId = 1;
let nextChecklistItemId = 1;

// Add this helper function at the top
const createErrorResponse = (message) => ({
    error: message
});

// Global error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server'
    });
});

// Start Apollo Server and then Express app
async function startApolloServer(typeDefs, resolvers) {
    console.log("Starting Apollo Server with resolvers:", Object.keys(resolvers));
    console.log("Mutation resolvers:", Object.keys(resolvers.Mutation));
    
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }) => {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (token && blacklistedTokens.has(token)) {
                // console.warn('Access attempt with blacklisted token.');
                // Optionally throw new AuthenticationError('Token has been invalidated.');
                return { user: null, token: null }; // Ensure no user or token in context
            }

            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
                    // Make sure to find the full user object from our 'users' array
                    // as decoded might just be { id, username, iat, exp }
                    const user = users.find(u => u.id === decoded.id);
                    if (user) {
                         const { password, ...userWithoutPassword } = user;
                         return { user: userWithoutPassword, token }; // Pass user object and token to resolvers
                    }
                    return { user: null, token: null }; // User ID in token not found
                } catch (err) {
                    // Token is invalid or expired
                    // console.warn('Invalid or expired token in GraphQL context:', err.message);
                    // Optionally throw new AuthenticationError('Invalid or expired token.');
                    return { user: null, token: null }; // Ensure no user or token for bad tokens
                }
            }
            return { user: null, token: null }; // No token provided
        },
        // Consider adding plugins for error handling or logging if needed
    });
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' }); // Serve GraphQL at /graphql
    console.log(`🚀 GraphQL server ready at http://localhost:${port}${server.graphqlPath}`);
}

startApolloServer(typeDefs, resolvers).then(() => {
    app.listen(port, () => {

    });
}).catch(error => {
    console.error('Failed to start Apollo Server:', error);
    process.exit(1);
});
