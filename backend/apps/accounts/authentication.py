from rest_framework_simplejwt.authentication import JWTAuthentication


class FlexibleJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that also accepts a backup header for cases where
    a reverse proxy drops the standard Authorization header.
    """

    alt_header_names = ("HTTP_X_ACCESS_TOKEN", "HTTP_X_AUTHORIZATION")

    def authenticate(self, request):
        # Try the normal Authorization header first.
        header = self.get_header(request)
        if header is None:
            # Fallback: try custom headers that proxies are less likely to strip.
            for meta_key in self.alt_header_names:
                alt = request.META.get(meta_key)
                if alt:
                    if isinstance(alt, str):
                        alt = alt.encode("utf-8")
                    # Ensure it looks like "Bearer <token>"
                    if not alt.lower().startswith(b"bearer "):
                        alt = b"Bearer " + alt
                    header = alt
                    break

        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
