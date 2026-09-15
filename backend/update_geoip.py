from backend.app.core.database import SessionLocal
from backend.app.models import IPAddress
from backend.app.services.geoip import GeoIPService


def main():

    db = SessionLocal()
    geoip = GeoIPService()

    try:

        ips = db.query(IPAddress).all()

        print(f"Updating {len(ips)} IP addresses...")

        updated = 0

        for ip in ips:

            result = geoip.lookup(ip.address)

            ip.country = result["country"]
            ip.asn = result["asn"]

            updated += 1

            if updated % 100 == 0:
                db.commit()
                print(
                    f"Updated {updated}/{len(ips)} IPs..."
                )

        db.commit()

        print()
        print("========================================")
        print("TRACE-X GEO-IP UPDATE COMPLETE")
        print("========================================")
        print(f"IP addresses updated : {updated}")

    finally:

        geoip.close()
        db.close()


if __name__ == "__main__":
    main()
