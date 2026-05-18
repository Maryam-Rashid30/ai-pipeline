import time
import requests
from config import VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID, GITHUB_REPO_ID


def deploy_to_vercel(issue_key):
    print(f"Deploying {issue_key} to Vercel...")
    branch = f"feature/{issue_key}-ai-pipeline"

    headers = {
        "Authorization": f"Bearer {VERCEL_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "name": "ai-pipeline",
        "gitSource": {
            "type": "github",
            "repoId": GITHUB_REPO_ID,
            "ref": branch
        }
    }

    try:
        response = requests.post(
            f"https://api.vercel.com/v13/deployments?projectId={VERCEL_PROJECT_ID}&teamId={VERCEL_TEAM_ID}",
            headers=headers,
            json=payload,
            timeout=30
        )
    except requests.exceptions.RequestException as e:
        print(f"Network error triggering deployment: {e}")
        return None

    if response.status_code not in [200, 201]:
        print(f"Deployment failed: {response.status_code}")
        print(response.text)
        return None

    deployment = response.json()
    deployment_id = deployment.get("id")
    print(f"Deployment triggered! ID: {deployment_id}")

    print("Waiting for deployment to go live...")
    for _ in range(24):
        time.sleep(10)
        try:
            status_response = requests.get(
                f"https://api.vercel.com/v13/deployments/{deployment_id}",
                headers=headers,
                timeout=30
            )
        except requests.exceptions.RequestException as e:
            print(f"Network error polling deployment status: {e}")
            continue
        status = status_response.json().get("readyState")
        print(f"Deployment status: {status}")

        if status == "READY":
            url = status_response.json().get("url")
            live_url = f"https://{url}"
            print(f"Deployment live at: {live_url}")
            return live_url

        if status in ["ERROR", "CANCELED"]:
            print(f"Deployment failed with status: {status}")
            return None

    print("Deployment timed out after 4 minutes")
    return None
