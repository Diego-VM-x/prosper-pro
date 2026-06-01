import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = join(__dirname, '..', 'prospeweb-firebase-adminsdk-fbsvc-3285f1b0c8.json');
const sa = JSON.parse(readFileSync(saPath, 'utf8'));

// Manual JWT creation for service account auth
import { createPrivateKey } from 'crypto';
import { JWT } from 'google-auth-library';

async function main() {
  const auth = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  // Try getting the IdP config
  const projectId = sa.project_id;
  const url = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/defaultSupportedIdpConfigs/google.com`;
  
  try {
    const token = await auth.getAccessToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log('=== Google IdP Config ===');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`IdP config failed: ${res.status} ${res.statusText}`);
      const err = await res.text();
      console.log(err);
      
      // Fallback: try listing all OAuth clients
      console.log('\n=== Trying to list OAuth clients... ===');
      const clientsUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/clients`;
      const res2 = await fetch(clientsUrl, {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      if (res2.ok) {
        const data2 = await res2.json();
        console.log(JSON.stringify(data2, null, 2));
      } else {
        console.log(`Clients list failed: ${res2.status}`);
        const err2 = await res2.text();
        console.log(err2);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
