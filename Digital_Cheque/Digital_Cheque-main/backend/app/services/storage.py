"""
MinIO storage service for cheque files.
"""
import io
from datetime import timedelta
from minio import Minio
from app.config import settings
import boto3
from botocore.config import Config


def get_minio_client(endpoint: str = None):
    """Get MinIO client. If endpoint is None, uses internal endpoint (minio:9000)."""
    if endpoint is None:
        endpoint = settings.minio_endpoint
    return Minio(
        endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )


def get_boto3_client(endpoint: str = None):
    """Get boto3 S3 client for presigned URL generation."""
    if endpoint is None:
        endpoint = settings.minio_endpoint
    return boto3.client(
        's3',
        endpoint_url=f'http://{endpoint}',
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1',
    )


def ensure_bucket_exists():
    client = get_minio_client()
    bucket = settings.minio_bucket
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def upload_cheque_file(cheque_id: str, file_type: str, file_bytes: bytes) -> str:
    ensure_bucket_exists()
    client = get_minio_client()
    bucket = settings.minio_bucket
    object_key = f"{cheque_id}/{cheque_id}.{file_type}"
    file_size = len(file_bytes)
    file_stream = io.BytesIO(file_bytes)
    client.put_object(
        bucket,
        object_key,
        file_stream,
        file_size,
        content_type=f"image/{file_type}" if file_type == "png" else "application/pdf",
    )
    return object_key


def get_presigned_url_public(object_key: str, expires: int = 3600) -> str:
    """Generate presigned URL using the public endpoint (localhost:9000).

    Uses boto3 directly to generate presigned URL with custom endpoint URL.
    """
    public_endpoint = settings.minio_public_endpoint
    # Replace host.docker.internal with localhost for the public URL
    if 'host.docker.internal' in public_endpoint:
        public_endpoint = public_endpoint.replace('host.docker.internal', 'localhost')
    
    boto3_client = get_boto3_client(endpoint=public_endpoint)
    bucket = settings.minio_bucket
    
    url = boto3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': object_key},
        ExpiresIn=expires,
    )
    return url