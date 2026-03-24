/**
 * V3 CLI Gmail Command
 * Connect to Gmail, read emails, summarize with AI, organize by importance,
 * and draft responses to emails addressed specifically to you.
 *
 * Setup: Requires Google OAuth2 credentials and ANTHROPIC_API_KEY
 * Run:   claude-flow gmail auth   (first time)
 *        claude-flow gmail        (read + summarize + draft)
 */

import type { Command, CommandContext, CommandResult } from '../types.js';
import { output } from '../output.js';
import { input } from '../prompt.js';
import type { EmailSummary, UserProfile } from '../services/gmail-service.js';

// ============================================================
// Helpers
// ============================================================

const IMPORTANCE_ICONS: Record<EmailSummary['importance'], string> = {
  critical: '[!!!]',
  high:     '[!!] ',
  medium:   '[!]  ',
  low:      '[--] ',
};

const IMPORTANCE_ORDER: EmailSummary['importance'][] = ['critical', 'high', 'medium', 'low'];

function truncate(str: string, len: number): string {
  return str.length > len ? str.substring(0, len - 1) + '…' : str;
}

function printSummary(summaries: EmailSummary[], showDrafts: boolean, profile: UserProfile | null = null): void {
  output.writeln();
  output.writeln(output.bold('══════════════════════════════════════════════════════'));
  if (profile) {
    output.writeln(output.bold(`  Gmail Summary — ${profile.name} | ${profile.role}, ${profile.company}`));
  } else {
    output.writeln(output.bold('  Gmail Summary — Organized by Importance'));
  }
  output.writeln(output.bold('══════════════════════════════════════════════════════'));

  for (const level of IMPORTANCE_ORDER) {
    const group = summaries.filter(s => s.importance === level);
    if (!group.length) continue;

    const label = level.toUpperCase();
    const icon = IMPORTANCE_ICONS[level];
    output.writeln();
    if (level === 'critical') output.writeln(output.color(`${icon} ${label} (${group.length})`, 'brightRed'));
    else if (level === 'high')  output.writeln(output.color(`${icon} ${label} (${group.length})`, 'brightYellow'));
    else if (level === 'medium') output.writeln(output.color(`${icon} ${label} (${group.length})`, 'brightCyan'));
    else output.writeln(output.color(`${icon} ${label} (${group.length})`, 'gray'));
    output.writeln(output.dim('  ' + '─'.repeat(52)));

    for (const s of group) {
      output.writeln(`  ${output.bold(truncate(s.subject || '(no subject)', 50))}`);
      output.writeln(`  ${output.dim('From:')} ${truncate(s.from, 45)}`);
      output.writeln(`  ${output.dim('Date:')} ${s.date}`);
      output.writeln(`  ${s.summary}`);
      if (s.actionRequired) output.writeln(`  ${output.color('→ Action required', 'brightYellow')}`);
      if (s.taskStrategy) output.writeln(`  ${output.color('⚙ Task requested — strategy available below', 'brightMagenta')}`);
      if (s.isDirectlyAddressed) output.writeln(`  ${output.color('✉ Addressed directly to you', 'brightGreen')}`);
      output.writeln();
    }
  }

  // Task Strategies
  const withStrategy = summaries.filter(s => s.taskStrategy);
  if (withStrategy.length) {
    output.writeln(output.bold('══════════════════════════════════════════════════════'));
    output.writeln(output.bold(`  Task Strategies & Proposed Workflows (${withStrategy.length})`));
    output.writeln(output.bold('══════════════════════════════════════════════════════'));
    for (const s of withStrategy) {
      const ts = s.taskStrategy!;
      output.writeln();
      output.writeln(output.color(`  ⚙ ${truncate(s.subject || '(no subject)', 46)}`, 'brightMagenta'));
      output.writeln(`  ${output.dim('Task:')} ${ts.taskDescription}`);
      output.writeln(`  ${output.dim('Timeline:')} ${ts.timeline}`);
      output.writeln(`  ${output.bold('Steps:')}`);
      ts.steps.forEach((step, i) => output.writeln(`    ${i + 1}. ${step}`));
      if (ts.stakeholders.length) {
        output.writeln(`  ${output.bold('Involve:')} ${ts.stakeholders.join(', ')}`);
      }
      if (ts.considerations.length) {
        output.writeln(`  ${output.bold('Considerations:')}`);
        ts.considerations.forEach(c => output.writeln(`    • ${c}`));
      }
      output.writeln();
    }
  }

  if (showDrafts) {
    const withDrafts = summaries.filter(s => s.suggestedDraft);
    if (withDrafts.length) {
      output.writeln(output.bold('══════════════════════════════════════════════════════'));
      output.writeln(output.bold(`  Draft Responses${profile ? ` — as ${profile.name}` : ''} (${withDrafts.length})`));
      output.writeln(output.bold('══════════════════════════════════════════════════════'));
      for (const s of withDrafts) {
        output.writeln();
        output.writeln(output.bold(`  Re: ${truncate(s.subject || '(no subject)', 46)}`));
        output.writeln(output.dim(`  To: ${s.from}`));
        output.writeln(output.dim('  ' + '─'.repeat(52)));
        output.writeln(`  ${s.suggestedDraft!.replace(/\n/g, '\n  ')}`);
        output.writeln();
      }
    }
  }
}

