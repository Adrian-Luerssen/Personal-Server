from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.models import Variable
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import requests
import base64

# Set up Spotify credentials

# Define the DAG default arguments
default_args: Dict[str, Any] = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": datetime(2023, 1, 1),
    "retries": 0,
    "retry_delay": timedelta(minutes=5),
}

def get_api_base() -> str:
    return Variable.get("BACKEND_API_BASE", default_var="http://backend:3000/api")





def refresh_tokens_for_all_users() -> None:
    """Trigger backend to refresh Spotify tokens for all users via a single endpoint.

    Calls POST {BACKEND_API_BASE}/spotify/refresh/all which performs token refresh
    and storage server-side.
    """
    base = get_api_base()
    headers = {"Content-Type": "application/json"}
    resp = requests.post(f"{base}/spotify/refreshAllTokens", headers=headers)
    if resp.ok:
        print(f"response: {resp.text}")
        print("Triggered backend refresh for all users")
    else:
        print("Failed to trigger backend refresh for all users:", resp.status_code, resp.text)

def fetch_all_streams() -> None:
    """Fetch all streams from the backend.

    Calls GET {BACKEND_API_BASE}/spotify/streams which retrieves all active streams.
    """
    base = get_api_base()
    headers = {"Content-Type": "application/json"}
    resp = requests.post(f"{base}/spotify/sync-streams-global", headers=headers)
    if resp.ok:
        print(f"response: {resp.text}")
        print("Triggered backend sync for all streams")
    else:
        print("Failed to trigger backend sync for all streams:", resp.status_code, resp.text)

# Define the DAG
with DAG(
    "refresh_user_tokens",
    default_args=default_args,
    description="Refreshes Spotify tokens for users as needed",
    schedule_interval="*/5 * * * *",  # Every 5 minutes
    catchup=False,
) as dag:

    refresh_tokens_task: PythonOperator = PythonOperator(
        task_id="refresh_tokens_for_all_users",
        python_callable=refresh_tokens_for_all_users,
    )
    
    fetch_streams_task: PythonOperator = PythonOperator(
        task_id="fetch_all_streams",
        python_callable=fetch_all_streams,
    )

    refresh_tokens_task >> fetch_streams_task
