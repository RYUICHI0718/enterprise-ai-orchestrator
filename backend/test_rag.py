import requests
import json

BASE_URL = "http://localhost:8000/api/chat"

def test_chat(message):
    print(f"\n--- Testing: {message} ---")
    try:
        response = requests.post(
            BASE_URL,
            json={"messages": [{"role": "user", "content": message}]}
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Answer: {data.get('content')}")
            if data.get('options'):
                print(f"Options: {data.get('options')}")
            if data.get('related_questions'):
                print(f"Related: {data.get('related_questions')}")
            return data
        else:
            print(f"Error: {response.text}")
            return None

    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    # Test 1: Exact Match
    test_chat("マンションすまい・る債とはどのようなものですか。")
    
    # Test 2: Fuzzy Match / Keyword
    test_chat("繰上返済はできますか") 
    
    # Test 3: Ambiguity Check (Short query that might hit multiple)
    test_chat("金利について") # Should hit 'Green Reform Loan Interest' or 'Reverse 60 Interest' etc.