// ============================================================
// profile subcommand
// ============================================================

const profileCommand: Command = {
  name: 'profile',
  description: 'Set your role, company, and core values to personalize AI-crafted responses',
  options: [
    { name: 'show', type: 'boolean', description: 'Show current profile without editing' },
  ],
  examples: [
    { command: 'claude-flow gmail profile', description: 'Interactive profile setup' },
    { command: 'claude-flow gmail profile --show', description: 'Display current profile' },
  ],
  action: async (ctx: CommandContext): Promise<CommandResult> => {
    const { loadProfile, saveProfile } = await import('../services/gmail-service.js');
    const existing = loadProfile();

    if (ctx.flags.show) {
      if (!existing) {
        output.writeln(output.warning('No profile set. Run: claude-flow gmail profile'));
        return { success: true };
      }
      output.writeln();
      output.writeln(output.bold('Your Gmail AI Profile'));
      output.writeln(output.dim('─'.repeat(50)));
      output.writeln(`  ${output.dim('Name:')}   ${existing.name}`);
      output.writeln(`  ${output.dim('Role:')}   ${existing.role}`);
      output.writeln(`  ${output.dim('Company:')} ${existing.company}`);
      output.writeln(`  ${output.dim('Values:')}  ${existing.coreValues.join(', ')}`);
      output.writeln(`  ${output.dim('Style:')}  ${existing.communicationStyle}`);
      if (existing.additionalContext) output.writeln(`  ${output.dim('Context:')} ${existing.additionalContext}`);
      return { success: true };
    }

    output.writeln();
    output.writeln(output.bold('Gmail AI Profile Setup'));
    output.writeln(output.dim('Your role and values will shape all AI-drafted responses.'));
    output.writeln(output.dim('─'.repeat(50)));

    const name = await input({ message: 'Your full name:', default: existing?.name || '' });
    const role = await input({ message: 'Your job title/role:', default: existing?.role || '' });
    const company = await input({ message: 'Company name:', default: existing?.company || '' });
    const valuesStr = await input({
      message: 'Company core values (comma-separated):',
      default: existing?.coreValues?.join(', ') || '',
      validate: (v: string) => v.trim().length > 0 || 'Please enter at least one value',
    });
    const styleStr = await input({
      message: 'Communication style (formal / professional / casual):',
      default: existing?.communicationStyle || 'professional',
      validate: (v: string) => ['formal', 'professional', 'casual'].includes(v.trim()) || 'Enter: formal, professional, or casual',
    });
    const context = await input({
      message: 'Additional context for AI (optional, press Enter to skip):',
      default: existing?.additionalContext || '',
    });

    const profile = {
      name: name.trim(),
      role: role.trim(),
      company: company.trim(),
      coreValues: valuesStr.split(',').map((v: string) => v.trim()).filter(Boolean),
      communicationStyle: styleStr.trim() as UserProfile['communicationStyle'],
      additionalContext: context.trim() || undefined,
    };
    saveProfile(profile);

    output.writeln();
    output.writeln(output.success('Profile saved! AI responses will now reflect your role and company values.'));
    output.writeln(output.dim('Run: claude-flow gmail  to summarize emails with your profile.'));
    return { success: true };
  },
};

