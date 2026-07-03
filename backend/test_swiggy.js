const { execFileSync } = require('child_process');

const payload = JSON.stringify({
  addressId: "d3jr9p1vhq90magvm3cg",
  query: "biryani"
});

try {
  // Use npx.cmd on windows
  const result = execFileSync('npx.cmd', ['-y', 'swiggy-cli', 'call', 'food', 'search_restaurants', '--input', payload, '--json'], { encoding: 'utf-8' });
  console.log(result);
} catch (error) {
  console.error("Error executing:", error.stdout ? error.stdout.toString() : error.message);
}
