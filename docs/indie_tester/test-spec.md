# Blackbox Test Specification — Guided AI Coding (Sprint 2-4)

## App URL
- Frontend: http://localhost:3343
- Backend: http://localhost:17066
- Terminal Service: http://localhost:17076

## Test Suite 1: Services Health
1. GET http://localhost:3343 → should return 200
2. GET http://localhost:17066/health → should return JSON with status "healthy"
3. GET http://localhost:17076/health → should return JSON with status "ok"

## Test Suite 2: Two-Panel Layout
1. Navigate to http://localhost:3343
2. Verify left panel exists with a terminal (should see "Terminal" header or xterm element)
3. Verify right panel exists with chat interface (should see "Ask me anything..." placeholder)
4. Verify hint text mentions "$ " prefix for terminal commands

## Test Suite 3: Terminal Interaction via REST API
1. POST http://localhost:17076/api/terminals/default/send with body {"data": "echo BLACKBOX_TEST_123\n"} → should return {"ok": true}
2. Wait 2 seconds
3. GET http://localhost:17076/api/terminals/default/read?lines=5 → output should contain "BLACKBOX_TEST_123"

## Test Suite 4: Chat → Normal Advisor (LLM Tutor)
1. POST http://localhost:17066/api/chat with body {"message": "xin chao"} → should return JSON with "text" field, non-empty, likely Vietnamese response
2. Response should NOT be a hardcoded keyword match (should mention tutor-like content, greeting, or teaching)

## Test Suite 5: Chat → Terminal Command ($ prefix)
1. Open http://localhost:3343 in browser
2. Type "$ pwd" in the chat input
3. Click Send
4. Wait 8 seconds
5. Verify: user message "$ pwd" appears in chat
6. Verify: advisor message "Sending to terminal:" appears
7. Verify: terminal output appears (should contain a path like /home/ or /dev/)

## Test Suite 6: Tutor Terminal Awareness
1. Send a command to terminal: POST http://localhost:17076/api/terminals/default/send {"data": "mkdir tutor_test_folder && ls\n"}
2. Wait 2 seconds
3. Ask tutor: POST http://localhost:17066/api/chat {"message": "xong roi, toi vua tao folder va chay ls, ban thay gi?"}
4. Tutor response should mention "tutor_test_folder" or reference the folder/files it sees — proving it read the terminal
5. Clean up: POST http://localhost:17076/api/terminals/default/send {"data": "rmdir tutor_test_folder\n"}

## Test Suite 7: Frontend Chat Flow (Browser)
1. Navigate to http://localhost:3343
2. Type "hello" in chat input
3. Click Send
4. Verify loading indicator appears (bouncing dots)
5. Wait for response (up to 30s since LLM may be slow)
6. Verify advisor response appears as a chat bubble on the left side

## Notes
- The tutor uses Grok (xAI) LLM — responses may take 5-15 seconds
- Terminal commands via chat ($prefix) have a 5-second built-in delay
- The tutor speaks Vietnamese by default
- Playwright is already installed for browser tests
