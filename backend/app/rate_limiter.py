"""Rate limiting configuration using slowapi."""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Create limiter instance - uses IP address for rate limiting
limiter = Limiter(key_func=get_remote_address)

# Rate limit constants
RATE_LIMIT_DEFAULT = "100/minute"  # Default for most endpoints
RATE_LIMIT_AUTH = "10/minute"  # Auth endpoints (prevent brute force)
RATE_LIMIT_SEARCH = "30/minute"  # Search endpoints
RATE_LIMIT_SWIPE = "60/minute"  # Swipe endpoints
RATE_LIMIT_INVITE = "5/minute"  # Invite creation (prevent spam)