// ============================================================
// auth subcommand
// ============================================================

const authCommand: Command = {
  name: 'auth',
  description: 'Set up Gmail OAuth2 credentials and authorize access',
  options: [
    { name: 'client-id', type: 'string', description: 'Google OAuth2 client ID (skips prompt)' },
    { name: 'client-secret', type: 'string', description: 'Google OAuth2 client secret (skips prompt)' },
  ],
  examples: [
    { command: 'claude-flow gmail auth', description: 'Interactive credential setup and OAuth2 flow' },
    { command: 'claude-flow gmail auth --client-id=ID --client-secret=SECRET', description: 'Non-interactive setup' },
  ],
  action: async (ctx: CommandContext): Promise<CommandResult> => {
    const { loadCredentials, saveCredentials, startOAuthFlow } = await import('../services/gmail-service.js');

    output.writeln();
    output.writeln(output.bold('Gmail Authorization Setup'));
    output.writeln(output.dim('─'.repeat(50)));
    output.writeln('You need Google OAuth2 credentials. Create them at:');
    output.writeln(output.dim('  https://console.cloud.google.com/apis/credentials'));
    output.writeln('Enable the Gmail API and create an OAuth 2.0 Client ID');
    output.writeln('(Application type: Desktop app).');
    output.writeln();

    let clientId = ctx.flags['client-id'] as string || '';
    let clientSecret = ctx.flags['client-secret'] as string || '';

    const existing = loadCredentials();
    if (!clientId) {
      clientId = await input({
        message: 'Google OAuth2 Client ID:',
        default: existing?.client_id || '',
        validate: (v: string) => v.trim().length > 0 || 'Client ID is required',
      });
    }
    if (!clientSecret) {
      clientSecret = await input({
        message: 'Google OAuth2 Client Secret:',
        default: existing?.client_secret || '',
        validate: (v: string) => v.trim().length > 0 || 'Client secret is required',
      });
    }

    const creds = { client_id: clientId.trim(), client_secret: clientSecret.trim() };
    saveCredentials(creds);
    output.writeln(output.success('Credentials saved.'));
    output.writeln();

    const spinner = output.createSpinner({ text: 'Starting OAuth2 flow…', spinner: 'dots' });
    spinner.start();
    spinner.stop();

    try {
      const tokens = await startOAuthFlow(creds);
      output.writeln(output.success('Authorization complete! Tokens saved.'));
      output.writeln(output.dim(`Access token expires: ${new Date(tokens.expiry_date).toLocaleString()}`));
      return { success: true, message: 'Gmail authorized successfully' };
    } catch (err) {
      output.writeln(output.error(`Authorization failed: ${(err as Error).message}`));
      return { success: false, message: (err as Error).message, exitCode: 1 };
    }
  },
};

// ============================================================
// read subcommand
// ============================================================

