from fastapi import APIRouter, HTTPException

from backend.app.core.database import SessionLocal
from backend.app.ml.pipeline import run_detection


router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "operational",
        "system": "Trace-X"
    }


@router.get("/overview")
def get_overview():

    results = run_detection()

    high_risk = results[
        results["risk_score"] >= 60
    ]

    return {
        "wallets": len(results),
        "high_risk_alerts": len(high_risk),
        "anomalies": int(
            (results["anomaly_label"] == -1).sum()
        ),
        "average_risk": round(
            float(results["risk_score"].mean()),
            2
        ),
        "max_risk": round(
            float(results["risk_score"].max()),
            2
        )
    }


@router.get("/alerts")
def get_alerts():

    results = run_detection()

    alerts = results[
        results["risk_score"] >= 60
    ].sort_values(
        "risk_score",
        ascending=False
    )

    return {
        "total_wallets": len(results),
        "high_risk_alerts": len(alerts),
        "alerts": alerts[
            [
                "wallet_address",
                "risk_score",
                "confidence",
                "anomaly_score",
                "transaction_count",
                "source_ip_count",
                "network_diversity",
                "flow_imbalance",
                "explanation",
            ]
        ].to_dict(orient="records")
    }


@router.get("/wallets")
def get_wallets():

    from sqlalchemy import text

    results = run_detection()

    db = SessionLocal()

    try:
        wallet_rows = db.execute(
            text("""
                SELECT
                    address,
                    first_seen,
                    last_seen,
                    transaction_count,
                    total_received,
                    total_sent
                FROM wallets
            """)
        ).mappings().all()

        wallet_meta = {
            row["address"]: row
            for row in wallet_rows
        }

        wallets = []

        for row in results.to_dict(orient="records"):

            address = row.get("wallet_address")
            meta = wallet_meta.get(address, {})

            wallets.append({
                "wallet_address": address,
                "risk_score": round(float(row.get("risk_score", 0) or 0), 2),
                "confidence": round(float(row.get("confidence", 0) or 0), 2),
                "anomaly_score": float(row.get("anomaly_score", 0) or 0),
                "anomaly_label": int(row.get("anomaly_label", 0) or 0),
                "transaction_count": int(
                    meta.get("transaction_count")
                    or row.get("transaction_count")
                    or 0
                ),
                "total_received": float(
                    meta.get("total_received")
                    or row.get("total_received")
                    or 0
                ),
                "total_sent": float(
                    meta.get("total_sent")
                    or row.get("total_sent")
                    or 0
                ),
                "network_diversity": int(row.get("network_diversity", 0) or 0),
                "source_ip_count": int(row.get("source_ip_count", 0) or 0),
                "destination_ip_count": int(row.get("destination_ip_count", 0) or 0),
                "flow_imbalance": float(row.get("flow_imbalance", 0) or 0),
                "tx_per_ip": float(row.get("tx_per_ip", 0) or 0),
                "first_seen": (
                    str(meta.get("first_seen"))
                    if meta.get("first_seen")
                    else None
                ),
                "last_seen": (
                    str(meta.get("last_seen"))
                    if meta.get("last_seen")
                    else None
                ),
                "explanation": row.get("explanation", "")
            })

        return {
            "total_wallets": len(wallets),
            "wallets": wallets
        }

    finally:
        db.close()


