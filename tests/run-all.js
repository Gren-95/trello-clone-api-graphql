const { spawn } = require('child_process');
const { promisify } = require('util');
const wait = promisify(setTimeout);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test definitions
const tests = [
  {
    name: 'Schema Validation',
    script: 'schema-test.js',
    description: 'Validates the GraphQL schema structure and ensures all required types and fields are present'
  },
  {
    name: 'Response Structure Validation',
    script: 'response-validation-test.js',
    description: 'Verifies that GraphQL responses match the structure defined in the schema'
  },
  {
    name: 'API Feature Comparison',
    script: 'test.js',
    description: 'Compares the GraphQL API with the REST API by creating identical resources and verifying the responses'
  },
  {
    name: 'Error Handling',
    script: 'error-test.js',
    description: 'Tests that the GraphQL API properly handles error cases and returns appropriate error messages'
  }
];

// Helper function to run a test
async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${colors.magenta}╭${'─'.repeat(78)}╮${colors.reset}`);
    console.log(`${colors.magenta}│ ${colors.cyan}RUNNING TEST: ${colors.white}${test.name.padEnd(62)} ${colors.magenta}│${colors.reset}`);
    console.log(`${colors.magenta}│ ${colors.yellow}${test.description.slice(0, 76).padEnd(76)} ${colors.magenta}│${colors.reset}`);
    console.log(`${colors.magenta}╰${'─'.repeat(78)}╯${colors.reset}\n`);
    
    const testProcess = spawn('node', [`${test.script}`], { stdio: 'inherit' });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}✓ ${test.name} test passed successfully!${colors.reset}`);
        resolve(true);
      } else {
        console.log(`\n${colors.red}✗ ${test.name} test failed with code ${code}${colors.reset}`);
        resolve(false);
      }
    });
  });
}

// Run all tests in sequence
async function runAllTests() {
  console.log(`\n${colors.blue}╔${'═'.repeat(78)}╗${colors.reset}`);
  console.log(`${colors.blue}║ ${colors.white}TRELLO CLONE GRAPHQL API - COMPREHENSIVE TEST SUITE ${' '.repeat(28)} ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚${'═'.repeat(78)}╝${colors.reset}\n`);
  
  let startTime = Date.now();
  let allTestsPassed = true;
  let resultsSummary = [];
  
  // First check if APIs are running
  console.log(`${colors.cyan}Checking if APIs are running...${colors.reset}`);
  
  try {
    // Simple check for REST API
    const restPort = 3066;
    const restProcess = spawn('curl', ['-s', `http://localhost:${restPort}`]);
    const restStatus = await new Promise(resolve => {
      restProcess.on('close', (code) => resolve(code));
    });
    
    if (restStatus !== 0) {
      console.log(`${colors.red}REST API is not running on port ${restPort}!${colors.reset}`);
      console.log(`${colors.yellow}Please start the REST API before running tests.${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}REST API is running.${colors.reset}`);
    
    // Simple check for GraphQL API
    const graphqlPort = 3066;
    const graphqlProcess = spawn('curl', ['-s', `http://localhost:${graphqlPort}/graphql`]);
    const graphqlStatus = await new Promise(resolve => {
      graphqlProcess.on('close', (code) => resolve(code));
    });
    
    if (graphqlStatus !== 0) {
      console.log(`${colors.red}GraphQL API is not running on port ${graphqlPort}!${colors.reset}`);
      console.log(`${colors.yellow}Please start the GraphQL API before running tests.${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}GraphQL API is running.${colors.reset}`);
    
    // Run each test in sequence
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const testStartTime = Date.now();
      const passed = await runTest(test);
      const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
      
      resultsSummary.push({
        name: test.name,
        passed,
        duration: testDuration
      });
      
      if (!passed) {
        allTestsPassed = false;
        // Early exit if schema validation fails
        if (test.name === 'Schema Validation') {
          console.log(`\n${colors.red}Schema validation failed. Stopping further tests.${colors.reset}`);
          break;
        }
      }
    }
    
    // Print summary
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n${colors.blue}╔${'═'.repeat(78)}╗${colors.reset}`);
    console.log(`${colors.blue}║ ${colors.white}TEST RESULTS SUMMARY ${' '.repeat(59)} ${colors.blue}║${colors.reset}`);
    console.log(`${colors.blue}╠${'═'.repeat(78)}╣${colors.reset}`);
    
    resultsSummary.forEach(result => {
      const statusIcon = result.passed ? `${colors.green}✓` : `${colors.red}✗`;
      console.log(`${colors.blue}║ ${statusIcon} ${colors.reset}${result.name.padEnd(40)} ${colors.yellow}${result.duration}s ${' '.repeat(33 - result.duration.toString().length)}${colors.blue}║${colors.reset}`);
    });
    
    console.log(`${colors.blue}╠${'═'.repeat(78)}╣${colors.reset}`);
    console.log(`${colors.blue}║ ${colors.white}Total Duration: ${colors.yellow}${totalDuration}s ${' '.repeat(60 - totalDuration.toString().length)} ${colors.blue}║${colors.reset}`);
    console.log(`${colors.blue}║ ${colors.white}Final Result: ${allTestsPassed ? colors.green + 'PASSED' : colors.red + 'FAILED'} ${' '.repeat(64)} ${colors.blue}║${colors.reset}`);
    console.log(`${colors.blue}╚${'═'.repeat(78)}╝${colors.reset}\n`);
    
    if (allTestsPassed) {
      console.log(`${colors.green}All tests passed successfully! The GraphQL API is functional.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}Some tests failed. Please check the logs above for details.${colors.reset}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error running tests: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the test suite
runAllTests(); 