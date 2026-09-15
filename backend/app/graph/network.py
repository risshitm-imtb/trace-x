import networkx as nx
from sqlalchemy import text
from sqlalchemy.orm import Session


def build_investigation_graph(db: Session):

    graph = nx.Graph()

    observations = db.execute(
        text("""
            SELECT
                src_ip,
                dst_ip,
                txid
            FROM network_observations
            WHERE txid IS NOT NULL
        """)
    ).fetchall()

    for row in observations:

        src_ip = row.src_ip
        dst_ip = row.dst_ip
        txid = row.txid

        graph.add_node(
            src_ip,
            type="ip"
        )

        graph.add_node(
            dst_ip,
            type="ip"
        )

        graph.add_node(
            txid,
            type="transaction"
        )

        graph.add_edge(
            src_ip,
            txid,
            relationship="observed"
        )

        graph.add_edge(
            txid,
            dst_ip,
            relationship="observed"
        )

    wallet_links = db.execute(
        text("""
            SELECT txid, wallet_address
            FROM transaction_inputs

            UNION ALL

            SELECT txid, wallet_address
            FROM transaction_outputs
        """)
    ).fetchall()

    for row in wallet_links:

        txid = row.txid
        wallet = row.wallet_address

        graph.add_node(
            wallet,
            type="wallet"
        )

        graph.add_edge(
            txid,
            wallet,
            relationship="controls"
        )

    return graph