@router.get("/wallet/{wallet_address}")
def get_wallet(wallet_address: str):

    from sqlalchemy import text

    results = run_detection()

    wallet_result = results[
        results["wallet_address"] == wallet_address
    ]

    if wallet_result.empty:
        raise HTTPException(
            status_code=404,
            detail="Wallet not found"
        )

    row = wallet_result.iloc[0].to_dict()

    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # WALLET CORE DATA
        # ---------------------------------------------------------
        wallet = db.execute(
            text("""
                SELECT
                    address,
                    first_seen,
                    last_seen,
                    transaction_count,
                    total_received,
                    total_sent
                FROM wallets
                WHERE address = :address
            """),
            {"address": wallet_address}
        ).mappings().first()

        if not wallet:
            raise HTTPException(
                status_code=404,
                detail="Wallet not found"
            )

        # ---------------------------------------------------------
        # TRANSACTIONS CONNECTED TO WALLET
        # ---------------------------------------------------------
        transactions = db.execute(
            text("""
                SELECT DISTINCT
                    t.txid,
                    t.timestamp,
                    t.fee,
                    t.script_type
                FROM transactions t
                JOIN (
                    SELECT txid
                    FROM transaction_inputs
                    WHERE wallet_address = :address

                    UNION

                    SELECT txid
                    FROM transaction_outputs
                    WHERE wallet_address = :address
                ) x ON x.txid = t.txid
                ORDER BY t.timestamp DESC
                LIMIT 25
            """),
            {"address": wallet_address}
        ).mappings().all()

        # ---------------------------------------------------------
        # CONNECTED IP / NETWORK INTELLIGENCE
        # ---------------------------------------------------------
        observations = db.execute(
            text("""
                SELECT
                    timestamp,
                    src_ip,
                    dst_ip,
                    src_port,
                    dst_port,
                    geo_country,
                    asn,
                    txid
                FROM network_observations
                WHERE txid IN (
                    SELECT txid
                    FROM transaction_inputs
                    WHERE wallet_address = :address

                    UNION

                    SELECT txid
                    FROM transaction_outputs
                    WHERE wallet_address = :address
                )
                ORDER BY timestamp DESC
                LIMIT 100
            """),
            {"address": wallet_address}
        ).mappings().all()

        source_ips = sorted({
            item["src_ip"]
            for item in observations
            if item["src_ip"]
        })

        destination_ips = sorted({
            item["dst_ip"]
            for item in observations
            if item["dst_ip"]
        })

        countries = sorted({
            item["geo_country"]
            for item in observations
            if item["geo_country"]
        })

        asns = sorted({
            item["asn"]
            for item in observations
            if item["asn"]
        })

        # ---------------------------------------------------------
        # TRANSACTION DETAILS
        # ---------------------------------------------------------
        transaction_details = []

        for tx in transactions:

            txid = tx["txid"]

            inputs = db.execute(
                text("""
                    SELECT
                        wallet_address,
                        amount
                    FROM transaction_inputs
                    WHERE txid = :txid
                """),
                {"txid": txid}
            ).mappings().all()

            outputs = db.execute(
                text("""
                    SELECT
                        wallet_address,
                        amount
                    FROM transaction_outputs
                    WHERE txid = :txid
                """),
                {"txid": txid}
            ).mappings().all()

            total_input = sum(
                float(x["amount"] or 0)
                for x in inputs
            )

            total_output = sum(
                float(x["amount"] or 0)
                for x in outputs
            )

            transaction_details.append({
                "txid": txid,
                "timestamp": str(tx["timestamp"]),
                "fee": float(tx["fee"] or 0),
                "script_type": tx["script_type"],
                "input_count": len(inputs),
                "output_count": len(outputs),
                "total_input": total_input,
                "total_output": total_output,
                "value": total_output
            })

        # ---------------------------------------------------------
        # CONNECTED WALLETS
        # ---------------------------------------------------------
        connected_wallets = db.execute(
            text("""
                SELECT DISTINCT wallet_address
                FROM (
                    SELECT ti2.wallet_address
                    FROM transaction_inputs ti1
                    JOIN transaction_outputs ti2
                        ON ti1.txid = ti2.txid
                    WHERE ti1.wallet_address = :address

                    UNION

                    SELECT ti2.wallet_address
                    FROM transaction_outputs ti1
                    JOIN transaction_inputs ti2
                        ON ti1.txid = ti2.txid
                    WHERE ti1.wallet_address = :address
                )
                WHERE wallet_address != :address
                LIMIT 50
            """),
            {"address": wallet_address}
        ).scalars().all()

        # ---------------------------------------------------------
        # INVESTIGATIVE SIGNALS
        # ---------------------------------------------------------
        risk_score = float(row.get("risk_score", 0))
        confidence = float(row.get("confidence", 0))
        anomaly_score = float(row.get("anomaly_score", 0))

        signals = []

        if risk_score >= 80:
            signals.append({
                "title": "Critical behavioral anomaly",
                "category": "ML",
                "detail": "Isolation Forest identified highly unusual wallet behavior."
            })
        elif risk_score >= 60:
            signals.append({
                "title": "Elevated behavioral anomaly",
                "category": "ML",
                "detail": "Wallet behavior deviates materially from the observed baseline."
            })

        if len(source_ips) >= 3:
            signals.append({
                "title": "Distributed network activity",
                "category": "NETWORK",
                "detail": f"{len(source_ips)} distinct source IPs observed."
            })

        if len(asns) >= 2:
            signals.append({
                "title": "ASN diversity",
                "category": "NETWORK",
                "detail": f"Activity spans {len(asns)} distinct autonomous systems."
            })

        if len(connected_wallets) >= 5:
            signals.append({
                "title": "Large transaction neighborhood",
                "category": "GRAPH",
                "detail": f"{len(connected_wallets)} connected wallet entities identified."
            })

        if abs(float(row.get("flow_imbalance", 0))) >= 0.8:
            signals.append({
                "title": "Strong flow imbalance",
                "category": "FLOW",
                "detail": "Incoming and outgoing value distribution is highly asymmetric."
            })

        # ---------------------------------------------------------
        # RESPONSE
        # ---------------------------------------------------------
        return {
            "wallet": {
                "address": wallet["address"],
                "first_seen": str(wallet["first_seen"]) if wallet["first_seen"] else None,
                "last_seen": str(wallet["last_seen"]) if wallet["last_seen"] else None,
                "transaction_count": wallet["transaction_count"],
                "total_received": float(wallet["total_received"] or 0),
                "total_sent": float(wallet["total_sent"] or 0)
            },

            "risk": {
                "score": round(risk_score, 2),
                "confidence": round(confidence, 2),
                "anomaly_score": anomaly_score,
                "explanation": row.get("explanation", "")
            },

            "behavior": {
                "source_ip_count": int(row.get("source_ip_count", 0)),
                "destination_ip_count": int(row.get("destination_ip_count", 0)),
                "network_diversity": int(row.get("network_diversity", 0)),
                "flow_imbalance": float(row.get("flow_imbalance", 0)),
                "tx_per_ip": float(row.get("tx_per_ip", 0))
            },

            "network": {
                "source_ips": source_ips,
                "destination_ips": destination_ips,
                "countries": countries,
                "asns": asns,
                "observation_count": len(observations)
            },

            "transactions": transaction_details,

            "connected_wallets": connected_wallets,

            "signals": signals
        }

    finally:
        db.close()


