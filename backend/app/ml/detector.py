import joblib
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class WalletAnomalyDetector:

    def __init__(self):
        self.scaler = StandardScaler()

        self.model = IsolationForest(
            n_estimators=300,
            contamination=0.08,
            random_state=42,
            n_jobs=-1
        )

    def fit(self, features: pd.DataFrame):
        scaled = self.scaler.fit_transform(features)
        self.model.fit(scaled)
        return self

    def predict(self, features: pd.DataFrame):
        scaled = self.scaler.transform(features)

        predictions = self.model.predict(scaled)
        scores = self.model.decision_function(scaled)

        result = features.copy()
        result["anomaly_label"] = predictions
        result["anomaly_score"] = -scores

        return result

    def save(self, path: str):
        joblib.dump(
            {
                "model": self.model,
                "scaler": self.scaler,
            },
            path
        )

    def load(self, path: str):
        artifact = joblib.load(path)

        self.model = artifact["model"]
        self.scaler = artifact["scaler"]

        return self
