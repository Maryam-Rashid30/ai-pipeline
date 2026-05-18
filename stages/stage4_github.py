import subprocess
from github import Github
from config import JIRA_EMAIL, GITHUB_USERNAME, GITHUB_TOKEN, GITHUB_REPO


def push_to_github(issue_key, summary):
    print(f"Pushing {issue_key} to GitHub...")

    folder = f"work/{issue_key}/app"
    branch = f"feature/{issue_key}-ai-pipeline"

    commands = [
        ["git", "init"],
        ["git", "config", "user.email", JIRA_EMAIL],
        ["git", "config", "user.name", GITHUB_USERNAME],
        ["git", "checkout", "-B", branch],
        ["git", "add", "."],
        ["git", "commit", "-m", f"feat: {issue_key} - {summary}"],
        ["git", "push", "-f", f"https://{GITHUB_TOKEN}@github.com/{GITHUB_USERNAME}/{GITHUB_REPO}.git", branch],
    ]

    for cmd in commands:
        result = subprocess.run(cmd, cwd=folder, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Git command failed: {' '.join(cmd)}")
            print(result.stderr)
            return False

    print(f"Pushed to GitHub branch: {branch}")

    print("Opening Pull Request...")
    g = Github(GITHUB_TOKEN)
    repo = g.get_repo(f"{GITHUB_USERNAME}/{GITHUB_REPO}")

    try:
        repo.create_pull(
            title=f"{issue_key} - {summary}",
            body=f"Automated PR for Jira story {issue_key}\n\nBuilt and tested automatically by the AI pipeline.",
            head=branch,
            base="main"
        )
        print("Pull Request opened successfully!")
    except Exception as e:
        print(f"Could not open PR: {e}")

    return True
