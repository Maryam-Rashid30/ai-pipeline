import os
import schedule
import time

from stages.stage1_trigger import poll_jira, transition_to_in_progress, download_requirements
from stages.stage2_build import build_app
from stages.stage3_tests import run_tests
from stages.stage4_github import push_to_github
from stages.stage5_deploy import deploy_to_vercel
from stages.stage6_qa import run_qa
from stages.stage7_email import send_email
from stages.stage8_jira import close_jira


def run_pipeline():
    issues = poll_jira()

    for issue in issues:
        key = issue["key"]
        summary = issue["fields"]["summary"]
        print(f"\n{'=' * 60}")
        print(f"Processing: {key} - {summary}")
        print(f"{'=' * 60}")

        # Stage 1 — transition + download
        transition_to_in_progress(key)

        requirements = download_requirements(issue)
        if not requirements:
            close_jira(key, "FAIL", None, "No requirements.md attachment found on Jira story.")
            continue

        # Stage 2 — build
        build_app(key, requirements)
        if not os.path.exists(f"work/{key}/app/index.html"):
            print(f"Build failed for {key} — index.html not produced.")
            close_jira(key, "FAIL", None, "Build stage failed — index.html not produced by Claude.")
            continue

        # Stage 3 — tests
        run_tests(key, requirements)

        # Stage 4 — GitHub push + PR
        pushed = push_to_github(key, summary)
        if not pushed:
            print(f"GitHub push failed for {key}.")
            close_jira(key, "FAIL", None, "GitHub push failed.")
            continue

        # Stage 5 — Vercel deploy
        deploy_url = deploy_to_vercel(key)
        if not deploy_url:
            print(f"Vercel deploy failed for {key}.")
            close_jira(key, "FAIL", None, "Vercel deployment failed or timed out.")
            continue

        print(f"Live URL: {deploy_url}")

        # Stage 6 — QA
        qa_status, report_path, screenshots_folder = run_qa(key, deploy_url, requirements)

        # Stage 7 — email
        send_email(key, qa_status, report_path, screenshots_folder)

        # Stage 8 — close Jira
        with open(report_path) as f:
            report = f.read()
        close_jira(key, qa_status, deploy_url, report)


print("Pipeline started! Polling every 5 minutes...")
run_pipeline()
schedule.every(5).minutes.do(run_pipeline)

while True:
    schedule.run_pending()
    time.sleep(30)
