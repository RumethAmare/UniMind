from uuid import uuid4

from app.core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_hash_roundtrip():
    password_hash = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong password", password_hash)


def test_access_token_roundtrip():
    user_id = uuid4()
    token = create_access_token(user_id)

    assert decode_token(token, "access") == user_id

