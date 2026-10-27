from datetime import datetime, timezone
from getpass import getpass

from pymongo import MongoClient
from pwdlib import PasswordHash


MONGODB_URI = "mongodb://localhost:27017"
DATABASE_NAME = "gestion_reclamations"


def main():
    nom = input("Nom de l'administrateur : ").strip()
    prenom = input("Prénom de l'administrateur : ").strip()
    email = input("Email de l'administrateur : ").strip().lower()
    password = getpass("Mot de passe (minimum 8 caractères) : ")
    confirmation = getpass("Confirmer le mot de passe : ")

    if not nom or not prenom or not email:
        print("Erreur : tous les champs sont obligatoires.")
        return
    if len(password) < 8:
        print("Erreur : le mot de passe doit contenir au moins 8 caractères.")
        return
    if password != confirmation:
        print("Erreur : les mots de passe ne correspondent pas.")
        return

    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        users = client[DATABASE_NAME]["users"]
        if users.find_one({"email": email}):
            print("Erreur : un compte avec cet email existe déjà.")
            return

        admin = {
            "nom": nom,
            "prenom": prenom,
            "email": email,
            "password": PasswordHash.recommended().hash(password),
            "role": "admin",
            "dateCreation": datetime.now(timezone.utc),
        }
        result = users.insert_one(admin)
        print("\nCompte administrateur créé avec succès.")
        print("Email :", email)
        print("ID :", result.inserted_id)
        print("Le mot de passe n'est pas affiché.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
