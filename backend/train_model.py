from backend.app.core.database import SessionLocal
from backend.app.ml.features import build_wallet_features, get_ml_features
from backend.app.ml.detector import WalletAnomalyDetector


MODEL_PATH = "models/wallet_anomaly_model.joblib"


def main():

    db = SessionLocal()

    try:
        print("Building wallet features...")

        wallet_df = build_wallet_features(db)

        print(f"Wallets analyzed: {len(wallet_df)}")

        features = get_ml_features(wallet_df)

        print("Training Isolation Forest...")

        detector = WalletAnomalyDetector()
        detector.fit(features)

        results = detector.predict(features)

        results["wallet_address"] = wallet_df[
            "wallet_address"
        ].values

        results = results.sort_values(
            "anomaly_score",
            ascending=False
        )

        detector.save(MODEL_PATH)

        print()
        print("========================================")
        print("TRACE-X ML TRAINING COMPLETE")
        print("========================================")
        print(f"Wallets analyzed : {len(results)}")
        print(
            f"Anomalies detected : "
            f"{(results['anomaly_label'] == -1).sum()}"
        )
        print(f"Model saved : {MODEL_PATH}")
        print()
        print("TOP 10 SUSPICIOUS WALLETS")
        print("========================================")

        print(
            results[
                [
                    "wallet_address",
                    "anomaly_score",
                    "transaction_count",
                    "source_ip_count",
                    "network_diversity",
                ]
            ].head(10).to_string(index=False)
        )

    finally:
        db.close()


if __name__ == "__main__":
    main()
