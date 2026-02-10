from dataclasses import dataclass, field

from app.templates.tic_tac_toe import TIC_TAC_TOE_HTML


@dataclass
class CommandResponse:
    output: str
    secondary: str | None = None
    app_content: str | None = None


def execute_command(command: str) -> CommandResponse:
    cmd = command.strip().lower()

    # Help
    if cmd in ("help", ""):
        return CommandResponse(
            output="Available commands:",
            secondary=(
                "mkdir <folder>  - Create a folder\n"
                "cd <folder>     - Enter folder\n"
                "touch <file>    - Create file\n"
                "ls              - List files\n"
                "run             - Run the app"
            ),
        )

    # Create folder
    if cmd.startswith("mkdir "):
        folder_name = cmd.removeprefix("mkdir ").strip()
        return CommandResponse(output=f"Created folder: {folder_name}/")

    # Create file
    if cmd.startswith("touch "):
        file_name = cmd.removeprefix("touch ").strip()
        return CommandResponse(output=f"Created file: {file_name}")

    # Change directory
    if cmd.startswith("cd "):
        folder_name = cmd.removeprefix("cd ").strip()
        if folder_name in ("game", "."):
            label = "root" if folder_name == "." else folder_name
            return CommandResponse(output=f"Entered: {label}")
        return CommandResponse(output=f"bash: cd: {folder_name}: No such file or directory")

    # List files
    if cmd in ("ls", "ls -la"):
        return CommandResponse(output="game/\nindex.html\nstyle.css\nscript.js")

    # Run app
    if cmd in ("run", "npm start", "npm run dev"):
        return CommandResponse(
            output="\u2713 Compiled successfully",
            secondary="App is running on http://localhost:3000",
            app_content=TIC_TAC_TOE_HTML,
        )

    # Scaffold game template
    if any(kw in cmd for kw in ("scaffold", "create-app", "generate")):
        return CommandResponse(
            output="\u2713 Game scaffolded successfully",
            secondary="Created: index.html, style.css, script.js",
            app_content=TIC_TAC_TOE_HTML,
        )

    # Start dev server
    if cmd in ("start", "npm run start"):
        return CommandResponse(
            output="\u2713 Development server started",
            secondary="App running on http://localhost:3000",
            app_content=TIC_TAC_TOE_HTML,
        )

    # Build command
    if cmd in ("build", "npm run build"):
        return CommandResponse(
            output="\u2713 Build completed successfully",
            secondary="Ready to deploy",
        )

    # Clear screen
    if cmd in ("clear", "cls"):
        return CommandResponse(output="")

    # Version info
    if cmd in ("version", "--version", "-v"):
        return CommandResponse(output="Claude Code v1.0.0 - AI Software Builder")

    # Default: unknown command
    return CommandResponse(output=f"bash: {command}: command not found")
