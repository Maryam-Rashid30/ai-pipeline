import os
import schedule
import time
from datetime import datetime

from stages.stage1_trigger import poll_jira, transition_to_in_progress, download_requirements
from stages.stage2_build import build_app
from stages.stage3_tests import run_tests
from stages.stage4_github import push_to_github
from stages.stage5_deploy import deploy_to_vercel
from stages.stage6_qa import run_qa
from stages.stage7_email import send_email
from stages.stage8_jira import close_jira

TOTAL_STAGES = 8


def log_stage_start(n, name):
    ts = datetime.utcnow().strftime("%H:%M:%S")
    print(f"\n[{ts}] ┌─ Stage {n}/{TOTAL_STAGES} · {name} — starting")


def log_stage_done(n, name):
    ts = datetime.utcnow().strftime("%H:%M:%S")
    print(f"[{ts}] └─ Stage {n}/{TOTAL_STAGES} · {name} — done ✓")


def log_stage_failed(n, name, reason=""):
    ts = datetime.utcnow().strftime("%H:%M:%S")
    suffix = f": {reason}" if reason else ""
    print(f"[{ts}] └─ Stage {n}/{TOTAL_STAGES} · {name} — FAILED ✗{suffix}")


def run_pipeline():
    issues = poll_jira()

    for issue in issues:
        key = issue["key"]
        summary = issue["fields"]["summary"]
        print(f"\n{'=' * 60}")
        print(f"  {key} — {summary}")
        print(f"{'=' * 60}")

        # Stage 1 — Trigger
        log_stage_start(1, "Trigger")
        transition_to_in_progress(key)
        requirements = download_requirements(issue)
        if not requirements:
            log_stage_failed(1, "Trigger", "no requirements.md attachment")
            close_jira(key, "FAIL", None, "No requirements.md attachment found on Jira story.")
            continue
        log_stage_done(1, "Trigger")

        # Stage 2 — Build
        log_stage_start(2, "Build")
        build_app(key, requirements)
        if not os.path.exists(f"work/{key}/app/index.html"):
            log_stage_failed(2, "Build", "index.html not produced")
            close_jira(key, "FAIL", None, "Build stage failed — index.html not produced by Claude.")
            continue
        log_stage_done(2, "Build")

        # Stage 3 — Tests
        log_stage_start(3, "Tests")
        run_tests(key, requirements)
        log_stage_done(3, "Tests")

        # Stage 4 — GitHub
        log_stage_start(4, "GitHub")
        pushed = push_to_github(key, summary)
        if not pushed:
            log_stage_failed(4, "GitHub", "push failed")
            close_jira(key, "FAIL", None, "GitHub push failed.")
            continue
        log_stage_done(4, "GitHub")

        # Stage 5 — Deploy
        log_stage_start(5, "Deploy")
        deploy_url = deploy_to_vercel(key)
        if not deploy_url:
            log_stage_failed(5, "Deploy", "Vercel deployment failed or timed out")
            close_jira(key, "FAIL", None, "Vercel deployment failed or timed out.")
            continue
        log_stage_done(5, "Deploy")
        print(f"         Live URL: {deploy_url}")

        # Stage 6 — QA
        log_stage_start(6, "QA")
        qa_status, report_path, screenshots_folder = run_qa(key, deploy_url, requirements)
        log_stage_done(6, "QA")
        print(f"         QA result: {qa_status}")

        # Stage 7 — Email
        log_stage_start(7, "Email")
        send_email(key, qa_status, report_path, screenshots_folder)
        log_stage_done(7, "Email")

        # Stage 8 — Close Jira
        log_stage_start(8, "Close Jira")
        with open(report_path) as f:
            report = f.read()
        close_jira(key, qa_status, deploy_url, report)
        log_stage_done(8, "Close Jira")


print("Pipeline started! Polling every 5 minutes...")
run_pipeline()
schedule.every(5).minutes.do(run_pipeline)

while True:
    schedule.run_pending()
    time.sleep(30)
