#!/bin/bash

# Change to the directory where the test script is located
cd "$(dirname "$0")"

# Simply run the comprehensive test runner
node run-all.js

# Exit with the same status code as the test runner
exit $? 