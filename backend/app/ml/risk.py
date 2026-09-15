import pandas as pd


def calculate_risk_scores(df: pd.DataFrame) -> pd.DataFrame:

    result = df.copy()

    # Normalize anomaly score to 0-100
    anomaly_min = result["anomaly_score"].min()
    anomaly_max = result["anomaly_score"].max()

    if anomaly_max > anomaly_min:
        result["anomaly_component"] = (
            (result["anomaly_score"] - anomaly_min)
            / (anomaly_max - anomaly_min)
            * 100
        )
    else:
        result["anomaly_component"] = 0

    # Behavioral components
    velocity_component = (
        result["tx_per_ip"]
        .rank(pct=True)
        * 100
    )

    network_component = (
        result["network_diversity"]
        .rank(pct=True)
        * 100
    )

    flow_component = (
        result["flow_imbalance"]
        .rank(pct=True)
        * 100
    )

    # Composite risk score
    result["risk_score"] = (
        result["anomaly_component"] * 0.50
        + velocity_component * 0.20
        + network_component * 0.15
        + flow_component * 0.15
    )

    result["risk_score"] = (
        result["risk_score"]
        .clip(0, 100)
        .round(2)
    )

    # Confidence based on agreement between signals
    result["confidence"] = (
        (
            result["anomaly_component"]
            + velocity_component
            + network_component
        )
        / 3
    ).round(2)

    return result


def generate_explanation(row) -> str:

    reasons = []

    if row["anomaly_label"] == -1:
        reasons.append(
            "ML model identified anomalous wallet behavior"
        )

    if row["tx_per_ip"] > 10:
        reasons.append(
            "high transaction velocity per source IP"
        )

    if row["network_diversity"] >= 6:
        reasons.append(
            "unusually diverse network infrastructure"
        )

    if row["flow_imbalance"] < 0.25:
        reasons.append(
            "balanced incoming and outgoing value flow"
        )

    if not reasons:
        reasons.append(
            "behavior differs from the learned baseline"
        )

    return "; ".join(reasons)
