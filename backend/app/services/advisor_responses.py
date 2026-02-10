from dataclasses import dataclass


@dataclass
class AdvisorResponse:
    text: str


_RESPONSES: dict[str, AdvisorResponse] = {
    "default": AdvisorResponse(
        text="Great question! Try typing 'run' in the terminal to start your Tic-Tac-Toe game. Or ask me 'What should I do next?' for guidance.",
    ),
    "help": AdvisorResponse(
        text="I can help you! Here's what we can do:\n\n1. Type 'run' in terminal \u2192 See the Tic-Tac-Toe game\n2. Ask me how to modify the game\n3. Learn how the code works\n\nWhat would you like to do?",
    ),
    "start": AdvisorResponse(
        text="Great! Let's begin. In the terminal on the left, type:\n\nrun\n\nThen click 'Run App' to see your Tic-Tac-Toe game. You've got this!",
    ),
    "hi": AdvisorResponse(
        text="Hey there! Let's build something. Type 'run' in the terminal to launch your Tic-Tac-Toe game and play it!",
    ),
    "hello": AdvisorResponse(
        text="Hello! Welcome to the software builder. Start by typing 'run' in the terminal to see your game come to life!",
    ),
    "thanks": AdvisorResponse(
        text="You're welcome! Keep going - you're doing great. Type 'run' and then tell me how you want to improve the game!",
    ),
    "thank": AdvisorResponse(
        text="Happy to help! Now go build something awesome. Type 'run' and start playing!",
    ),
    "what should i do": AdvisorResponse(
        text="Here's the step-by-step guide:\n\n1\ufe0f\u20e3 Type 'run' in the terminal (left side)\n2\ufe0f\u20e3 Click 'Run App' button\n3\ufe0f\u20e3 Play the Tic-Tac-Toe game\n4\ufe0f\u20e3 Try to beat me!\n\nReady? Go ahead and type 'run'!",
    ),
    "how do i run": AdvisorResponse(
        text="Easy! Just type this command in the terminal:\n\nrun\n\nThen click the 'Run App' button to see your game in action. Give it a try!",
    ),
    "how to run": AdvisorResponse(
        text="Simple:\n\n1. Type 'run' in the terminal on the left\n2. Click 'Run App' button\n3. Your Tic-Tac-Toe game appears below\n\nLet's go! Type 'run' now.",
    ),
    "run": AdvisorResponse(
        text="Perfect! I see you're about to play. Type 'run' in the terminal and click 'Run App' to see your game!",
    ),
    "how to play": AdvisorResponse(
        text="Tic-Tac-Toe rules:\n\n\u2713 Take turns marking X or O\n\u2713 Get 3 in a row (horizontal, vertical, or diagonal) to win\n\u2713 First player is X\n\u2713 If board fills with no winner \u2192 Draw\n\nPlay smart! Block my moves too.",
    ),
    "how do i win": AdvisorResponse(
        text="To win Tic-Tac-Toe:\n\n\U0001f3af Get 3 X's in a row (horizontal, vertical, or diagonal)\n\U0001f3af Block me from getting 3 O's in a row\n\U0001f3af Control the center square (best strategy)\n\nLet's play!",
    ),
    "how to change": AdvisorResponse(
        text="Great idea! Modifying code is the next level. We can:\n\n\U0001f4dd Change the colors\n\U0001f4dd Change board size (3x3 \u2192 5x5)\n\U0001f4dd Change game rules\n\nWhat would you like to change? Just tell me, and I'll help!",
    ),
    "can i modify": AdvisorResponse(
        text="Absolutely! You can modify almost anything:\n\n\u2022 Colors and styling\n\u2022 Board size\n\u2022 Game rules\n\u2022 Player names\n\u2022 Win animations\n\nWhat would you like to change?",
    ),
    "5 in a row": AdvisorResponse(
        text="Smart thinking! Converting to 5-in-a-row:\n\n1. The game logic stays the same\n2. We just change the win condition from 3\u21925\n3. Board needs to be larger (5x5 or more)\n\nWant to try this? I can show you the code changes needed.",
    ),
    "how does it work": AdvisorResponse(
        text="The game has 3 parts:\n\n1\ufe0f\u20e3 HTML - The board display\n2\ufe0f\u20e3 CSS - Colors and layout\n3\ufe0f\u20e3 JavaScript - Game logic\n\nWhen you click a square:\n\u2192 JavaScript updates the board\n\u2192 Checks for winner\n\u2192 Your move is displayed\n\nSimple yet powerful!",
    ),
    "show me code": AdvisorResponse(
        text="The code is built into your app! When you click 'Run App', the entire game loads.\n\nKey parts:\n\u2022 Board: 3x3 grid with click handlers\n\u2022 Logic: Checks winning conditions\n\u2022 Display: Shows X's and O's\n\nWant me to explain a specific part?",
    ),
    "congratulations": AdvisorResponse(
        text="Amazing! You just built and played a game in your browser! \U0001f389\n\nYou did it without writing any code - just by following commands. That's the power of this tool.\n\nReady for the next challenge?",
    ),
    "next step": AdvisorResponse(
        text="Next steps to level up:\n\n1. Play and master the game\n2. Ask me about changing game rules\n3. Learn how the code works\n4. Modify colors or board size\n\nYou're doing great! What interests you most?",
    ),
    "what is": AdvisorResponse(
        text="Great question! Here's what I can help with:\n\n\u2022 Game rules and strategy\n\u2022 How to modify the game\n\u2022 Understanding the code\n\u2022 Building next features\n\nWhat specifically would you like to know?",
    ),
    "tell me about": AdvisorResponse(
        text="I'd love to explain! Give me more details about what you want to know:\n\n\u2022 The game itself?\n\u2022 How to play?\n\u2022 How the code works?\n\u2022 How to modify it?\n\nWhat are you curious about?",
    ),
    "error": AdvisorResponse(
        text="I'm not sure about that. Let me help redirect you:\n\n\u2022 Want to play? \u2192 Type 'run'\n\u2022 Want to understand? \u2192 Ask 'how does it work'\n\u2022 Want to modify? \u2192 Ask 'how to change the game'\n\nWhat would you like to do?",
    ),
}


def get_advisor_response(user_input: str) -> AdvisorResponse:
    text = user_input.lower().strip()

    # Direct match
    if text in _RESPONSES:
        return _RESPONSES[text]

    # Partial match — check if input contains a key phrase
    for key, response in _RESPONSES.items():
        if key in ("default", "error"):
            continue
        if key in text:
            return response

    # Common pattern fallbacks
    if "what" in text or "how" in text:
        return _RESPONSES["error"]

    if "play" in text or "game" in text:
        return _RESPONSES["how to play"]

    if "code" in text or "work" in text:
        return _RESPONSES["how does it work"]

    if "change" in text or "modify" in text:
        return _RESPONSES["how to change"]

    if "win" in text or "beat" in text:
        return _RESPONSES["how do i win"]

    if "next" in text or "now" in text:
        return _RESPONSES["next step"]

    return _RESPONSES["default"]
