#!/usr/bin/env node

/**
 * Test Suite 5: Chat → Terminal Command ($ prefix)
 * This script uses Playwright to test the full flow:
 * 1. Open browser to http://localhost:3343
 * 2. Type "$ pwd" in chat input
 * 3. Click Send button
 * 4. Verify user message appears
 * 5. Verify advisor response appears
 * 6. Verify terminal output appears
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_DIR = '/home/hungson175/dev/mrw/guided-AI-coding/docs/indie_tester/sprint-2-4';
const TEST_RESULTS_FILE = path.join(TEST_RESULTS_DIR, 'test-5-retry.md');

let testResults = [];

function logResult(title, status, details = '') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${title}: ${status}`);
  if (details) console.log(`  ${details}`);
  testResults.push({ title, status, details, timestamp });
}

async function runTest() {
  let browser, page;
  const results = {
    testName: 'Test Suite 5: Chat → Terminal Command ($ prefix)',
    timestamp: new Date().toISOString(),
    steps: [],
    finalStatus: 'UNKNOWN'
  };

  try {
    logResult('Step 1', 'START', 'Launching Chromium browser...');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    logResult('Step 1', 'PASS', 'Browser launched successfully');
    results.steps.push({ step: 1, action: 'Launch browser', status: 'PASS' });

    logResult('Step 2', 'START', 'Navigating to http://localhost:3343...');
    await page.goto('http://localhost:3343', { waitUntil: 'networkidle' });
    logResult('Step 2', 'PASS', 'Page loaded successfully');
    results.steps.push({ step: 2, action: 'Navigate to http://localhost:3343', status: 'PASS' });

    // Wait a moment for the page to fully render
    await page.waitForTimeout(1000);

    logResult('Step 3', 'START', 'Locating chat input field...');
    const chatInput = await page.locator('input[placeholder="Ask me anything..."]');
    const chatInputCount = await chatInput.count();

    if (chatInputCount === 0) {
      logResult('Step 3', 'FAIL', 'Chat input field not found. Checking page content...');
      const pageContent = await page.content();
      console.log('Page HTML length:', pageContent.length);
      const hasPlaceholder = pageContent.includes('Ask me anything');
      console.log('Has "Ask me anything" in HTML:', hasPlaceholder);
      results.steps.push({ step: 3, action: 'Locate chat input', status: 'FAIL', error: 'Chat input not found' });
      results.finalStatus = 'FAIL';
      return results;
    }

    logResult('Step 3', 'PASS', `Found ${chatInputCount} chat input(s)`);
    results.steps.push({ step: 3, action: 'Locate chat input field', status: 'PASS' });

    logResult('Step 4', 'START', 'Typing "$ pwd" into chat input...');
    await chatInput.first().fill('$ pwd');
    await page.waitForTimeout(500);
    const inputValue = await chatInput.first().inputValue();
    logResult('Step 4', 'PASS', `Input value confirmed: "${inputValue}"`);
    results.steps.push({ step: 4, action: 'Type "$ pwd"', status: 'PASS', inputValue });

    logResult('Step 5', 'START', 'Locating and clicking Send button...');

    // Try multiple selectors for the send button
    let sendButton = null;
    const possibleSelectors = [
      'button:has-text("Send")',
      'button[aria-label="Send"]',
      'button[type="submit"]',
      'button'
    ];

    for (const selector of possibleSelectors) {
      try {
        const buttons = await page.locator(selector);
        const count = await buttons.count();
        if (count > 0) {
          // Look for a button near the input that's likely the send button
          for (let i = 0; i < count; i++) {
            const text = await buttons.nth(i).textContent();
            const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
            if (text === 'Send' || ariaLabel === 'Send' ||
                (selector === 'button[type="submit"]' && count > 0)) {
              sendButton = buttons.nth(i);
              break;
            }
          }
        }
        if (sendButton) break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!sendButton) {
      logResult('Step 5', 'FAIL', 'Send button not found');
      results.steps.push({ step: 5, action: 'Click Send button', status: 'FAIL', error: 'Send button not found' });
      results.finalStatus = 'FAIL';
      return results;
    }

    await sendButton.click();
    logResult('Step 5', 'PASS', 'Send button clicked');
    results.steps.push({ step: 5, action: 'Click Send button', status: 'PASS' });

    logResult('Step 6', 'START', 'Waiting for response (10 seconds for command delay + LLM)...');
    await page.waitForTimeout(10000);
    logResult('Step 6', 'PASS', 'Wait completed');
    results.steps.push({ step: 6, action: 'Wait 10 seconds', status: 'PASS' });

    logResult('Step 7', 'START', 'Verifying user message "$ pwd" appears in chat...');
    const pageText = await page.locator('body').textContent();

    const hasPwdMessage = pageText.includes('$ pwd');
    if (!hasPwdMessage) {
      logResult('Step 7', 'FAIL', '"$ pwd" not found in page text');
      results.steps.push({ step: 7, action: 'Verify user message', status: 'FAIL', error: '"$ pwd" not found' });
    } else {
      logResult('Step 7', 'PASS', '"$ pwd" found in page');
      results.steps.push({ step: 7, action: 'Verify user message', status: 'PASS', message: '$ pwd found' });
    }

    logResult('Step 8', 'START', 'Verifying advisor response "Sending to terminal:" appears...');
    const hasSendingMessage = pageText.includes('Sending to terminal:');
    if (!hasSendingMessage) {
      logResult('Step 8', 'FAIL', '"Sending to terminal:" not found in page text');
      results.steps.push({ step: 8, action: 'Verify advisor message', status: 'FAIL', error: '"Sending to terminal:" not found' });
    } else {
      logResult('Step 8', 'PASS', '"Sending to terminal:" found in page');
      results.steps.push({ step: 8, action: 'Verify advisor message', status: 'PASS', message: 'Sending to terminal: found' });
    }

    logResult('Step 9', 'START', 'Verifying terminal output appears (path like /home/ or /dev/)...');
    const hasTerminalOutput = /\/(home|dev|root|tmp|var|usr|bin|etc)\//.test(pageText);

    if (!hasTerminalOutput) {
      logResult('Step 9', 'FAIL', 'Terminal path output not found');
      results.steps.push({ step: 9, action: 'Verify terminal output', status: 'FAIL', error: 'No path found' });
    } else {
      logResult('Step 9', 'PASS', 'Terminal path output found');
      results.steps.push({ step: 9, action: 'Verify terminal output', status: 'PASS', message: 'Path output found' });
    }

    // Determine final status
    const passedSteps = results.steps.filter(s => s.status === 'PASS').length;
    const failedSteps = results.steps.filter(s => s.status === 'FAIL').length;

    if (failedSteps === 0) {
      results.finalStatus = 'PASS';
      logResult('FINAL RESULT', 'PASS', `All ${passedSteps} steps passed`);
    } else {
      results.finalStatus = 'FAIL';
      logResult('FINAL RESULT', 'FAIL', `${failedSteps} steps failed, ${passedSteps} steps passed`);
    }

  } catch (error) {
    logResult('EXCEPTION', 'ERROR', error.message);
    results.finalStatus = 'ERROR';
    results.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
      logResult('Cleanup', 'PASS', 'Browser closed');
    }
  }

  return results;
}

async function main() {
  console.log('='.repeat(80));
  console.log('TEST SUITE 5: Chat → Terminal Command ($ prefix)');
  console.log('='.repeat(80));
  console.log('');

  const results = await runTest();

  // Write results to file
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }

  const markdown = `# Test Suite 5 Retry: Chat → Terminal Command ($ prefix)

**Date**: ${results.timestamp}
**Tester**: Independent QA Agent (Playwright Automation)
**Test Status**: ${results.finalStatus}

## Test Overview

This test validates the complete flow of sending a terminal command via the chat interface:
- User types a command with $ prefix in the chat input
- System detects the $ prefix and routes to terminal
- Terminal executes the command
- Output appears in both terminal and chat

## Test Execution Details

### Step-by-Step Results

${results.steps.map((step, idx) => {
  const icon = step.status === 'PASS' ? '✓' : '✗';
  return `**Step ${step.step}: ${step.action}**
- Status: ${icon} ${step.status}
${step.error ? `- Error: ${step.error}` : ''}
${step.message ? `- Message: ${step.message}` : ''}
${step.inputValue ? `- Value: ${step.inputValue}` : ''}
`;
}).join('\n')}

## Summary

**Total Steps**: ${results.steps.length}
**Passed**: ${results.steps.filter(s => s.status === 'PASS').length}
**Failed**: ${results.steps.filter(s => s.status === 'FAIL').length}

**Final Result**: **${results.finalStatus}**

${results.error ? `\n## Exception\n\`\`\`\n${results.error}\n\`\`\`` : ''}

## Test Execution Log

${testResults.map(r => `- [${r.timestamp}] ${r.title}: ${r.status}${r.details ? ' — ' + r.details : ''}`).join('\n')}

## Conclusion

${results.finalStatus === 'PASS'
  ? 'Test Suite 5 PASSED. The terminal command flow via chat interface is working correctly.'
  : 'Test Suite 5 FAILED. One or more steps did not complete successfully. See details above.'}
`;

  fs.writeFileSync(TEST_RESULTS_FILE, markdown, 'utf-8');
  console.log('');
  console.log('='.repeat(80));
  console.log(`Results written to: ${TEST_RESULTS_FILE}`);
  console.log('='.repeat(80));

  process.exit(results.finalStatus === 'PASS' ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
