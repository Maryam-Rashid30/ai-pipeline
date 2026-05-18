import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from config import GMAIL_USER, GMAIL_APP_PASSWORD


def send_email(issue_key, qa_status, report_path, screenshots_folder):
    print(f"Sending email report for {issue_key}...")

    with open(report_path, "r", encoding="utf-8") as f:
        report_content = f.read()

    report_content = report_content.encode("ascii", "ignore").decode("ascii")

    msg = MIMEMultipart()
    msg["From"] = GMAIL_USER
    msg["To"] = GMAIL_USER
    msg["Subject"] = f"QA Report - {issue_key} - {qa_status}"

    msg.attach(MIMEText(report_content, "plain"))

    for screenshot in sorted(os.listdir(screenshots_folder)):
        filepath = os.path.join(screenshots_folder, screenshot)
        with open(filepath, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename={screenshot}")
            msg.attach(part)

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_USER, GMAIL_USER, msg.as_bytes())
        server.quit()
        print(f"Email sent successfully to {GMAIL_USER}!")
    except Exception as e:
        print(f"Failed to send email: {e}")