const readCommand: Command = {
  name: 'read',
  description: 'Read and list emails from your Gmail inbox',
  options: [
    { name: 'count', short: 'n', type: 'number', description: 'Number of emails to fetch', default: 20 },
    { name: 'json', type: 'boolean', description: 'Output raw JSON' },
  ],
  examples: [
    { command: 'claude-flow gmail read', description: 'List 20 most recent inbox emails' },
    { command: 'claude-flow gmail read -n 50', description: 'List 50 emails' },
  ],
  action: async (ctx: CommandContext): Promise<CommandResult> => {
    const {
      loadCredentials, loadTokens, getValidAccessToken,
      getUserEmail, fetchEmails, markDirectlyAddressed,
    } = await import('../services/gmail-service.js');

    const creds = loadCredentials();
    if (!creds) {
      output.writeln(output.error('No credentials found. Run: claude-flow gmail auth'));
      return { success: false, exitCode: 1 };
    }
    const tokens = loadTokens();
    if (!tokens) {
      output.writeln(output.error('Not authorized. Run: claude-flow gmail auth'));
      return { success: false, exitCode: 1 };
    }

    const count = (ctx.flags.count as number) || 20;
    const spinner = output.createSpinner({ text: 'Fetching emails…', spinner: 'dots' });
    spinner.start();

    try {
      const accessToken = await getValidAccessToken(creds, tokens);
      const userEmail = await getUserEmail(accessToken);
      spinner.setText(`Fetching ${count} emails for ${userEmail}…`);
      const emails = await fetchEmails(accessToken, count);
      markDirectlyAddressed(emails, userEmail);
      spinner.stop();

      if (ctx.flags.json) {
        console.log(JSON.stringify(emails, null, 2));
        return { success: true };
      }

      output.writeln();
      output.writeln(output.bold(`Inbox — ${userEmail} (${emails.length} emails)`));
      output.writeln(output.dim('─'.repeat(60)));
      for (const e of emails) {
        const direct = e.isDirectlyAddressed ? output.color(' ✉', 'brightGreen') : '';
        output.writeln(`${output.bold(truncate(e.subject || '(no subject)', 45))}${direct}`);
        output.writeln(`  ${output.dim('From:')} ${truncate(e.from, 45)}  ${output.dim(e.date)}`);
        output.writeln(`  ${output.dim(truncate(e.snippet, 70))}`);
        output.writeln();
      }
      return { success: true };
    } catch (err) {
      spinner.stop();
      output.writeln(output.error((err as Error).message));
      return { success: false, exitCode: 1 };
    }
  },
};

// ============================================================
// summarize subcommand
// ============================================================

