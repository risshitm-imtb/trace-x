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


def main():

    db = SessionLocal()

    try:

        print("Loading wallet intelligence...")

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

        print()
        print("========================================")
        print("TRACE-X INVESTIGATIVE ALERTS")
        print("========================================")

        alerts = results[
            results["risk_score"] >= 60
        ]

        print(f"Total wallets     : {len(results)}")
        print(f"High-risk alerts  : {len(alerts)}")
        print()

        for rank, (_, row) in enumerate(
            alerts.head(15).iterrows(),
            start=1
        ):

            print(
                f"[{rank:02d}] "
                f"{row['wallet_address']}"
            )

            print(
                f"     Risk       : "
                f"{row['risk_score']:.2f}/100"
            )

            print(
                f"     Confidence : "
                f"{row['confidence']:.2f}%"
            )

            print(
                f"     Anomaly    : "
                f"{row['anomaly_score']:.4f}"
            )

            print(
                f"     Evidence   : "
                f"{row['explanation']}"
            )

            print()

    finally:
        db.close()


if __name__ == "__main__":
    main()
