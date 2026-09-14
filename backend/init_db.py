from backend.app.core.database import Base, engine
from backend.app.models import (
    IPAddress,
    NetworkObservation,
    Transaction,
    TransactionInput,
    TransactionOutput,
    Wallet,
)


def initialize_database():
    Base.metadata.create_all(bind=engine)
    print("Trace-X database initialized successfully.")


if __name__ == "__main__":
    initialize_database()