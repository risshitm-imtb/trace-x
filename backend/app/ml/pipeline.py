from backend.app.core.database import SessionLocal
from backend.app.ml.features import (
    build_wallet_features,
    get_ml_features,
)
from backend.app.ml.detector import WalletAnomalyDetector
from backend.app.ml.risk import (
    calculate_risk_scores,
    generate_explanation,
)


MODEL_PATH = "models/wallet_anomaly_model.joblib"


def run_detection():

    db = SessionLocal()

    try:

        wallet_df = build_wallet_features(db)

        features = get_ml_features(wallet_df)

        detector = WalletAnomalyDetector()
        detector.load(MODEL_PATH)

        results = detector.predict(features)

        results["wallet_address"] = wallet_df[
            "wallet_address"
        ].values

        results = calculate_risk_scores(results)

        results["explanation"] = results.apply(
            generate_explanation,
            axis=1
        )

        results = results.sort_values(
            "risk_score",
            ascending=False
        )

        return results

    finally:
        db.close()
