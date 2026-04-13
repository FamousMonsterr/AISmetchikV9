require('./bootstrap');
require('dotenv/config');
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
process.env.TS_NODE_TRANSPILE_ONLY = "1";
require('ts-node/register');
require('tsconfig-paths/register');
require('./server-analysis-worker.ts');
