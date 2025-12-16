"""
Name service utilities for country code mapping.
"""
from typing import List, Optional

# Country code to readable name mapping
COUNTRY_NAMES = {
    "AD": "andorra", "AE": "uae", "AF": "afghanistan", "AL": "albania",
    "AM": "armenia", "AR": "argentina", "AT": "austria", "AU": "australia",
    "AW": "aruba", "AZ": "azerbaijan", "BA": "bosnia", "BD": "bangladesh",
    "BE": "belgium", "BG": "bulgaria", "BO": "bolivia", "BR": "brazil",
    "BY": "belarus", "CA": "canada", "CH": "switzerland", "CL": "chile",
    "CN": "china", "CO": "colombia", "CY": "cyprus", "CZ": "czechia",
    "DE": "germany", "DK": "denmark", "DZ": "algeria", "EC": "ecuador",
    "EE": "estonia", "EG": "egypt", "ES": "spain", "FI": "finland",
    "FO": "faroeislands", "FR": "france", "GB": "uk", "GE": "georgia",
    "GG": "guernsey", "GI": "gibraltar", "GL": "greenland", "GQ": "equatorialguinea",
    "GR": "greece", "HR": "croatia", "HT": "haiti", "HU": "hungary",
    "ID": "indonesia", "IE": "ireland", "IL": "israel", "IM": "isleofman",
    "IN": "india", "IQ": "iraq", "IR": "iran", "IS": "iceland",
    "IT": "italy", "JE": "jersey", "JM": "jamaica", "JO": "jordan",
    "JP": "japan", "KG": "kyrgyzstan", "KR": "korea", "KW": "kuwait",
    "KZ": "kazakhstan", "LB": "lebanon", "LI": "liechtenstein", "LT": "lithuania",
    "LU": "luxembourg", "LV": "latvia", "LY": "libya", "MA": "morocco",
    "MC": "monaco", "MD": "moldova", "ME": "montenegro", "MK": "macedonia",
    "ML": "mali", "MN": "mongolia", "MT": "malta", "MX": "mexico",
    "MY": "malaysia", "NL": "netherlands", "NO": "norway", "NP": "nepal",
    "NZ": "newzealand", "PA": "panama", "PE": "peru", "PF": "frenchpolynesia",
    "PH": "philippines", "PK": "pakistan", "PL": "poland", "PR": "puertorico",
    "PT": "portugal", "PY": "paraguay", "RO": "romania", "RS": "serbia",
    "RU": "russia", "SA": "saudiarabia", "SE": "sweden", "SG": "singapore",
    "SI": "slovenia", "SK": "slovakia", "SM": "sanmarino", "SV": "elsalvador",
    "TH": "thailand", "TJ": "tajikistan", "TN": "tunisia", "TR": "turkey",
    "TW": "taiwan", "UA": "ukraine", "US": "usa", "UY": "uruguay",
    "UZ": "uzbekistan", "VE": "venezuela", "VN": "vietnam", "ZA": "southafrica",
}

# Reverse mapping: origin name to country code
ORIGIN_TO_CODE = {v: k for k, v in COUNTRY_NAMES.items()}


def country_code_to_origin(code: str) -> str:
    """Convert ISO country code to readable origin name.

    Examples:
        IT -> italy
        US -> usa
        GB -> uk
    """
    return COUNTRY_NAMES.get(code, code.lower())


def origin_to_country_code(origin: str) -> Optional[str]:
    """Convert readable origin name to ISO country code.

    Examples:
        italy -> IT
        usa -> US
        uk -> GB
    """
    return ORIGIN_TO_CODE.get(origin.lower())


def origins_to_country_codes(origins: List[str]) -> List[str]:
    """Convert a list of origin names to country codes."""
    codes = []
    for origin in origins:
        code = origin_to_country_code(origin)
        if code:
            codes.append(code)
    return codes
