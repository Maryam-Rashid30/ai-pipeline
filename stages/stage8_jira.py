import requests
from config import JIRA_SITE, AUTH, HEADERS


def close_jira(issue_key, qa_status, deploy_url, report):
    print(f"Closing Jira story {issue_key}...")
    url = f"https://{JIRA_SITE}/rest/api/3/issue/{issue_key}/transitions"
    response = requests.get(url, headers=HEADERS, auth=AUTH)
    transitions = response.json().get("transitions", [])

    # PASS → Done; FAIL/PARTIAL → Bug Reported, then In Review, then Done as last resort
    if qa_status == "PASS":
        priority = ["done"]
    else:
        priority = ["bug reported", "in review", "done"]

    transition_id = None
    for target in priority:
        for t in transitions:
            if t["name"].lower() == target:
                transition_id = t["id"]
                break
        if transition_id:
            break

    if transition_id:
        requests.post(
            url,
            headers={**HEADERS, "Content-Type": "application/json"},
            auth=AUTH,
            json={"transition": {"id": transition_id}}
        )
        print(f"{issue_key} transitioned successfully!")
    else:
        print(f"Could not find a closing transition for {issue_key} — available: {[t['name'] for t in transitions]}")

    deployment_info = deploy_url or "No deployment URL"
    comment_text = f"Pipeline completed!\nDeployment: {deployment_info}\nQA Status: {qa_status}"
    if report:
        comment_text += f"\n\n{report[:2000]}"

    requests.post(
        f"https://{JIRA_SITE}/rest/api/3/issue/{issue_key}/comment",
        headers={**HEADERS, "Content-Type": "application/json"},
        auth=AUTH,
        json={"body": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": comment_text}]}]}}
    )
    print(f"Comment added to {issue_key}!")
