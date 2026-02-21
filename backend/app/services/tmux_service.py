import asyncio
import subprocess

SESSION_NAME = "guided_ai_coding"
TUTOR_PANE = f"{SESSION_NAME}:0.1"
STUDENT_PANE = f"{SESSION_NAME}:0.0"


def session_exists() -> bool:
    result = subprocess.run(
        ["tmux", "has-session", "-t", SESSION_NAME],
        capture_output=True,
    )
    return result.returncode == 0


def capture_pane(pane_target: str = TUTOR_PANE, lines: int = 100) -> str:
    result = subprocess.run(
        ["tmux", "capture-pane", "-t", pane_target, "-p", "-e", "-J", "-S", f"-{lines}"],
        capture_output=True,
        text=True,
    )
    return result.stdout


def send_keys(pane_target: str, text: str) -> None:
    import time
    subprocess.run(
        ["tmux", "send-keys", "-t", pane_target, text, "C-m"],
        check=True,
    )
    time.sleep(0.3)
    subprocess.run(
        ["tmux", "send-keys", "-t", pane_target, "C-m"],
        check=True,
    )


async def capture_pane_async(pane_target: str = TUTOR_PANE, lines: int = 100) -> str:
    proc = await asyncio.create_subprocess_exec(
        "tmux", "capture-pane", "-t", pane_target, "-p", "-e", "-J", "-S", f"-{lines}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    return stdout.decode()
