/**
 * Gmail Service
 * OAuth2 authentication, email fetching, and AI-powered summarization
 * Requires: ANTHROPIC_API_KEY env var, Google OAuth2 credentials
 */

import { createServer } from 'http';
import { request as httpsRequest, type RequestOptions } from 'https';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

// ============================================================
// Config paths
// ============================================================

const CONFIG_DIR = join(homedir(), '.claude-flow');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'gmail-credentials.json');
const TOKENS_FILE = join(CONFIG_DIR, 'gmail-tokens.json');
const REDIRECT_URI = 'http://localhost:8080/oauth2callback';
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
].join(' ');

// ============================================================
// Types
// ============================================================

export interface GmailCredentials {
  client_id: string;
  client_secret: string;
}

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isDirectlyAddressed: boolean;
}

export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  date: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  actionRequired: boolean;
  suggestedDraft: string | null;
  isDirectlyAddressed: boolean;
}

// ============================================================
// Credential & Token Storage
// ============================================================

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadCredentials(): GmailCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
  } catch { return null; }
}

export function saveCredentials(creds: GmailCredentials): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function loadTokens(): GmailTokens | null {
  if (!existsSync(TOKENS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'));
  } catch { return null; }
}

function saveTokens(tokens: GmailTokens): void {
  ensureConfigDir();
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

// ============================================================
// HTTP Helpers
// ============================================================

function httpsRequest_(url: string, method: string, headers: Record<string, string | number>, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: RequestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    };
    const req = httpsRequest(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function httpsGet(url: string, authToken: string): Promise<string> {
  return httpsRequest_(url, 'GET', { Authorization: `Bearer ${authToken}` });
}

function httpsPost(url: string, body: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  return httpsRequest_(url, 'POST', {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  }, body);
}

function httpsFormPost(url: string, body: string): Promise<string> {
  return httpsRequest_(url, 'POST', {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
  }, body);
}

// ============================================================
// OAuth2 Flow
// ============================================================

async function refreshAccessToken(creds: GmailCredentials, tokens: GmailTokens): Promise<GmailTokens> {
  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  }).toString();

  const response = await httpsFormPost('https://oauth2.googleapis.com/token', body);
  const parsed = JSON.parse(response);
  if (!parsed.access_token) {
    throw new Error(`Token refresh failed: ${parsed.error_description || parsed.error || 'unknown'}`);
  }

  const newTokens: GmailTokens = {
    ...tokens,
    access_token: parsed.access_token,
    expiry_date: Date.now() + (Number(parsed.expires_in) * 1000),
  };
  saveTokens(newTokens);
  return newTokens;
}

export async function getValidAccessToken(creds: GmailCredentials, tokens: GmailTokens): Promise<string> {
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) {
    return tokens.access_token;
  }
  const refreshed = await refreshAccessToken(creds, tokens);
  return refreshed.access_token;
}

export async function startOAuthFlow(creds: GmailCredentials): Promise<GmailTokens> {
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: creds.client_id,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: GMAIL_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    }).toString();

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, 'http://localhost:8080');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<h1>Authorization successful!</h1><p>You may close this tab and return to the terminal.</p>');
        server.close();
        resolve(code);
      } else {
        res.end(`<h1>Authorization failed: ${error}</h1>`);
        server.close();
        reject(new Error(`OAuth2 denied: ${error}`));
      }
    });

    server.listen(8080, () => {
      console.log(`\nOpen this URL in your browser to authorize Gmail access:\n\n  ${authUrl}\n\nWaiting for authorization...`);
      try {
        const platform = process.platform;
        if (platform === 'darwin') execSync(`open "${authUrl}"`, { stdio: 'ignore' });
        else if (platform === 'win32') execSync(`start "${authUrl}"`, { stdio: 'ignore' });
        else execSync(`xdg-open "${authUrl}" 2>/dev/null || true`, { stdio: 'ignore' });
      } catch { /* user opens manually */ }
    });

    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('OAuth2 timed out after 5 minutes')); }, 300_000);
  });

  const body = new URLSearchParams({
    code,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }).toString();

  const response = await httpsFormPost('https://oauth2.googleapis.com/token', body);
  const parsed = JSON.parse(response);
  if (!parsed.access_token) {
    throw new Error(`Token exchange failed: ${parsed.error_description || parsed.error || 'unknown'}`);
  }

  const tokens: GmailTokens = {
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
    expiry_date: Date.now() + (Number(parsed.expires_in) * 1000),
    token_type: parsed.token_type,
  };
  saveTokens(tokens);
  return tokens;
}

// ============================================================
// Gmail API
// ============================================================

export async function getUserEmail(accessToken: string): Promise<string> {
  const response = await httpsGet('https://gmail.googleapis.com/gmail/v1/users/me/profile', accessToken);
  const data = JSON.parse(response);
  if (!data.emailAddress) throw new Error('Could not retrieve Gmail profile. Check token scopes.');
  return data.emailAddress;
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch { return ''; }
}