@router.get("/graph")
def get_graph():

    from backend.app.graph.network import build_investigation_graph

    db = SessionLocal()

    try:

        graph = build_investigation_graph(db)

        nodes = []

        for node, data in graph.nodes(data=True):

            nodes.append({
                "id": str(node),
                "type": data.get("type", "unknown")
            })

        edges = []

        for source, target, data in graph.edges(data=True):

            edges.append({
                "source": str(source),
                "target": str(target),
                "relationship": data.get(
                    "relationship",
                    "related"
                )
            })

        return {
            "nodes": nodes,
            "edges": edges
        }

    finally:
        db.close()


@router.get("/graph/focused")
def get_focused_graph(wallet_address: str = None):

    from backend.app.graph.network import build_investigation_graph

    db = SessionLocal()

    try:
        graph = build_investigation_graph(db)

        # If no wallet is supplied, use the highest-risk wallet
        if not wallet_address:

            from backend.app.ml.pipeline import run_detection
            from backend.app.ml.risk import calculate_risk_scores

            features = run_detection()

            if features is not None and not features.empty:

                scored = calculate_risk_scores(features)

                wallet_address = (
                    scored.sort_values(
                        "risk_score",
                        ascending=False
                    ).iloc[0]["wallet_address"]
                )

        if not wallet_address or wallet_address not in graph:
            return {
                "nodes": [],
                "edges": [],
                "wallet": wallet_address
            }

        # Neighborhood around selected wallet
        neighborhood = set(
            [wallet_address] +
            list(graph.neighbors(wallet_address))
        )

        # Expand one more hop, but keep it bounded
        second_hop = set()

        for node in list(neighborhood):
            second_hop.update(graph.neighbors(node))

        neighborhood.update(second_hop)

        # Hard limit for browser performance
        if len(neighborhood) > 120:
            neighborhood = set(
                list(neighborhood)[:120]
            )

        nodes = []

        for node in neighborhood:

            data = graph.nodes[node]

            nodes.append({
                "id": str(node),
                "type": data.get("type", "unknown")
            })

        edges = []

        for source, target, data in graph.edges(data=True):

            if source in neighborhood and target in neighborhood:

                edges.append({
                    "source": str(source),
                    "target": str(target),
                    "relationship": data.get(
                        "relationship",
                        "related"
                    )
                })

        return {
            "wallet": wallet_address,
            "nodes": nodes,
            "edges": edges
        }

    finally:
        db.close()


