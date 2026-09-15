import csv
import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

NUM_TRANSACTIONS = 3000
START_TIME = datetime(2026, 9, 1, 0, 0, 0)

OUTPUT_DIR = Path("data/raw")

random.seed(42)


# ============================================================
# IDENTIFIER GENERATORS
# ============================================================

def generate_wallet():
    return "bc1q" + uuid.uuid4().hex[:32]


def generate_txid():
    return uuid.uuid4().hex + uuid.uuid4().hex


def generate_ip():
    return ".".join(
        str(random.randint(1, 254))
        for _ in range(4)
    )


def generate_asn():
    return f"AS{random.randint(1000, 65000)}"


COUNTRIES = [
    "IN",
    "US",
    "GB",
    "DE",
    "SG",
    "NL",
    "FR",
    "CA",
]


# ============================================================
# WALLET POPULATIONS
# ============================================================

normal_wallets = [
    generate_wallet()
    for _ in range(400)
]

high_velocity_wallets = [
    generate_wallet()
    for _ in range(15)
]

peeling_wallets = [
    generate_wallet()
    for _ in range(25)
]

mixing_wallets = [
    generate_wallet()
    for _ in range(40)
]


# ============================================================
# NETWORK POPULATIONS
# ============================================================

normal_ips = [
    generate_ip()
    for _ in range(150)
]

suspicious_ips = [
    generate_ip()
    for _ in range(20)
]


# ============================================================
# AMOUNT DISTRIBUTION
# ============================================================

def split_amount(total, count):
    """
    Split a total amount into positive random components.
    """
    if count == 1:
        return [round(total, 8)]

    weights = [
        random.uniform(0.5, 1.5)
        for _ in range(count)
    ]

    weight_sum = sum(weights)

    amounts = [
        total * weight / weight_sum
        for weight in weights
    ]

    amounts = [
        round(amount, 8)
        for amount in amounts
    ]

    difference = round(
        total - sum(amounts),
        8
    )

    amounts[-1] = round(
        amounts[-1] + difference,
        8
    )

    return amounts


# ============================================================
# NORMAL TRANSACTION
# ============================================================

def create_normal_transaction(timestamp):

    input_count = random.choice([1, 1, 1, 2])
    output_count = random.choice([1, 2])

    inputs = random.sample(
        normal_wallets,
        input_count
    )

    outputs = random.sample(
        normal_wallets,
        output_count
    )

    total_input = round(
        random.uniform(0.01, 2.0),
        8
    )

    fee = round(
        random.uniform(0.00001, 0.002),
        8
    )

    total_output = round(
        total_input - fee,
        8
    )

    input_amounts = split_amount(
        total_input,
        input_count
    )

    output_amounts = split_amount(
        total_output,
        output_count
    )

    return inputs, outputs, input_amounts, output_amounts, fee


# ============================================================
# HIGH VELOCITY TRANSACTION
# ============================================================

def create_high_velocity_transaction(timestamp):

    wallet = random.choice(
        high_velocity_wallets
    )

    outputs = random.sample(
        normal_wallets,
        2
    )

    total_input = round(
        random.uniform(5, 25),
        8
    )

    fee = round(
        total_input * random.uniform(0.001, 0.01),
        8
    )

    total_output = round(
        total_input - fee,
        8
    )

    output_1 = round(
        total_output * random.uniform(0.7, 0.95),
        8
    )

    output_2 = round(
        total_output - output_1,
        8
    )

    return (
        [wallet],
        outputs,
        [total_input],
        [output_1, output_2],
        fee
    )


# ============================================================
# PEELING-LIKE TRANSACTION
# ============================================================

def create_peeling_transaction(timestamp):

    wallet = random.choice(
        peeling_wallets
    )

    next_wallet = random.choice(
        peeling_wallets
    )

    while next_wallet == wallet:
        next_wallet = random.choice(
            peeling_wallets
        )

    outputs = [
        next_wallet,
        random.choice(normal_wallets)
    ]

    total_input = round(
        random.uniform(2, 10),
        8
    )

    fee = round(
        total_input * random.uniform(0.001, 0.005),
        8
    )

    usable_amount = total_input - fee

    peel_amount = round(
        usable_amount * random.uniform(0.85, 0.97),
        8
    )

    remainder = round(
        usable_amount - peel_amount,
        8
    )

    return (
        [wallet],
        outputs,
        [total_input],
        [peel_amount, remainder],
        fee
    )


# ============================================================
# MIXING-LIKE TRANSACTION
# ============================================================