const summarizeCommand: Command = {
  name: 'summarize',
  description: 'Read, summarize, and organize emails by importance — then draft replies',
  options: [
    { name: 'count', short: 'n', type: 'number', description: 'Number of emails to process', default: 20 },
    { name: 'save-drafts', type: 'boolean', description: 'Save draft replies to Gmail Drafts folder' },
    { name: 'json', type: 'boolean', description: 'Output raw JSON summaries' },
  ],
  examples: [
    { command: 'claude-flow gmail summarize', description: 'Summarize 20 emails with draft responses' },
    { command: 'claude-flow gmail summarize -n 50 --save-drafts', description: 'Process 50 emails and save drafts' },
  ],
  action: async (ctx: CommandContext): Promise<CommandResult> => {
    const {
      loadCredentials, loadTokens, getValidAccessToken,
      getUserEmail, fetchEmails, markDirectlyAddressed,
      summarizeWithClaude, createGmailDraft, loadProfile,
    } = await import('../services/gmail-service.js');

    const creds = loadCredentials();
    if (!creds) {
      output.writeln(output.error('No credentials found. Run: claude-flow gmail auth'));
      return { success: false, exitCode: 1 };
    }
    const tokens = loadTokens();
    if (!tokens) {
      output.writeln(output.error('Not authorized. Run: claude-flow gmail auth'));
      return { success: false, exitCode: 1 };
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      output.writeln(output.error('ANTHROPIC_API_KEY environment variable is required for AI summarization.'));
      return { success: false, exitCode: 1 };
    }

    const count = (ctx.flags.count as number) || 20;
    const saveDrafts = Boolean(ctx.flags['save-drafts']);
    const profile = loadProfile();

    if (profile) {
      output.writeln(output.dim(`Using profile: ${profile.name} | ${profile.role} at ${profile.company}`));
    } else {
      output.writeln(output.dim('Tip: Run "claude-flow gmail profile" to personalize AI responses with your role & values.'));
    }

    const spinner = output.createSpinner({ text: 'Connecting to Gmail…', spinner: 'dots' });
    spinner.start();

    try {
      const accessToken = await getValidAccessToken(creds, tokens);
      const userEmail = await getUserEmail(accessToken);

      spinner.setText(`Fetching ${count} emails for ${userEmail}…`);
      const emails = await fetchEmails(accessToken, count);
      markDirectlyAddressed(emails, userEmail);

      spinner.setText(`Summarizing ${emails.length} emails with Claude AI…`);
      const summaries = await summarizeWithClaude(emails, userEmail, profile);
      spinner.stop();

      if (ctx.flags.json) {
        console.log(JSON.stringify(summaries, null, 2));
        return { success: true };
      }

      printSummary(summaries, true, profile);

      // Save drafts to Gmail if requested
      if (saveDrafts) {
        const draftable = summaries.filter(s => s.suggestedDraft && s.isDirectlyAddressed);
        if (draftable.length === 0) {
          output.writeln(output.dim('No personal emails found that warrant a draft reply.'));
        } else {
          output.writeln(output.bold(`Saving ${draftable.length} draft(s) to Gmail…`));
          for (const s of draftable) {
            const email = emails.find(e => e.id === s.id);
            if (!email) continue;
            const draftId = await createGmailDraft(accessToken, email.from, s.subject, s.suggestedDraft!);
            output.writeln(output.success(`  Draft saved (ID: ${draftId}): Re: ${truncate(s.subject, 40)}`));
          }
        }
      }

      const stats = {
        total: summaries.length,
        critical: summaries.filter(s => s.importance === 'critical').length,
        high: summaries.filter(s => s.importance === 'high').length,
        actionRequired: summaries.filter(s => s.actionRequired).length,
        drafts: summaries.filter(s => s.suggestedDraft).length,
      };

      output.writeln(output.dim('──────────────────────────────────────────────────────'));
      output.writeln(output.dim(`Processed ${stats.total} emails: ${stats.critical} critical, ${stats.high} high, ${stats.actionRequired} need action, ${stats.drafts} drafts generated`));
      if (!saveDrafts && stats.drafts > 0) {
        output.writeln(output.dim(`Tip: Run with --save-drafts to save responses to Gmail`));
      }

      return { success: true };
    } catch (err) {
      spinner.stop();
      output.writeln(output.error((err as Error).message));
      return { success: false, exitCode: 1 };
    }
  },
};

// ============================================================
// Main gmail command
// ============================================================

export const gmailCommand: Command = {
  name: 'gmail',
  description: 'Connect to Gmail: read emails, summarize with AI, organize by importance, draft replies',
  aliases: ['email'],
  subcommands: [profileCommand, authCommand, readCommand, summarizeCommand],
  options: [
    { name: 'count', short: 'n', type: 'number', description: 'Number of emails to process', default: 20 },
    { name: 'save-drafts', type: 'boolean', description: 'Save draft replies to Gmail Drafts folder' },
    { name: 'json', type: 'boolean', description: 'Output raw JSON' },
  ],
  examples: [
    { command: 'claude-flow gmail auth', description: 'First-time setup: authorize Gmail access' },
    { command: 'claude-flow gmail', description: 'Summarize inbox and draft replies (default: 20 emails)' },
    { command: 'claude-flow gmail -n 50 --save-drafts', description: 'Process 50 emails, save drafts to Gmail' },
    { command: 'claude-flow gmail read', description: 'List emails without AI summarization' },
    { command: 'claude-flow gmail summarize --json', description: 'Output JSON summaries for scripting' },
  ],
  // Default action (no subcommand) = summarize
  action: summarizeCommand.action,
};

export default gmailCommand;
