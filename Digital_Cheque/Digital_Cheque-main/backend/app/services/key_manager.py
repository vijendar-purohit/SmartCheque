from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from app.config import settings


def generate_rsa_keypair() -> tuple:
    """Generate RSA-4096 keypair, returns (private_key_pem, public_key_pem)."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
        backend=default_backend()
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    return private_pem.decode('utf-8'), public_pem.decode('utf-8')


def _read_key_from_path(path: str) -> str | None:
    """Read a PEM key from a file path. Returns None if path is unset or unreadable."""
    if not path:
        return None
    try:
        return Path(path).read_text(encoding='utf-8')
    except OSError:
        return None


def get_bank_public_key() -> str:
    """Return bank RSA public key PEM.

    Lookup order: BANK_RSA_PUBLIC_KEY_PATH (file) -> BANK_RSA_PUBLIC_KEY (env).
    The private key's lookup mirrors this.
    """
    pem = _read_key_from_path(settings.bank_rsa_public_key_path)
    if pem:
        return pem
    if settings.bank_rsa_public_key:
        return settings.bank_rsa_public_key
    raise ValueError(
        "Bank public key not configured. Set BANK_RSA_PUBLIC_KEY_PATH "
        "(preferred) or BANK_RSA_PUBLIC_KEY."
    )


def get_bank_private_key() -> str:
    """Return bank RSA private key PEM.

    Lookup order: BANK_RSA_PRIVATE_KEY_PATH (file) -> BANK_RSA_PRIVATE_KEY (env).
    """
    pem = _read_key_from_path(settings.bank_rsa_private_key_path)
    if pem:
        return pem
    if settings.bank_rsa_private_key:
        return settings.bank_rsa_private_key
    raise ValueError(
        "Bank private key not configured. Set BANK_RSA_PRIVATE_KEY_PATH "
        "(preferred) or BANK_RSA_PRIVATE_KEY."
    )


def generate_and_save_rsa_keypair(private_path: str, public_path: str) -> tuple:
    """Generate an RSA-4096 keypair and write both halves to disk.

    This is the safe path: it never prints or returns the private key material,
    and the private key file is created with 0600 permissions. Refuses to
    overwrite existing files unless they are empty.
    """
    private, public = generate_rsa_keypair()

    priv = Path(private_path)
    pub = Path(public_path)

    if priv.exists() and priv.stat().st_size > 0:
        raise FileExistsError(f"Refusing to overwrite existing key: {private_path}")
    if pub.exists() and pub.stat().st_size > 0:
        raise FileExistsError(f"Refusing to overwrite existing key: {public_path}")

    priv.write_text(private, encoding='utf-8')
    # 0600: owner read/write only. Best-effort on Windows where the mode is ignored.
    try:
        priv.chmod(0o600)
    except OSError:
        pass

    pub.write_text(public, encoding='utf-8')
    try:
        pub.chmod(0o644)
    except OSError:
        pass

    return str(priv), str(pub)


def generate_and_print_rsa_keypair():
    """Deprecated one-time setup script. Prefer generate_and_save_rsa_keypair.

    Kept for backwards compatibility. Prints private key material to stdout,
    which is unsafe for any environment where stdout is logged or shared.
    """
    import warnings
    warnings.warn(
        "generate_and_print_rsa_keypair prints the private key to stdout. "
        "Use generate_and_save_rsa_keypair instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    private, public = generate_rsa_keypair()
    # Escape newlines for .env
    private_escaped = private.replace('\n', '\\n')
    public_escaped = public.replace('\n', '\\n')
    print("\n" + "="*60)
    print("RSA-4096 KEYPAIR GENERATED")
    print("="*60)
    print("\n--- BANK_RSA_PRIVATE_KEY ---")
    print(private)
    print("\n--- BANK_RSA_PUBLIC_KEY ---")
    print(public)
    print("\n" + "="*60)
    print("Add these to your .env file as:")
    print(f'BANK_RSA_PRIVATE_KEY="{private_escaped}"')
    print(f'BANK_RSA_PUBLIC_KEY="{public_escaped}"')
    print("="*60)