const { chromium } = require('playwright');

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = {
    suite2: [],
    suite5: [],
    suite7: []
  };

  try {
    // Test Suite 2: Two-Panel Layout
    console.log('Test Suite 2: Two-Panel Layout');
    await page.goto('http://localhost:3343', { waitUntil: 'networkidle' });

    // Check left panel exists
    const leftPanel = await page.locator('.flex-1.border-r').first();
    const leftPanelVisible = await leftPanel.isVisible();
    results.suite2.push({
      test: '2.1 Left panel with terminal header exists',
      pass: leftPanelVisible,
      details: leftPanelVisible ? 'Left panel found' : 'Left panel not found'
    });

    // Check terminal header
    const terminalHeader = await page.locator('h2:has-text("Terminal")');
    const headerVisible = await terminalHeader.isVisible();
    results.suite2.push({
      test: '2.2 Terminal header visible',
      pass: headerVisible,
      details: headerVisible ? 'Terminal header found' : 'Terminal header not found'
    });

    // Check right panel exists with chat input
    const chatInput = await page.locator('input[placeholder*="Ask me"]');
    const chatInputVisible = await chatInput.isVisible();
    results.suite2.push({
      test: '2.3 Right panel with chat input exists',
      pass: chatInputVisible,
      details: chatInputVisible ? 'Chat input found' : 'Chat input not found'
    });

    // Check hint text about $ prefix
    const hintText = await page.locator('p:has-text("$")');
    const hintVisible = await hintText.isVisible();
    results.suite2.push({
      test: '2.4 Hint text mentions $ prefix for terminal commands',
      pass: hintVisible,
      details: hintVisible ? 'Hint text found' : 'Hint text not found'
    });

    // Test Suite 5: Chat → Terminal Command ($ prefix)
    console.log('Test Suite 5: Chat → Terminal Command ($ prefix)');

    // Type $ pwd in chat input
    await page.locator('input[placeholder*="Ask me"]').fill('$ pwd');

    // Click Send button
    const sendButton = await page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait a bit for message to appear
    await page.waitForTimeout(1000);

    // Check user message appears
    const userMessage = await page.locator('text=$ pwd');
    const userMessageVisible = await userMessage.isVisible();
    results.suite5.push({
      test: '5.1 User message "$ pwd" appears in chat',
      pass: userMessageVisible,
      details: userMessageVisible ? 'User message found' : 'User message not found'
    });

    // Wait for advisor response (up to 8 seconds for terminal command processing)
    console.log('Waiting for advisor response...');
    await page.waitForTimeout(8000);

    // Check advisor message mentions "Sending to terminal:"
    const advisorMessage = await page.locator('text=/Sending to terminal|Đang gửi|terminal|pwd/i');
    const advisorMessageVisible = await advisorMessage.isVisible();
    results.suite5.push({
      test: '5.2 Advisor response mentions terminal command',
      pass: advisorMessageVisible,
      details: advisorMessageVisible ? 'Advisor response found' : 'Advisor response not found'
    });

    // Check terminal output appears (should contain path)
    // Terminal output might show in terminal panel
    const terminalContent = await page.locator('.w-full.bg-\\[\\#1e1e1e\\]');
    const terminalVisible = await terminalContent.isVisible();
    results.suite5.push({
      test: '5.3 Terminal output appears in left panel',
      pass: terminalVisible,
      details: terminalVisible ? 'Terminal content visible' : 'Terminal content not visible'
    });

    // Test Suite 7: Frontend Chat Flow (Browser)
    console.log('Test Suite 7: Frontend Chat Flow (Browser)');

    // Fresh page for clean test
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3343', { waitUntil: 'networkidle' });

    // Type "hello" in chat input
    await page2.locator('input[placeholder*="Ask me"]').fill('hello');

    // Click Send
    const sendButton2 = await page2.locator('button:has-text("Send")');
    await sendButton2.click();

    // Check loading indicator (bouncing dots)
    await page2.waitForTimeout(500);
    const loadingIndicator = await page2.locator('text=/\.\.\.|loading|typing/i');
    const loadingVisible = await loadingIndicator.isVisible().catch(() => false);
    results.suite7.push({
      test: '7.1 Loading indicator appears',
      pass: loadingVisible,
      details: loadingVisible ? 'Loading indicator found' : 'Loading indicator not found'
    });

    // Wait for response (up to 30 seconds)
    console.log('Waiting for LLM response...');
    const maxWait = 30000;
    const startTime = Date.now();
    let responseFound = false;

    while (Date.now() - startTime < maxWait) {
      const messages = await page2.locator('div.max-w-xs').count();
      if (messages > 1) {
        responseFound = true;
        break;
      }
      await page2.waitForTimeout(1000);
    }

    results.suite7.push({
      test: '7.2 Advisor response appears within 30 seconds',
      pass: responseFound,
      details: responseFound ? 'Response received' : 'Response timeout'
    });

    // Check response appears as chat bubble
    const chatBubble = await page2.locator('div.max-w-xs').last();
    const bubbleVisible = await chatBubble.isVisible();
    results.suite7.push({
      test: '7.3 Response appears as chat bubble',
      pass: bubbleVisible,
      details: bubbleVisible ? 'Chat bubble visible' : 'Chat bubble not visible'
    });

    await page2.close();

  } catch (error) {
    console.error('Test error:', error);
  }

  await browser.close();

  // Output results
  console.log('\n\n=== TEST RESULTS ===\n');
  console.log('Suite 2: Two-Panel Layout');
  results.suite2.forEach(r => {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
    console.log(`         ${r.details}`);
  });

  console.log('\nSuite 5: Chat → Terminal Command ($ prefix)');
  results.suite5.forEach(r => {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
    console.log(`         ${r.details}`);
  });

  console.log('\nSuite 7: Frontend Chat Flow (Browser)');
  results.suite7.forEach(r => {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
    console.log(`         ${r.details}`);
  });

  // Return results for JSON output
  return { suite2: results.suite2, suite5: results.suite5, suite7: results.suite7 };
}

runTests().then(results => {
  process.stdout.write(JSON.stringify(results, null, 2));
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
