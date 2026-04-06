import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_crud():
    print("--- Testing THETA API ---")
    
    # 1. Create a task
    payload = {
        "title": "Verificação de Sistema THETA",
        "category": "Software",
        "description": "Tarefa de teste automatizado para validar o motor de prioridade.",
        "status": "todo"
    }
    res = requests.post(f"{BASE_URL}/tasks/", json=payload)
    task = res.json()
    task_id = task['id']
    print(f"Created Task: {task_id} - {task['title']}")
    
    # 2. Calibrate
    calibrate_payload = {"urgency": 5, "effort": 1}
    res = requests.put(f"{BASE_URL}/tasks/{task_id}/calibrate", json=calibrate_payload)
    task = res.json()
    print(f"Calibrated Task Score: {task['priority_score']} (Expected high score)")
    
    # 3. Update Status (Optimistic check)
    res = requests.put(f"{BASE_URL}/tasks/{task_id}", json={"status": "in_progress"})
    task = res.json()
    print(f"Updated Status: {task['status']}, Score: {task['priority_score']}")
    
    # 4. Get Tasks with Context
    res = requests.get(f"{BASE_URL}/tasks/?current_context=intervalo")
    tasks = res.json()
    # Check if our task gets a boost (Software in Intervalo should be * 2)
    our_task = next((t for t in tasks if t['id'] == task_id), None)
    if our_task:
        print(f"Boosted Score (Intervalo): {our_task['priority_score']}")
    
    # 5. Cleanup
    requests.delete(f"{BASE_URL}/tasks/{task_id}")
    print(f"Deleted Task: {task_id}")

if __name__ == "__main__":
    try:
        test_crud()
    except Exception as e:
        print(f"Error: {e}")
