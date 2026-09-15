import geoip2.database
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]
GEOIP_DIR = BASE_DIR / "data" / "geoip"

COUNTRY_DB = GEOIP_DIR / "dbip-country-lite.mmdb"
ASN_DB = GEOIP_DIR / "dbip-asn-lite.mmdb"


class GeoIPService:

    def __init__(self):
        self.country_reader = geoip2.database.Reader(
            str(COUNTRY_DB)
        )

        self.asn_reader = geoip2.database.Reader(
            str(ASN_DB)
        )

    def lookup(self, ip_address):

        country = "Unknown"
        asn = "Unknown"

        try:
            response = self.country_reader.country(
                ip_address
            )

            country = (
                response.country.name
                or "Unknown"
            )

        except Exception:
            pass

        try:
            response = self.asn_reader.asn(
                ip_address
            )

            if response.autonomous_system_number:
                asn = f"AS{response.autonomous_system_number}"

        except Exception:
            pass

        return {
            "country": country,
            "asn": asn
        }

    def close(self):
        self.country_reader.close()
        self.asn_reader.close()
