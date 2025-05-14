#!/bin/bash

# Change to the directory where the verification script is located
cd "$(dirname "$0")"

# Run the comprehensive API verification
node run-all.js

# Exit with the same status code as the verification runner
exit $? 