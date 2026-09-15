import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session


def build_wallet_features(db: Session) -> pd.DataFrame:

    query = text("""
        SELECT
            w.address AS wallet_address,
            w.transaction_count,
            w.total_received,
            w.total_sent,

            COUNT(DISTINCT ti.txid) AS input_tx_count,
            COUNT(DISTINCT too.txid) AS output_tx_count,

            COUNT(DISTINCT no.src_ip) AS source_ip_count,
            COUNT(DISTINCT no.dst_ip) AS destination_ip_count,

            COUNT(DISTINCT no.asn) AS asn_count,

            MIN(w.first_seen) AS first_seen,
            MAX(w.last_seen) AS last_seen

        FROM wallets w

        LEFT JOIN transaction_inputs ti
            ON w.address = ti.wallet_address

        LEFT JOIN transaction_outputs too
            ON w.address = too.wallet_address

        LEFT JOIN network_observations no
            ON no.txid IN (
                SELECT txid
                FROM transaction_inputs
                WHERE wallet_address = w.address

                UNION

                SELECT txid
                FROM transaction_outputs
                WHERE wallet_address = w.address
            )

        GROUP BY w.address
    """)

    df = pd.read_sql(query, db.bind)

    numeric_columns = [
        "transaction_count",
        "total_received",
        "total_sent",
        "input_tx_count",
        "output_tx_count",
        "source_ip_count",
        "destination_ip_count",
        "asn_count",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        ).fillna(0)

    # Transaction velocity
    df["tx_per_ip"] = (
        df["transaction_count"]
        / df["source_ip_count"].replace(0, 1)
    )

    # Flow imbalance
    df["flow_imbalance"] = (
        abs(
            df["total_received"]
            - df["total_sent"]
        )
        /
        (
            df["total_received"]
            + df["total_sent"]
            + 1e-9
        )
    )

    # Network diversity
    df["network_diversity"] = (
        df["source_ip_count"]
        + df["destination_ip_count"]
        + df["asn_count"]
    )

    return df


def get_ml_features(df: pd.DataFrame) -> pd.DataFrame:

    feature_columns = [
        "transaction_count",
        "total_received",
        "total_sent",
        "input_tx_count",
        "output_tx_count",
        "source_ip_count",
        "destination_ip_count",
        "asn_count",
        "tx_per_ip",
        "flow_imbalance",
        "network_diversity",
    ]

    return df[feature_columns].copy()