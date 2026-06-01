import { readFileSync } from 'fs';
import { JWT } from 'google-auth-library';

const sa = JSON.parse(readFileSync('prospeweb-firebase-adminsdk-fbsvc-3285f1b0c8.json', 'utf8'));

async function main() {
  const auth = new JWT({
    email: sa.client_email,
    key: sa.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const token = await auth.getAccessToken();
  console.log('Access token obtained:', token ? 'yes' : 'no');

  // Try to list OAuth clients via Google Cloud IAM
  const endpoints = [
    `https://iam.googleapis.com/v1/projects/${sa.project_id}/oauthClients`,
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${sa.client_email}`,
    `https://cloudresourcemanager.googleapis.com/v1/projects/${sa.project_id}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      console.log(`\n${url}: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(text.substring(0, 500));
      }
    } catch (e) {
      console.log(`${url}: Error - ${e.message}`);
    }
  }
}

main().catch(console.error);
