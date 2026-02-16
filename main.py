import sys
import os

# This ensures Python can find the files in your 'scripts' folder
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scripts.inventory_agent import InventoryAgent

def main():
    print("="*40)
    print("   WAREHOUSE AI AGENT INITIALIZED   ")
    print("="*40)
    
    # 1. Initialize the Agent
    agent = InventoryAgent()
    
    try:
        print("\n[Step 1]: Fetching compressed warehouse data...")
        # 2. Run the optimization logic
        agent.optimize_stock()
        
        print("\n[Status]: Agent cycle completed successfully.")
        
    except Exception as e:
        print(f"\n[Error]: The agent encountered a problem: {e}")
        print("Tip: Make sure your MySQL server is running and credentials in db_connection.py are correct.")

if __name__ == "__main__":
    main()