from datetime import datetime, timezone

# Simulation of the NEW line 52 and sorting in tasks.py
class MockTask:
    def __init__(self, priority_score, urgency, effort, category, last_activity_at):
        self.priority_score = priority_score
        self.urgency = urgency
        self.effort = effort
        self.category = category
        self.last_activity_at = last_activity_at
        self.due_date = None

tasks = [
    MockTask(None, 5, 2, "Pesquisa", datetime.now()), # This task was crashing
    MockTask(1.0, 3, 1, "Software", None)
]

def get_tasks_mock(tasks, current_context):
    try:
        now_utc = datetime.now(timezone.utc)
        for task in tasks:
            base_score = (task.urgency or 0) / (task.effort or 1)
            
            if task.category and "pesquisa" in task.category.lower():
                last_act = task.last_activity_at
                if last_act:
                    if last_act.tzinfo is None:
                        last_act = last_act.replace(tzinfo=timezone.utc)
                    days_idle = (now_utc - last_act).days
                    if days_idle > 0:
                        base_score += (days_idle * 1.5)
            
            if current_context == "intervalo" and task.category and "software" in task.category.lower():
                base_score *= 2.0
            
            # THE FIX:
            current_score = task.priority_score if task.priority_score is not None else 0.0
            task._temp_score = round(current_score + base_score, 4)
            print(f"Task calculated score: {task._temp_score}")

        def sort_key(t):
            score = getattr(t, "_temp_score", 0.0)
            return (-score, float('inf'))

        tasks.sort(key=sort_key)
        print("Sorting successful!")
        
    except Exception as e:
        print(f"CRASHED: {e}")

print("Testing FIX with NULL priority_score...")
get_tasks_mock(tasks, "aula")
