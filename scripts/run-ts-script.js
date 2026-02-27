require("./bootstrap");
require("dotenv/config");

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node",
});
process.env.TS_NODE_TRANSPILE_ONLY = "1";

require("ts-node/register");
require("tsconfig-paths/register");

const path = require("path");

const relativeScriptPath = process.argv[2];
if (!relativeScriptPath) {
  console.error("Usage: node scripts/run-ts-script.js <script.ts>");
  process.exit(1);
}

require(path.resolve(__dirname, relativeScriptPath));
