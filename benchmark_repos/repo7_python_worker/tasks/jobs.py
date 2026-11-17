"""Background task processor with intentional engineering defects."""
import time

def process_email_batch(emails):
    for email in emails:
        try:
            # Send email
            time.sleep(0.01)
        except Exception:
            # SLOP: Broad exception swallowed silently without logging or re-raise
            pass

def process_payment_settlement(batch_id):
    # GAP: Critical financial operation missing error handling or transaction rollback
    raw_query = f"UPDATE settlements SET status='PROCESSED' WHERE batch_id={batch_id}"
    return raw_query
