import os
import requests
from config import JIRA_SITE, JIRA_PROJECT_KEY, AUTH, HEADERS


def poll_jira():
    print("Polling Jira for new stories...")
    url = f"https://{JIRA_SITE}/rest/api/3/search/jql"
    params = {
        "jql": f'project = {JIRA_PROJECT_KEY} AND labels = "ai-ready" AND status = "To Do"',
        "fields": "summary,status,labels,attachment"
    }
    response = requests.get(url, headers=HEADERS, auth=AUTH, params=params)

    if response.status_code != 200:
        print(f"Error connecting to Jira: {response.status_code}")
        print(response.text)
        return []

    issues = response.json().get("issues", [])

    if not issues:
        print("No new stories found.")
        return []

    print(f"Found {len(issues)} new story/stories!")
    return issues


def transition_to_in_progress(issue_key):
    print(f"Transitioning {issue_key} to In Progress...")
    url = f"https://{JIRA_SITE}/rest/api/3/issue/{issue_key}/transitions"
    response = requests.get(url, headers=HEADERS, auth=AUTH)
    transitions = response.json().get("transitions", [])

    transition_id = None
    for t in transitions:
        if t["name"].lower() == "in progress":
            transition_id = t["id"]
            break

    if not transition_id:
        print(f"Could not find In Progress transition for {issue_key}")
        return

    requests.post(
        url,
        headers={**HEADERS, "Content-Type": "application/json"},
        auth=AUTH,
        json={"transition": {"id": transition_id}}
    )
    print(f"{issue_key} moved to In Progress!")


def download_requirements(issue):
    key = issue["key"]
    attachments = issue["fields"].get("attachment", [])

    if not attachments:
        print(f"No attachments found on {key}")
        return None

    for attachment in attachments:
        if attachment["filename"] == "requirements.md":
            print(f"Downloading requirements.md from {key}...")
            url = attachment["content"]
            response = requests.get(url, auth=AUTH)

            folder = f"work/{key}"
            os.makedirs(folder, exist_ok=True)

            filepath = f"{folder}/requirements.md"
            with open(filepath, "w") as f:
                f.write(response.text)

            print(f"Saved to {filepath}")
            return response.text

    print(f"No requirements.md found in attachments of {key}")
    return None
