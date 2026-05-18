import subprocess


def run_tests(issue_key, requirements):
    print(f"Writing and running tests for {issue_key}...")

    folder = f"work/{issue_key}/app"

    prompt = f"""Look at the index.html file in this directory.
Write a Jest test file called app.test.js that tests every acceptance criterion in these requirements:

{requirements}

Use jest-environment-jsdom to test the HTML.
At the top of the test file add:
/**
 * @jest-environment jsdom
 */

After writing the tests, run them with: npx jest app.test.js --no-coverage
If any tests fail, fix the code in index.html and run the tests again.
Keep fixing and running until all tests pass.
Save the final test results to a file called test-results.txt
Do not ask questions. Just write, run, fix, and repeat until all tests pass.
"""

    print("Calling Claude Code to write and run tests...")
    result = subprocess.run(
        ["claude", "--dangerously-skip-permissions", "-p", prompt],
        cwd=folder,
        capture_output=True,
        text=True,
        timeout=600
    )

    if result.returncode == 0:
        print("Tests completed!")
    else:
        print("Tests failed!")
        print(result.stderr)
