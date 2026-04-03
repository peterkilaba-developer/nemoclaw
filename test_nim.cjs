const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
const envConfig = dotenv.parse(fs.readFileSync('.env'))
const apiKey = envConfig.VITE_NVIDIA_API_KEY;

const models = [
  "meta/llama3-70b-instruct",
  "meta/llama3-8b-instruct",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-405b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct"
];

const testModel = (model) => {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: model,
      messages: [{role: "user", content: "Hello"}],
      max_tokens: 10
    });

    const options = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({model, status: res.statusCode, body});
      });
    });

    req.on('error', error => resolve({model, status: 'Error', body: error.message}));
    req.write(data);
    req.end();
  });
};

(async () => {
  for(let m of models) {
    const res = await testModel(m);
    console.log(`Model: ${res.model} -> Status: ${res.status}`);
    if (res.status !== 200) {
      console.log(`  Response: ${res.body}`);
    }
  }
})();
