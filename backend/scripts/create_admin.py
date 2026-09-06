import sys
from pathlib import Path
from getpass import getpass

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main() -> None:
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass("Admin password: ")
    confirm_password = getpass("Confirm password: ")

    if not name or not email or not password:
        raise SystemExit("Name, email, and password are required.")
    if password != confirm_password:
        raise SystemExit("Passwords do not match.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                name=name,
                email=email,
                hashed_password=hash_password(password),
                is_admin=True,
            )
            db.add(user)
        else:
            user.name = name
            user.hashed_password = hash_password(password)
            user.is_admin = True

        db.commit()
        print(f"Admin account ready: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
