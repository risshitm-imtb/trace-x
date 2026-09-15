from backend.app.core.database import SessionLocal
from backend.app.ingestion.loader import load_csv_to_database


DATASET_PATH = "data/raw/bitcoin_traffic.csv"


def main():

    db = SessionLocal()

    try:
        load_csv_to_database(
            DATASET_PATH,
            db
        )

    finally:
        db.close()


if __name__ == "__main__":
    main()