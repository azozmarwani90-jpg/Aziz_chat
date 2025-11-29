#!/usr/bin/env node

/**
 * TMDB_API_KEY Environment Variable Validator
 * 
 * Run this script to validate that TMDB_API_KEY is properly configured
 * Usage: node validate_env.js
 */

require('dotenv').config();

console.log('\n' + '='.repeat(60));
console.log('🔍 TMDB_API_KEY Environment Variable Validator');
console.log('='.repeat(60) + '\n');

let hasErrors = false;

// Check 1: TMDB_API_KEY exists
console.log('✓ Checking TMDB_API_KEY...');
if (!process.env.TMDB_API_KEY) {
  console.error('  ❌ TMDB_API_KEY is NOT set in .env file');
  console.error('  💡 Add this line to your .env file:');
  console.error('     TMDB_API_KEY=your_actual_tmdb_key_here\n');
  hasErrors = true;
} else {
  console.log(`  ✅ TMDB_API_KEY is set (length: ${process.env.TMDB_API_KEY.length} characters)\n`);
}

// Check 2: Old TMDB_KEY should NOT exist
console.log('✓ Checking for deprecated TMDB_KEY...');
if (process.env.TMDB_KEY) {
  console.warn('  ⚠️  TMDB_KEY is still set in .env file');
  console.warn('  💡 Remove TMDB_KEY and use TMDB_API_KEY instead');
  console.warn('     Old: TMDB_KEY=...');
  console.warn('     New: TMDB_API_KEY=...\n');
  hasErrors = true;
} else {
  console.log('  ✅ No deprecated TMDB_KEY found\n');
}

// Check 3: Other required env vars
console.log('✓ Checking other required environment variables...');
const required = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`  ❌ ${key} is NOT set`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${key} is set`);
  }
});

// Final result
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('❌ Validation FAILED - Please fix the issues above');
  console.log('='.repeat(60) + '\n');
  process.exit(1);
} else {
  console.log('✅ All environment variables are correctly configured!');
  console.log('='.repeat(60) + '\n');
  console.log('🚀 You can now start the server with: npm start\n');
  process.exit(0);
}
