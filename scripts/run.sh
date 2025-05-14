#!/bin/bash

# Change to the project root directory
cd "$(dirname "$0")/.."

# Make sure we have all dependencies
echo "Installing dependencies..."
npm install

# Create .env file with a default JWT_SECRET if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating default .env file..."
    echo "JWT_SECRET=development_secret_key_change_me_in_production" > .env
fi

# Start the server
echo "Starting GraphQL server..."
node src/server.js

# This script exits when the server is terminated
