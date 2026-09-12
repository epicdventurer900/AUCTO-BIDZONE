from app.main import health


def test_health_response():
    assert health() == {"status": "ok"}
