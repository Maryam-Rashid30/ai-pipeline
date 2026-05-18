import os
import subprocess


def build_app(issue_key, requirements):
    print(f"Building app for {issue_key}...")

    folder = f"work/{issue_key}/app"
    os.makedirs(folder, exist_ok=True)

    prompt = f"""Read the following requirements and build the web app described.
Do not ask any questions. Make all decisions yourself and build it completely.
Save the output as index.html in the current directory.

Requirements:
{requirements}
"""

    print("Calling Claude Code to build the app...")
    result = subprocess.run(
        ["claude", "--dangerously-skip-permissions", "-p", prompt],
        cwd=folder,
        capture_output=True,
        text=True,
        timeout=600
    )

    if result.returncode == 0:
        print("App built successfully!")
    else:
        print("Build failed!")
        print(result.stderr)