@router.get("/transaction/{txid}")
def get_transaction_analysis(txid: str):

    from sqlalchemy import text
    from statistics import mean

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Transaction
        # -------------------------------------------------

        transaction = db.execute(
            text("""
                SELECT
                    txid,
                    timestamp,
                    fee,
                    script_type
                FROM transactions
                WHERE txid = :txid
            """),
            {"txid": txid}
        ).mappings().first()

        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

        # -------------------------------------------------
        # Inputs
        # -------------------------------------------------

        inputs = db.execute(
            text("""
                SELECT
                    wallet_address,
                    amount
                FROM transaction_inputs
                WHERE txid = :txid
                ORDER BY amount DESC
            """),
            {"txid": txid}
        ).mappings().all()

        # -------------------------------------------------
        # Outputs
        # -------------------------------------------------

        outputs = db.execute(
            text("""
                SELECT
                    wallet_address,
                    amount
                FROM transaction_outputs
                WHERE txid = :txid
                ORDER BY amount DESC
            """),
            {"txid": txid}
        ).mappings().all()

        # -------------------------------------------------
        # Network observations
        # -------------------------------------------------

        observations = db.execute(
            text("""
                SELECT
                    timestamp,
                    src_ip,
                    dst_ip,
                    src_port,
                    dst_port,
                    geo_country,
                    asn
                FROM network_observations
                WHERE txid = :txid
                ORDER BY timestamp
            """),
            {"txid": txid}
        ).mappings().all()

        # -------------------------------------------------
        # Basic transaction metrics
        # -------------------------------------------------

        input_amounts = [
            float(row["amount"])
            for row in inputs
            if row["amount"] is not None
        ]

        output_amounts = [
            float(row["amount"])
            for row in outputs
            if row["amount"] is not None
        ]

        total_input = sum(input_amounts)
        total_output = sum(output_amounts)

        # Use observed output value as the transaction value.
        transaction_value = total_output

        input_count = len(inputs)
        output_count = len(outputs)

        # -------------------------------------------------
        # Dataset baseline
        # -------------------------------------------------

        all_values = db.execute(
            text("""
                SELECT
                    txid,
                    SUM(amount) AS value
                FROM transaction_outputs
                GROUP BY txid
            """)
        ).mappings().all()

        dataset_values = sorted(
            float(row["value"])
            for row in all_values
            if row["value"] is not None
        )

        percentile = 50.0

        if dataset_values:

            less_equal = sum(
                1
                for value in dataset_values
                if value <= transaction_value
            )

            percentile = (
                less_equal / len(dataset_values)
            ) * 100

        # -------------------------------------------------
        # Address reuse
        # -------------------------------------------------

        input_wallets = [
            row["wallet_address"]
            for row in inputs
            if row["wallet_address"]
        ]

        output_wallets = [
            row["wallet_address"]
            for row in outputs
            if row["wallet_address"]
        ]

        all_wallets = set(
            input_wallets + output_wallets
        )

        reused_wallets = []

        for wallet in all_wallets:

            count = db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM (
                        SELECT txid
                        FROM transaction_inputs
                        WHERE wallet_address = :wallet

                        UNION

                        SELECT txid
                        FROM transaction_outputs
                        WHERE wallet_address = :wallet
                    )
                """),
                {"wallet": wallet}
            ).scalar()

            if count and count > 1:
                reused_wallets.append(wallet)

        # -------------------------------------------------
        # IP concentration
        # -------------------------------------------------

        source_ips = list({
            row["src_ip"]
            for row in observations
            if row["src_ip"]
        })

        destination_ips = list({
            row["dst_ip"]
            for row in observations
            if row["dst_ip"]
        })

        asns = list({
            row["asn"]
            for row in observations
            if row["asn"]
        })

        countries = list({
            row["geo_country"]
            for row in observations
            if row["geo_country"]
        })

        # -------------------------------------------------
        # Connected wallet ML risk
        # -------------------------------------------------

        results = run_detection()

        connected_wallet_risks = []

        for wallet in all_wallets:

            match = results[
                results["wallet_address"] == wallet
            ]

            if not match.empty:

                connected_wallet_risks.append(
                    float(
                        match.iloc[0]["risk_score"]
                    )
                )

        max_wallet_risk = (
            max(connected_wallet_risks)
            if connected_wallet_risks
            else 0.0
        )

        avg_wallet_risk = (
            mean(connected_wallet_risks)
            if connected_wallet_risks
            else 0.0
        )

        # -------------------------------------------------
        # Investigative signal scoring
        # -------------------------------------------------

        value_signal = min(
            20.0,
            max(
                0.0,
                (percentile - 75.0) / 25.0 * 20.0
            )
        )

        fanout_signal = min(
            20.0,
            output_count * 4.0
        )

        reuse_signal = min(
            15.0,
            len(reused_wallets) * 5.0
        )

        network_signal = min(
            15.0,
            (
                len(source_ips) * 3.0
                + len(asns) * 2.0
            )
        )

        wallet_signal = (
            max_wallet_risk / 100.0
        ) * 30.0

        investigative_priority = min(
            100.0,
            value_signal
            + fanout_signal
            + reuse_signal
            + network_signal
            + wallet_signal
        )

        # -------------------------------------------------
        # Severity
        # -------------------------------------------------

        if investigative_priority >= 80:
            severity = "CRITICAL"
        elif investigative_priority >= 60:
            severity = "HIGH"
        elif investigative_priority >= 40:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # -------------------------------------------------
        # Evidence
        # -------------------------------------------------

        evidence = []

        if percentile >= 90:
            evidence.append({
                "title": "Transaction value anomaly",
                "category": "financial",
                "observed": round(
                    transaction_value,
                    6
                ),
                "baseline": (
                    f"{percentile:.1f}th percentile"
                ),
                "points": round(value_signal, 1)
            })

        if output_count >= 3:
            evidence.append({
                "title": "Output fan-out anomaly",
                "category": "graph",
                "observed": output_count,
                "baseline": "Elevated output count",
                "points": round(fanout_signal, 1)
            })

        if reused_wallets:
            evidence.append({
                "title": "Address reuse",
                "category": "graph",
                "observed": len(reused_wallets),
                "baseline": "Repeated wallet activity",
                "points": round(reuse_signal, 1)
            })

        if source_ips:
            evidence.append({
                "title": "Source-IP activity",
                "category": "network",
                "observed": len(source_ips),
                "baseline": (
                    f"{len(asns)} ASN(s)"
                ),
                "points": round(network_signal, 1)
            })

        if max_wallet_risk >= 60:
            evidence.append({
                "title": "High-risk connected wallet",
                "category": "ml",
                "observed": round(
                    max_wallet_risk,
                    2
                ),
                "baseline": "Wallet risk threshold: 60",
                "points": round(wallet_signal, 1)
            })

        explanation_parts = [
            item["title"].lower()
            for item in evidence
        ]

        if explanation_parts:

            explanation = (
                "This transaction was prioritized because "
                + ", ".join(explanation_parts)
                + "."
            )

        else:

            explanation = (
                "No dominant investigative signal "
                "was identified for this transaction."
            )

        return {
            "txid": transaction["txid"],
            "timestamp": str(
                transaction["timestamp"]
            ),
            "fee": (
                float(transaction["fee"])
                if transaction["fee"] is not None
                else None
            ),
            "script_type": transaction["script_type"],

            "priority": round(
                investigative_priority,
                2
            ),

            "severity": severity,

            "flow": {
                "from": (
                    input_wallets[0]
                    if input_wallets
                    else None
                ),
                "to": (
                    output_wallets[0]
                    if output_wallets
                    else None
                ),
                "input_count": input_count,
                "output_count": output_count,
                "total_input": round(
                    total_input,
                    6
                ),
                "total_output": round(
                    total_output,
                    6
                ),
                "value": round(
                    transaction_value,
                    6
                )
            },

            "evidence": evidence,

            "explanation": explanation,

            "risk": {
                "transaction_value": round(
                    value_signal,
                    2
                ),
                "output_fanout": round(
                    fanout_signal,
                    2
                ),
                "address_reuse": round(
                    reuse_signal,
                    2
                ),
                "network": round(
                    network_signal,
                    2
                ),
                "connected_wallet": round(
                    wallet_signal,
                    2
                )
            },

            "network": {
                "source_ips": source_ips,
                "destination_ips": destination_ips,
                "asns": asns,
                "countries": countries,
                "observation_count": len(
                    observations
                )
            },

            "wallets": {
                "count": len(all_wallets),
                "addresses": list(all_wallets),
                "max_risk": round(
                    max_wallet_risk,
                    2
                ),
                "average_risk": round(
                    avg_wallet_risk,
                    2
                )
            },

            "related": {
                "reused_wallets": reused_wallets
            }
        }

    finally:
        db.close()
