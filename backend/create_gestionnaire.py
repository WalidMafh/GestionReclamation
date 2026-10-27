from pymongo import MongoClient
from pwdlib import PasswordHash
from datetime import datetime, timezone


# Connexion MongoDB
client = MongoClient("mongodb://localhost:27017")

database = client["gestion_reclamations"]
users_collection = database["users"]

# Password hashing
password_hash = PasswordHash.recommended()


# Compte gestionnaire
nom = "Gestionnaire"
prenom = "Principal"
email = "gestionnaire@reclamation.ma"
password = "Gestionnaire@123"


# Vérifier si le compte existe déjà
existing_user = users_collection.find_one({
    "email": email
})

if existing_user:
    print("❌ Le compte gestionnaire existe déjà.")

else:
    hashed_password = password_hash.hash(password)

    gestionnaire = {
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "password": hashed_password,
        "role": "gestionnaire",
        "dateCreation": datetime.now(timezone.utc),
    }

    result = users_collection.insert_one(
        gestionnaire
    )

    print("✅ Compte gestionnaire créé avec succès.")
    print()
    print("Email :", email)
    print("Mot de passe :", password)
    print("Role : gestionnaire")
    print("ID :", result.inserted_id)


client.close()