def create_mixing_transaction(timestamp):

    input_count = random.choice([3, 4, 5])
    output_count = random.choice([3, 4, 5])

    inputs = random.sample(
        mixing_wallets,
        input_count
    )

    outputs = random.sample(
        mixing_wallets,
        output_count
    )

    total_input = round(
        random.uniform(5, 20),
        8
    )

    fee = round(
        total_input * random.uniform(0.002, 0.01),
        8
    )

    total_output = round(
        total_input - fee,
        8
    )

    input_amounts = split_amount(
        total_input,
        input_count
    )

    output_amounts = split_amount(
        total_output,
        output_count
    )

    return (
        inputs,
        outputs,
        input_amounts,
        output_amounts,
        fee
    )


# ============================================================
# NETWORK DETAILS
# ============================================================

def generate_network_details(suspicious=False):

    if suspicious:
        src_ip = random.choice(
            suspicious_ips
        )
    else:
        src_ip = random.choice(
            normal_ips
        )

    dst_ip = random.choice(
        normal_ips + suspicious_ips
    )

    src_port = random.randint(
        30000,
        60000
    )

    dst_port = 8333

    country = random.choice(
        COUNTRIES
    )

    asn = generate_asn()

    return (
        src_ip,
        dst_ip,
        src_port,
        dst_port,
        country,
        asn
    )


# ============================================================
# CREATE ONE TRANSACTION
# ============================================================

def create_transaction(number):

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    timestamp = (
        START_TIME
        + timedelta(
            seconds=random.randint(
                0,
                7 * 24 * 60 * 60
            )
        )
    )

    # --------------------------------------------------------
    # Behavioral scenario
    # --------------------------------------------------------

    roll = random.random()

    if roll < 0.75:

        scenario = "normal"

        (
            inputs,
            outputs,
            input_amounts,
            output_amounts,
            fee
        ) = create_normal_transaction(timestamp)

        suspicious_network = False

    elif roll < 0.87:

        scenario = "high_velocity"

        (
            inputs,
            outputs,
            input_amounts,
            output_amounts,
            fee
        ) = create_high_velocity_transaction(timestamp)

        suspicious_network = True

    elif roll < 0.95:

        scenario = "peeling_like"

        (
            inputs,
            outputs,
            input_amounts,
            output_amounts,
            fee
        ) = create_peeling_transaction(timestamp)

        suspicious_network = True

    else:

        scenario = "mixing_like"

        (
            inputs,
            outputs,
            input_amounts,
            output_amounts,
            fee
        ) = create_mixing_transaction(timestamp)

        suspicious_network = True

    # --------------------------------------------------------
    # Network
    # --------------------------------------------------------

    (
        src_ip,
        dst_ip,
        src_port,
        dst_port,
        country,
        asn
    ) = generate_network_details(
        suspicious_network
    )

    # --------------------------------------------------------
    # Transaction ID
    # --------------------------------------------------------

    txid = generate_txid()

    # --------------------------------------------------------
    # Script type
    # --------------------------------------------------------

    script_type = random.choice(
        [
            "P2PKH",
            "P2SH",
            "P2WPKH",
            "P2WSH"
        ]
    )

    # --------------------------------------------------------
    # Final record
    # --------------------------------------------------------

    return {
        "timestamp": timestamp.isoformat(
            sep=" "
        ),

        "src_ip": src_ip,

        "dst_ip": dst_ip,

        "src_port": src_port,

        "dst_port": dst_port,

        "txid": txid,

        "input_addresses": json.dumps(
            inputs
        ),

        "output_addresses": json.dumps(
            outputs
        ),

        "input_amounts": json.dumps(
            input_amounts
        ),

        "output_amounts": json.dumps(
            output_amounts
        ),

        "geo_country": country,

        "asn": asn,

        "fee": fee,

        "script_type": script_type,

        "scenario": scenario,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    records = []

    print(
        f"Generating {NUM_TRANSACTIONS} "
        "synthetic Bitcoin transactions..."
    )

    for i in range(
        NUM_TRANSACTIONS
    ):

        records.append(
            create_transaction(i)
        )

    output_file = (
        OUTPUT_DIR
        / "bitcoin_traffic.csv"
    )

    fieldnames = [
        "timestamp",
        "src_ip",
        "dst_ip",
        "src_port",
        "dst_port",
        "txid",
        "input_addresses",
        "output_addresses",
        "input_amounts",
        "output_amounts",
        "geo_country",
        "asn",
        "fee",
        "script_type",
        "scenario",
    ]

    with open(
        output_file,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()

        writer.writerows(records)

    print()
    print("========================================")
    print("TRACE-X DATASET GENERATED")
    print("========================================")
    print(f"Transactions : {len(records)}")
    print(f"Output       : {output_file}")
    print("========================================")


if __name__ == "__main__":
    main()