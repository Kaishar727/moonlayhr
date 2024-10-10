OIDC_CLIENT_SECRETS = 'client_secrets.json'
OIDC_ID_TOKEN_COOKIE_SECURE = False  # Set to True in production
OIDC_REQUIRE_VERIFIED_EMAIL = False
OIDC_OPENID_REALM = 'cv-receiver'
OIDC_CLIENT_ID = 'cvreceiver'
OIDC_SCOPES = ['openid', 'profile', 'email']
OIDC_VALID_ISSUERS = ['http://127.0.0.1:8080/auth/realms/cv-receiver']
