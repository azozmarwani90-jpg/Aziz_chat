const fs = require('fs');

// Create directories
if (!fs.existsSync('helpers')) {
  fs.mkdirSync('helpers');
  console.log('Created helpers directory');
}

if (!fs.existsSync('routes')) {
  fs.mkdirSync('routes');
  console.log('Created routes directory');
}

console.log('Setup complete!');