function extractBody(payload: Record<string, unknown>): string {
  if (!payload) return '';
  type Part = { mimeType: string; body?: { data?: string }; parts?: Part[] };
  const body = payload.body as { data?: string } | undefined;
  if (body?.data) return decodeBase64Url(body.data);

  const parts = payload.parts as Part[] | undefined;
  if (parts) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64Url(part.body.data);
    }
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      if (part.parts) {
        const nested = extractBody(part as unknown as Record<string, unknown>);
        if (nested) return nested;
      }
    }
  }
  return (payload.snippet as string) || '';
}

export async function fetchEmails(accessToken: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const listResp = await httpsGet(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
    accessToken
  );
  const listData = JSON.parse(listResp);
  const messages: Array<{ id: string }> = listData.messages || [];

  const emails: EmailMessage[] = [];
  for (const msg of messages.slice(0, maxResults)) {
    const msgResp = await httpsGet(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      accessToken
    );
    const msgData = JSON.parse(msgResp);
    type Header = { name: string; value: string };
    const headers: Header[] = (msgData.payload?.headers as Header[]) || [];
    const h = (name: string) => headers.find(x => x.name.toLowerCase() === name.toLowerCase())?.value || '';

    emails.push({
      id: msgData.id,
      subject: h('Subject'),
      from: h('From'),
      to: h('To'),
      date: h('Date'),
      snippet: msgData.snippet || '',
      body: extractBody(msgData.payload as Record<string, unknown>).substring(0, 2000),
      isDirectlyAddressed: false,
    });
  }
  return emails;
}

export function markDirectlyAddressed(emails: EmailMessage[], userEmail: string): void {
  const norm = userEmail.toLowerCase();
  for (const email of emails) {
    // Directly addressed = user is in To: (not just Cc) and it's not a mass/automated email
    const to = email.to.toLowerCase();
    const isMass = email.from.toLowerCase().includes('noreply') ||
      email.from.toLowerCase().includes('no-reply') ||
      email.from.toLowerCase().includes('donotreply');
    email.isDirectlyAddressed = to.includes(norm) && !isMass;
  }
}

// ============================================================
// AI Summarization via Anthropic
// ============================================================

export async function summarizeWithClaude(emails: EmailMessage[], userEmail: string): Promise<EmailSummary[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  const emailList = emails.map((e, i) =>
    `[Email ${i + 1}]\nFrom: ${e.from}\nTo: ${e.to}\nSubject: ${e.subject}\nDate: ${e.date}\nBody: ${e.body.substring(0, 600)}`
  ).join('\n\n---\n\n');

  const prompt = `You are an email assistant for ${userEmail}. Analyze the following ${emails.length} emails.

Return a JSON array with one object per email (in order), each with:
- "importance": "critical"|"high"|"medium"|"low"
  critical = urgent/emergency/time-sensitive
  high = requires action, important person/topic
  medium = needs response but not urgent
  low = newsletters, marketing, automated notifications
- "summary": 1–2 sentence summary of the email
- "actionRequired": true or false
- "suggestedDraft": a professional draft reply if the email is personally addressed to ${userEmail} and warrants a response; otherwise null

Emails:
${emailList}

Return ONLY a valid JSON array. No markdown, no explanation.`;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = await httpsPost('https://api.anthropic.com/v1/messages', body, {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  });

  const parsed = JSON.parse(response);
  if (parsed.error) throw new Error(`Anthropic API error: ${parsed.error.message}`);

  let content: string = parsed.content?.[0]?.text || '[]';
  const match = content.match(/\[[\s\S]*\]/);
  if (match) content = match[0];

  const results: Array<{
    importance?: string;
    summary?: string;
    actionRequired?: boolean;
    suggestedDraft?: string | null;
  }> = JSON.parse(content);

  return results.map((s, i) => ({
    id: emails[i]?.id || String(i),
    subject: emails[i]?.subject || '',
    from: emails[i]?.from || '',
    date: emails[i]?.date || '',
    importance: (['critical', 'high', 'medium', 'low'].includes(s.importance || '') ? s.importance : 'medium') as EmailSummary['importance'],
    summary: s.summary || '',
    actionRequired: Boolean(s.actionRequired),
    suggestedDraft: s.suggestedDraft || null,
    isDirectlyAddressed: emails[i]?.isDirectlyAddressed || false,
  }));
}

// ============================================================
// Draft Creation
// ============================================================

export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const rawEmail = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  const encoded = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  const postBody = JSON.stringify({ message: { raw: encoded } });

  const response = await httpsRequest_(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    'POST',
    {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postBody),
    },
    postBody
  );

  const data = JSON.parse(response);
  if (!data.id) throw new Error(`Draft creation failed: ${JSON.stringify(data)}`);
  return data.id;
}
