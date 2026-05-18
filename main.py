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

W = 64  # box inner width

STAGES = {
    1: ("Trigger",    "Poll Jira for ai-ready stories, transition to In Progress, download requirements.md."),
    2: ("Build",      "Call Claude Code to read requirements and produce index.html."),
    3: ("Tests",      "Claude writes Jest tests, runs them, and fixes code until all pass."),
    4: ("GitHub",     "Init git repo, commit output, push branch, and open a Pull Request."),
    5: ("Deploy",     "Trigger a Vercel deployment from the branch and poll until the live URL is ready."),
    6: ("QA",         "Playwright opens the live URL and tests all 5 acceptance criteria."),
    7: ("Email",      "Send bug report and screenshots to the configured Gmail address."),
    8: ("Close Jira", "Transition story to Done or Bug Reported and post QA summary as a comment."),
}


def _ts():
    return datetime.utcnow().strftime("%H:%M:%S")


def _elapsed(since):
    s = int((datetime.utcnow() - since).total_seconds())
    return f"{s // 60:02d}:{s % 60:02d}"


def _box(lines):
    print(f"╔{'═' * W}╗")
    for line in lines:
        print(f"║  {line:<{W - 2}}║")
    print(f"╚{'═' * W}╝")


def log_issue_start(key, summary, started_at):
    print()
    _box([
        f"{key}  ·  {summary}",
        f"Started {started_at.strftime('%H:%M:%S')} UTC  ·  {len(STAGES)} stages",
    ])


def log_stage_start(n):
    name, desc = STAGES[n]
    bar = f"─── Stage {n}/{len(STAGES)}  ·  {name.upper()} "
    bar = bar + "─" * (W - len(bar))
    print(f"\n  {bar}")
    print(f"  │  {desc}")


def log_stage_done(n, since, note=""):
    suffix = f"  ·  {note}" if note else ""
    print(f"  └─  ✓  {_ts()}  +{_elapsed(since)}{suffix}")


def log_stage_failed(n, since, reason=""):
    suffix = f"  ·  {reason}" if reason else ""
    print(f"  └─  ✗  {_ts()}  +{_elapsed(since)}{suffix}")


def log_issue_done(key, status, pipeline_start):
    icon = "✓" if status == "PASS" else ("~" if status == "PARTIAL" else "✗")
    elapsed = _elapsed(pipeline_start)
    print()
    _box([
        f"{icon}  {key} complete  ·  Status: {status}  ·  Total time: {elapsed}",
    ])
    print()


def run_pipeline():
    issues = poll_jira()

    for issue in issues:
        key = issue["key"]
        summary = issue["fields"]["summary"]
        pipeline_start = datetime.utcnow()

        log_issue_start(key, summary, pipeline_start)

        # ── Stage 1 · Trigger ──────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(1)
        transition_to_in_progress(key)
        requirements = download_requirements(issue)
        if not requirements:
            log_stage_failed(1, t, "no requirements.md attachment found")
            close_jira(key, "FAIL", None, "No requirements.md attachment found.")
            log_issue_done(key, "FAIL", pipeline_start)
            continue
        log_stage_done(1, t)

        # ── Stage 2 · Build ────────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(2)
        build_app(key, requirements)
        if not os.path.exists(f"work/{key}/app/index.html"):
            log_stage_failed(2, t, "index.html not produced by Claude")
            close_jira(key, "FAIL", None, "Build failed — index.html not produced.")
            log_issue_done(key, "FAIL", pipeline_start)
            continue
        log_stage_done(2, t)

        # ── Stage 3 · Tests ────────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(3)
        run_tests(key, requirements)
        log_stage_done(3, t)

        # ── Stage 4 · GitHub ───────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(4)
        pushed = push_to_github(key, summary)
        if not pushed:
            log_stage_failed(4, t, "git push failed")
            close_jira(key, "FAIL", None, "GitHub push failed.")
            log_issue_done(key, "FAIL", pipeline_start)
            continue
        log_stage_done(4, t)

        # ── Stage 5 · Deploy ───────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(5)
        deploy_url = deploy_to_vercel(key)
        if not deploy_url:
            log_stage_failed(5, t, "deployment failed or timed out")
            close_jira(key, "FAIL", None, "Vercel deployment failed or timed out.")
            log_issue_done(key, "FAIL", pipeline_start)
            continue
        log_stage_done(5, t, deploy_url)

        # ── Stage 6 · QA ───────────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(6)
        qa_status, report_path, screenshots_folder = run_qa(key, deploy_url, requirements)
        log_stage_done(6, t, f"result: {qa_status}")

        # ── Stage 7 · Email ────────────────────────────────────────
        t = datetime.utcnow(); log_stage_start(7)
        send_email(key, qa_status, report_path, screenshots_folder)
        log_stage_done(7, t)

        # ── Stage 8 · Close Jira ───────────────────────────────────
        t = datetime.utcnow(); log_stage_start(8)
        with open(report_path) as f:
            report = f.read()
        close_jira(key, qa_status, deploy_url, report)
        log_stage_done(8, t)

        log_issue_done(key, qa_status, pipeline_start)


print("Pipeline started! Polling every 5 minutes...")
run_pipeline()
schedule.every(5).minutes.do(run_pipeline)

while True:
    schedule.run_pending()
    time.sleep(30)
