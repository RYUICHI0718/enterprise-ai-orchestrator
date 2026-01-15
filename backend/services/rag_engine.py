import json
import os
from typing import List, Dict, Optional, Tuple, Any
from rapidfuzz import process, fuzz

class RagEngine:
    def __init__(self, faq_path: str = None, synonyms_path: str = None):
        # Resolve paths relative to this file (backend/services/rag_engine.py)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # points to backend/
        
        if faq_path is None:
            faq_path = os.path.join(base_dir, "data", "faq.json")
        if synonyms_path is None:
            synonyms_path = os.path.join(base_dir, "data", "synonyms.json")
            
        self.faq_data = self._load_json(faq_path)
        self.synonyms = self._load_json(synonyms_path)
        
        # Pre-process FAQ questions for search
        self.faq_questions = [item["question"] for item in self.faq_data]
    
    def _load_json(self, path: str) -> Any:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {path}: {e}")
            return [] if "faq" in path else {}

    def normalize_query(self, query: str) -> str:
        """Replace known synonyms in the query."""
        normalized = query.lower()
        for key, value in self.synonyms.items():
            if key in normalized:
                normalized = normalized.replace(key, value)
        return normalized

    def search(self, query: str, threshold: int = 60) -> Dict[str, Any]:
        """
        Search for the best FAQ match.
        Returns a dict with 'answer', 'options' (if ambiguous), and 'related' question suggestions.
        """
        normalized_query = self.normalize_query(query)
        
        # Get top 3 matches
        results = process.extract(
            normalized_query, 
            self.faq_questions, 
            scorer=fuzz.token_sort_ratio,
            limit=3
        )
        
        # results structure: [(match_text, score, index), ...]
        
        if not results:
            return {"answer": None, "options": [], "related": []}

        best_match_text, best_score, best_index = results[0]
        
        print(f"Query: {query} -> Norm: {normalized_query}")
        print(f"Top Match: {best_match_text} ({best_score})")

        # 1. High Confidence Match
        if best_score >= 80:
            return {
                "answer": self.faq_data[best_index]["answer"],
                "options": [],
                # Suggest the next best hits as related questions
                "related": [res[0] for res in results[1:]] 
            }
            
        # 2. Ambiguity / Medium Confidence (60-79)
        # OR if the gap between first and second is small (e.g. < 10 points)
        if best_score >= threshold:
            # Check for close contenders
            candidates = [best_match_text]
            for i in range(1, len(results)):
                text, score, idx = results[i]
                if best_score - score < 15: # If score is close to best
                    candidates.append(text)
            
            if len(candidates) > 1:
                return {
                    "answer": "ご質問の意図は以下のどれに近いですか？選択してください。",
                    "options": candidates,
                    "related": []
                }
            else:
                 return {
                    "answer": self.faq_data[best_index]["answer"],
                    "options": [],
                    "related": [res[0] for res in results[1:]] 
                }

        # 3. No Good Match (Low Confidence)
        return {
            "answer": None, 
            "options": [],
            "related": [] 
        }

if __name__ == "__main__":
    # Simple test
    engine = RagEngine()
    print(engine.search("ネットがつながらない"))
