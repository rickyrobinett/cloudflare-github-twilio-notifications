/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const crypto = require('crypto');

async function sendText(accountSid, authToken, message) {
  const endpoint = 'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json';

  let encoded = new URLSearchParams();
  encoded.append('To', "%YOUR_PHONE_NUMBER%");
  encoded.append('From', "%YOUR_TWILIO_NUMBER%");
  encoded.append('Body', message);

  let token = btoa(accountSid + ':' + authToken);

  const request = {
    body: encoded,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },}

  let result = await fetch(endpoint, request);
  result = await result.json();

  return new Response(JSON.stringify(result));
};

async function checkSignature(formData, headers, githubSecretToken) {
  let hmac = crypto.createHmac('sha1', githubSecretToken);
  hmac.update(formData, 'utf-8');
  let expectedSignature = hmac.digest('hex');

  let actualSignature = headers.get('X-Hub-Signature');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(actualSignature, 'hex');
  return expectedBuffer.byteLength == actualBuffer.byteLength &&
             crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

export default {
   
    async fetch(request, env, ctx) {
        if(request.method !== 'POST') {
            return new Response('Please send a POST request!');
        }
        try {
            const formData = await request.json();
            const headers = await request.headers;
            const action = headers.get('X-GitHub-Event');
            const repo_name = formData.repository.full_name;
            const sender_name = formData.sender.login;

            if (!checkSignature(formData, headers)) {
              return new Response("Wrong password, try again", {status: 403});
            }

            return await sendText(
                env.TWILIO_ACCOUNT_SID,
                env.TWILIO_AUTH_TOKEN,
                `${sender_name} completed ${action} onto your repo ${repo_name}`
            );
      } catch (e) {
        return new Response(`Error:  ${e}`);
      }
    },

};
