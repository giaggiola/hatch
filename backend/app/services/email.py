import logging
from pathlib import Path
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Email configuration - lazy loaded to avoid validation errors when not configured
_conf = None

def get_email_config():
    """Get email config, creating it lazily only when needed."""
    global _conf
    if _conf is None and is_email_configured():
        _conf = ConnectionConfig(
            MAIL_USERNAME=settings.mail_username,
            MAIL_PASSWORD=settings.mail_password,
            MAIL_FROM=settings.mail_from,
            MAIL_PORT=settings.mail_port,
            MAIL_SERVER=settings.mail_server,
            MAIL_STARTTLS=settings.mail_starttls,
            MAIL_SSL_TLS=settings.mail_ssl_tls,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
            TEMPLATE_FOLDER=Path(__file__).parent.parent / "templates",
        )
    return _conf


def is_email_configured() -> bool:
    """Check if email service is properly configured"""
    return bool(settings.mail_username and settings.mail_password and settings.mail_from)


async def send_invite_email(
    to_email: str,
    invite_code: str,
    inviter_name: str,
) -> bool:
    """
    Send an invite email to a partner.

    Returns True if sent successfully, False otherwise.
    """
    if not is_email_configured():
        logger.warning("Email not configured, skipping invite email")
        return False

    invite_url = f"{settings.frontend_url}/invite/{invite_code}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been invited!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 32px 24px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                                    🐣 Hatch
                                </h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px 24px;">
                                <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; text-align: center;">
                                    You've been invited!
                                </h2>

                                <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; text-align: center;">
                                    <strong>{inviter_name}</strong> wants to pick baby names together with you.
                                </p>

                                <!-- CTA Button -->
                                <table role="presentation" style="width: 100%;">
                                    <tr>
                                        <td style="text-align: center; padding: 8px 0 24px 0;">
                                            <a href="{invite_url}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                                                Accept Invitation
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Invite Code -->
                                <p style="color: #9ca3af; margin: 0 0 8px 0; font-size: 12px; text-align: center;">
                                    Or use this code:
                                </p>
                                <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 18px; font-weight: 600; text-align: center; font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 8px;">
                                    {invite_code}
                                </p>

                                <!-- Expiration Notice -->
                                <p style="color: #9ca3af; margin: 0; font-size: 12px; text-align: center;">
                                    This invite expires in 7 days.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                                    Hatch - Find the perfect name together
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    plain_text = f"""
You've been invited!

{inviter_name} wants to pick baby names together with you.

Accept the invitation: {invite_url}

Or use this code: {invite_code}

This invite expires in 7 days.
    """

    try:
        message = MessageSchema(
            subject=f"{inviter_name} invited you to Hatch",
            recipients=[to_email],
            body=html_content,
            subtype=MessageType.html,
        )

        conf = get_email_config()
        if not conf:
            logger.warning("Email config not available")
            return False
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Invite email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send invite email to {to_email}: {e}")
        return False
