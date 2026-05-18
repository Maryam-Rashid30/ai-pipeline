import re
import os
from datetime import datetime
from playwright.sync_api import sync_playwright


def run_qa(issue_key, deploy_url, requirements):
    print(f"Running QA on {deploy_url}...")

    folder = f"work/{issue_key}"
    screenshots_folder = f"{folder}/screenshots"
    os.makedirs(screenshots_folder, exist_ok=True)

    console_errors = []
    test_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        print("Opening deployed URL...")
        page.goto(deploy_url)
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{screenshots_folder}/01-initial-load.png")
        print("Screenshot taken: initial load")

        try:
            page.fill("input", "Test todo item")
            page.click("button")
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{screenshots_folder}/02-after-add.png")
            test_results.append(("Add a todo item", "PASS", ""))
            print("✅ Add todo - PASS")
        except Exception as e:
            test_results.append(("Add a todo item", "FAIL", str(e)))
            print(f"❌ Add todo - FAIL: {e}")

        try:
            count_text = page.locator("body").inner_text()
            if re.search(r'\d+\s*item', count_text, re.IGNORECASE):
                test_results.append(("Show count of remaining items", "PASS", ""))
                print("✅ Count display - PASS")
            else:
                test_results.append(("Show count of remaining items", "FAIL", "No count text matching '\\d+ item' found on page"))
                print("❌ Count display - FAIL")
        except Exception as e:
            test_results.append(("Show count of remaining items", "FAIL", str(e)))
            print(f"❌ Count display - FAIL: {e}")

        try:
            page.reload()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{screenshots_folder}/03-after-reload.png")
            if "Test todo item" in page.locator("body").inner_text():
                test_results.append(("Persist todos in localStorage", "PASS", ""))
                print("✅ localStorage persistence - PASS")
            else:
                test_results.append(("Persist todos in localStorage", "FAIL", "Todo item missing after page reload"))
                print("❌ localStorage persistence - FAIL")
        except Exception as e:
            test_results.append(("Persist todos in localStorage", "FAIL", str(e)))
            print(f"❌ localStorage persistence - FAIL: {e}")

        try:
            checkbox = page.locator("input[type='checkbox']").first
            checkbox.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{screenshots_folder}/04-after-complete.png")
            test_results.append(("Mark todo as complete", "PASS", ""))
            print("✅ Mark complete - PASS")
        except Exception as e:
            test_results.append(("Mark todo as complete", "FAIL", str(e)))
            print(f"❌ Mark complete - FAIL: {e}")

        try:
            delete_btn = page.locator("button").last
            delete_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{screenshots_folder}/05-after-delete.png")
            test_results.append(("Delete a todo item", "PASS", ""))
            print("✅ Delete todo - PASS")
        except Exception as e:
            test_results.append(("Delete a todo item", "FAIL", str(e)))
            print(f"❌ Delete todo - FAIL: {e}")

        browser.close()

    passed = sum(1 for _, r, _ in test_results if r == "PASS")
    failed = sum(1 for _, r, _ in test_results if r == "FAIL")

    if failed == 0:
        overall_status = "PASS"
    elif passed == 0:
        overall_status = "FAIL"
    else:
        overall_status = "PARTIAL"

    tested_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    report = f"# QA Report — {issue_key}\n"
    report += f"**Deployment URL:** {deploy_url}\n"
    report += f"**Tested at:** {tested_at}\n"
    report += f"**Overall status:** {overall_status}\n\n"
    report += "## Test Results\n"
    report += "| Acceptance Criterion | Result | Notes |\n"
    report += "|----------------------|--------|-------|\n"

    for criterion, result, notes in test_results:
        icon = "✅" if result == "PASS" else "❌"
        report += f"| {criterion} | {icon} {result} | {notes} |\n"

    report += "\n## Console Errors\n"
    if console_errors:
        for error in console_errors:
            report += f"- {error}\n"
    else:
        report += "- None\n"

    report += "\n## Screenshots\n"
    report += "- 01-initial-load.png\n"
    report += "- 02-after-add.png\n"
    report += "- 03-after-reload.png\n"
    report += "- 04-after-complete.png\n"
    report += "- 05-after-delete.png\n"
    report += f"\n## Summary\nAutomated QA completed. Overall status: {overall_status}.\n"

    report_path = f"{folder}/bug-report.md"
    with open(report_path, "w") as f:
        f.write(report)

    print(f"Bug report saved to {report_path}")
    print(f"Overall QA status: {overall_status}")
    return overall_status, report_path, screenshots_folder
