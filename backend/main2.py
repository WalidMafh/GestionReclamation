from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pwdlib import PasswordHash
import jwt

from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
from pathlib import Path
import shutil
import re


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="Gestion des Réclamations API"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# MONGODB
# =========================================================

client = MongoClient(
    "mongodb://localhost:27017"
)

database = client[
    "gestion_reclamations"
]

users_collection = database[
    "users"
]

reclamations_collection = database[
    "reclamations"
]

users_collection.create_index(
    "email",
    unique=True
)


# =========================================================
# JWT
# =========================================================

SECRET_KEY = (
    "gestion-reclamations-secret-key-2026"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_hash = PasswordHash.recommended()


# =========================================================
# MODELS
# =========================================================

class RegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateStatutRequest(BaseModel):
    statut: str


class CreateGestionnaireRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str


# =========================================================
# AUTHENTICATION
# =========================================================

def create_access_token(
    user_id: str,
    email: str
):
    expiration = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expiration,
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def get_current_user(
    authorization: Optional[str] = Header(
        default=None
    )
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail=(
                "Token d'authentification "
                "manquant"
            )
        )

    if not authorization.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail="Format du token invalide"
        )

    token = authorization.replace(
        "Bearer ",
        ""
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get(
            "user_id"
        )

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token invalide"
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Session expirée"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token invalide"
        )

    try:
        object_id = ObjectId(
            user_id
        )

    except Exception:
        raise HTTPException(
            status_code=401,
            detail=(
                "Identifiant utilisateur "
                "invalide"
            )
        )

    user = users_collection.find_one(
        {
            "_id": object_id
        }
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail=(
                "Utilisateur introuvable"
            )
        )

    return user


def get_current_gestionnaire(
    current_user=Depends(
        get_current_user
    )
):
    role = current_user.get(
        "role",
        "client"
    )

    if role != "gestionnaire":
        raise HTTPException(
            status_code=403,
            detail=(
                "Accès réservé aux "
                "gestionnaires."
            )
        )

    return current_user



def get_current_admin(
    current_user=Depends(get_current_user)
):
    if current_user.get("role", "client") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé à l'administrateur."
        )
    return current_user


# =========================================================
# GENERAL
# =========================================================

@app.get("/")
def accueil():
    return {
        "message": (
            "API Gestion des Réclamations"
        )
    }


@app.get("/health")
def health():
    try:
        client.admin.command(
            "ping"
        )

        return {
            "status": "ok",
            "mongodb": "connected"
        }

    except Exception as e:
        return {
            "status": "error",
            "detail": str(e)
        }


# =========================================================
# REGISTER
# =========================================================

@app.post("/auth/register")
def register(
    user: RegisterRequest
):
    nom = user.nom.strip()
    prenom = user.prenom.strip()
    email = user.email.strip().lower()
    password = user.password

    if not nom or not prenom:
        raise HTTPException(
            status_code=400,
            detail=(
                "Le nom et le prénom "
                "sont obligatoires"
            )
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail=(
                "L'email est obligatoire"
            )
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail=(
                "Le mot de passe doit "
                "contenir au moins 6 "
                "caractères"
            )
        )

    existing_user = (
        users_collection.find_one(
            {
                "email": email
            }
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail=(
                "Un compte avec cet email "
                "existe déjà"
            )
        )

    hashed_password = (
        password_hash.hash(
            password
        )
    )

    new_user = {
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "password": hashed_password,
        "role": "client",
        "dateCreation": (
            datetime.now(timezone.utc)
        ),
    }

    result = (
        users_collection.insert_one(
            new_user
        )
    )

    return {
        "message": (
            "Compte créé avec succès"
        ),
        "user": {
            "id": str(
                result.inserted_id
            ),
            "nom": nom,
            "prenom": prenom,
            "email": email,
        }
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/auth/login")
def login(
    user: LoginRequest
):
    email = (
        user.email
        .strip()
        .lower()
    )

    existing_user = (
        users_collection.find_one(
            {
                "email": email
            }
        )
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail=(
                "Email ou mot de passe "
                "incorrect"
            )
        )

    password_is_valid = (
        password_hash.verify(
            user.password,
            existing_user["password"]
        )
    )

    if not password_is_valid:
        raise HTTPException(
            status_code=401,
            detail=(
                "Email ou mot de passe "
                "incorrect"
            )
        )

    token = create_access_token(
        str(existing_user["_id"]),
        existing_user["email"]
    )
    if existing_user.get("role") == "gestionnaire":
        users_collection.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {"lastSeenAt": datetime.now(timezone.utc)}}
        )

    return {
        "message": (
            "Connexion réussie"
        ),
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(
                existing_user["_id"]
            ),
            "nom": existing_user[
                "nom"
            ],
            "prenom": existing_user[
                "prenom"
            ],
            "email": existing_user[
                "email"
            ],
            "role": existing_user.get(
                "role",
                "client"
            ),
        }
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/auth/me")
def get_me(
    current_user=Depends(
        get_current_user
    )
):
    return {
        "id": str(
            current_user["_id"]
        ),
        "nom": current_user["nom"],
        "prenom": current_user[
            "prenom"
        ],
        "email": current_user[
            "email"
        ],
        "role": current_user.get(
            "role",
            "client"
        ),
    }


# =========================================================
# CREATE RECLAMATION
# =========================================================

# Dossier de stockage des pièces jointes
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads" / "reclamations"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def clean_folder_name(value: str) -> str:
    """Nettoie un nom pour pouvoir l'utiliser comme dossier."""
    value = (value or "client").strip()
    value = re.sub(r"[^a-zA-Z0-9_-]+", "_", value)
    return value.strip("_") or "client"


def clean_filename(filename: str) -> str:
    """Nettoie le nom original du fichier."""
    filename = Path(filename or "document").name
    filename = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename)
    return filename or "document"


@app.post("/reclamations")
def creer_reclamation(
    reference: str = Form(...),
    type: str = Form(...),
    dateCreation: str = Form(...),
    statut: str = Form("Soumise"),
    police: str = Form(""),
    attestation: str = Form(""),
    matriculeType: str = Form(""),
    matricule: str = Form(""),
    numeroSinistre: str = Form(""),
    commentaire: str = Form(""),
    files: Optional[List[UploadFile]] = File(default=None),
    current_user=Depends(get_current_user)
):
    # Informations de la réclamation
    reclamation = {
        "reference": reference,
        "type": type,
        "dateCreation": dateCreation,
        "statut": statut or "Soumise",
        "police": police,
        "attestation": attestation,
        "matriculeType": matriculeType,
        "matricule": matricule,
        "numeroSinistre": numeroSinistre,
        "commentaire": commentaire,
        "user_id": str(current_user["_id"]),
        "clientEmail": current_user["email"],
        "clientNom": current_user["nom"],
        "clientPrenom": current_user["prenom"],
        "dateEnregistrement": datetime.now(timezone.utc),
    }

    # =====================================================
    # DOSSIER DE LA RÉCLAMATION
    # =====================================================
    client_name = clean_folder_name(
        f"{current_user.get('nom', '')}_{current_user.get('prenom', '')}"
    )

    reference_folder = clean_folder_name(reference)
    reclamation_dir = (
        UPLOADS_DIR / client_name / reference_folder
    )
    reclamation_dir.mkdir(parents=True, exist_ok=True)

    # =====================================================
    # SAUVEGARDE DES FICHIERS
    # =====================================================
    saved_files = []

    for uploaded_file in files or []:
        if not uploaded_file or not uploaded_file.filename:
            continue

        original_name = clean_filename(uploaded_file.filename)
        date_prefix = datetime.now().strftime("%Y-%m-%d")
        stored_name = f"{date_prefix}_{original_name}"
        destination = reclamation_dir / stored_name

        # Évite d'écraser un fichier portant le même nom
        counter = 1
        while destination.exists():
            stem = Path(stored_name).stem
            suffix = Path(stored_name).suffix
            stored_name = f"{date_prefix}_{stem}_{counter}{suffix}"
            destination = reclamation_dir / stored_name
            counter += 1

        try:
            with destination.open("wb") as buffer:
                shutil.copyfileobj(uploaded_file.file, buffer)
        finally:
            uploaded_file.file.close()

        file_size = destination.stat().st_size

        saved_files.append({
            "name": original_name,
            "storedName": stored_name,
            "size": file_size,
            "type": uploaded_file.content_type or "application/octet-stream",
            "path": str(destination.relative_to(BASE_DIR)).replace("\\", "/"),
        })

    reclamation["files"] = saved_files

    # =====================================================
    # ENREGISTREMENT MONGODB
    # =====================================================
    resultat = reclamations_collection.insert_one(
        reclamation
    )

    reclamation["_id"] = str(
        resultat.inserted_id
    )

    return {
        "message": (
            "Réclamation enregistrée "
            "avec succès"
        ),
        "reclamation": reclamation
    }


# =========================================================

# CLIENT - LIST RECLAMATIONS
# =========================================================

@app.get("/reclamations")
def lister_reclamations(
    current_user=Depends(
        get_current_user
    )
):
    user_id = str(
        current_user["_id"]
    )

    reclamations = list(
        reclamations_collection.find(
            {
                "user_id": user_id
            }
        ).sort(
            "dateEnregistrement",
            -1
        )
    )

    for reclamation in reclamations:

        reclamation["_id"] = str(
            reclamation["_id"]
        )

        if isinstance(
            reclamation.get(
                "dateEnregistrement"
            ),
            datetime
        ):
            reclamation[
                "dateEnregistrement"
            ] = reclamation[
                "dateEnregistrement"
            ].isoformat()

    return reclamations


# =========================================================
# GESTIONNAIRE - LIST RECLAMATIONS
# =========================================================

@app.get(
    "/gestionnaire/reclamations"
)
def gestionnaire_lister_reclamations(
    current_user=Depends(
        get_current_gestionnaire
    )
):
    reclamations = list(
        reclamations_collection.find().sort(
            "dateEnregistrement",
            -1
        )
    )

    resultat = []

    for reclamation in reclamations:

        user_id = reclamation.get(
            "user_id"
        )

        client_info = None

        if user_id:
            try:
                client_info = (
                    users_collection.find_one(
                        {
                            "_id": ObjectId(
                                user_id
                            )
                        }
                    )
                )

            except Exception:
                client_info = None

        if client_info:

            client_id = str(
                client_info["_id"]
            )

            client_nom = (
                client_info.get(
                    "nom",
                    ""
                )
            )

            client_prenom = (
                client_info.get(
                    "prenom",
                    ""
                )
            )

            client_email = (
                client_info.get(
                    "email",
                    ""
                )
            )

        else:

            client_id = user_id

            client_nom = (
                reclamation.get(
                    "clientNom",
                    ""
                )
            )

            client_prenom = (
                reclamation.get(
                    "clientPrenom",
                    ""
                )
            )

            client_email = (
                reclamation.get(
                    "clientEmail",
                    ""
                )
            )

        reclamation_data = dict(
            reclamation
        )

        reclamation_data["_id"] = str(
            reclamation_data["_id"]
        )

        reclamation_data["client"] = {
            "id": client_id,
            "nom": client_nom,
            "prenom": client_prenom,
            "email": client_email,
        }

        if isinstance(
            reclamation_data.get(
                "dateEnregistrement"
            ),
            datetime
        ):
            reclamation_data[
                "dateEnregistrement"
            ] = reclamation_data[
                "dateEnregistrement"
            ].isoformat()

        resultat.append(
            reclamation_data
        )

    return resultat


# =========================================================
# GESTIONNAIRE - DETAIL D'UNE RECLAMATION
# =========================================================

@app.get(
    "/gestionnaire/reclamations/{reclamation_id}"
)
def gestionnaire_detail_reclamation(
    reclamation_id: str,
    current_user=Depends(
        get_current_gestionnaire
    )
):
    try:
        reclamation_object_id = (
            ObjectId(reclamation_id)
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail=(
                "Identifiant de "
                "réclamation invalide."
            )
        )

    reclamation = (
        reclamations_collection.find_one(
            {
                "_id": reclamation_object_id
            }
        )
    )

    if not reclamation:
        raise HTTPException(
            status_code=404,
            detail=(
                "Réclamation introuvable."
            )
        )

    user_id = reclamation.get(
        "user_id"
    )

    client_info = None

    if user_id:
        try:
            client_info = (
                users_collection.find_one(
                    {
                        "_id": ObjectId(
                            user_id
                        )
                    }
                )
            )

        except Exception:
            client_info = None

    if client_info:

        client_data = {
            "id": str(
                client_info["_id"]
            ),
            "nom": client_info.get(
                "nom",
                ""
            ),
            "prenom": client_info.get(
                "prenom",
                ""
            ),
            "email": client_info.get(
                "email",
                ""
            ),
        }

    else:

        client_data = {
            "id": user_id,
            "nom": reclamation.get(
                "clientNom",
                ""
            ),
            "prenom": reclamation.get(
                "clientPrenom",
                ""
            ),
            "email": reclamation.get(
                "clientEmail",
                ""
            ),
        }

    reclamation["_id"] = str(
        reclamation["_id"]
    )

    reclamation["client"] = (
        client_data
    )

    for date_field in ("dateEnregistrement", "datePriseEnCharge", "dateModificationStatut"):
        if isinstance(reclamation.get(date_field), datetime):
            reclamation[date_field] = reclamation[date_field].isoformat()

    assigned_manager_id = reclamation.get("gestionnaire_id")
    reclamation["isAssignedToCurrentUser"] = bool(
        assigned_manager_id and str(assigned_manager_id) == str(current_user.get("_id"))
    )

    return reclamation


# =========================================================
# GESTIONNAIRE - OUVRIR / TELECHARGER UNE PIECE JOINTE
# =========================================================

@app.get("/gestionnaire/reclamations/{reclamation_id}/files/{file_index}")
def gestionnaire_fichier_reclamation(
    reclamation_id: str,
    file_index: int,
    download: bool = False,
    current_user=Depends(get_current_gestionnaire)
):
    # Vérifier l'identifiant de la réclamation
    try:
        reclamation_object_id = ObjectId(reclamation_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Identifiant de réclamation invalide."
        )

    reclamation = reclamations_collection.find_one(
        {"_id": reclamation_object_id}
    )

    if not reclamation:
        raise HTTPException(
            status_code=404,
            detail="Réclamation introuvable."
        )

    attached_files = reclamation.get("files", [])

    if file_index < 0 or file_index >= len(attached_files):
        raise HTTPException(
            status_code=404,
            detail="Pièce jointe introuvable."
        )

    file_info = attached_files[file_index]
    relative_path = file_info.get("path")

    if not relative_path:
        raise HTTPException(
            status_code=404,
            detail="Le chemin du fichier n'est pas enregistré."
        )

    # Vérifier que le fichier reste dans le dossier uploads/reclamations.
    uploads_root = (BASE_DIR / "uploads" / "reclamations").resolve()
    file_path = (BASE_DIR / relative_path).resolve()

    if not file_path.is_relative_to(uploads_root):
        raise HTTPException(
            status_code=400,
            detail="Chemin de fichier invalide."
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Le fichier n'existe pas sur le serveur."
        )

    original_name = file_info.get("name") or file_path.name
    media_type = file_info.get("type") or "application/octet-stream"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=original_name,
        content_disposition_type="attachment" if download else "inline"
    )


# =========================================================
# GESTIONNAIRE - DASHBOARD
# =========================================================

@app.get(
    "/gestionnaire/dashboard"
)
def gestionnaire_dashboard(
    current_user=Depends(
        get_current_gestionnaire
    )
):
    total = (
        reclamations_collection.count_documents(
            {}
        )
    )

    soumises = (
        reclamations_collection.count_documents(
            {
                "statut": "Soumise"
            }
        )
    )

    en_cours = (
        reclamations_collection.count_documents(
            {
                "statut": "En cours"
            }
        )
    )

    traitees = (
        reclamations_collection.count_documents(
            {
                "statut": "Traitée"
            }
        )
    )

    fausses = (
        reclamations_collection.count_documents(
            {
                "statut": "Fausse"
            }
        )
    )

    annulees = (
        reclamations_collection.count_documents(
            {
                "statut": "Annulée"
            }
        )
    )

    reclamations_recentes = list(
        reclamations_collection.find().sort(
            "dateEnregistrement",
            -1
        ).limit(5)
    )

    dernieres = []

    for reclamation in (
        reclamations_recentes
    ):

        user_id = reclamation.get(
            "user_id"
        )

        client_info = None

        if user_id:
            try:
                client_info = (
                    users_collection.find_one(
                        {
                            "_id": ObjectId(
                                user_id
                            )
                        }
                    )
                )

            except Exception:
                client_info = None

        if client_info:

            client_data = {
                "id": str(
                    client_info["_id"]
                ),
                "nom": client_info.get(
                    "nom",
                    ""
                ),
                "prenom": client_info.get(
                    "prenom",
                    ""
                ),
                "email": client_info.get(
                    "email",
                    ""
                ),
            }

        else:

            client_data = {
                "id": user_id,
                "nom": reclamation.get(
                    "clientNom",
                    ""
                ),
                "prenom": reclamation.get(
                    "clientPrenom",
                    ""
                ),
                "email": reclamation.get(
                    "clientEmail",
                    ""
                ),
            }

        reclamation_data = dict(
            reclamation
        )

        reclamation_data["_id"] = str(
            reclamation_data["_id"]
        )

        reclamation_data["client"] = (
            client_data
        )

        if isinstance(
            reclamation_data.get(
                "dateEnregistrement"
            ),
            datetime
        ):
            reclamation_data[
                "dateEnregistrement"
            ] = reclamation_data[
                "dateEnregistrement"
            ].isoformat()

        dernieres.append(
            reclamation_data
        )

    return {
        "statistiques": {
            "total": total,
            "soumises": soumises,
            "enCours": en_cours,
            "traitees": traitees,
            "fausses": fausses,
            "annulees": annulees,
        },
        "dernieresReclamations": (
            dernieres
        )
    }

# =========================================================
# GESTIONNAIRE - MODIFIER LE STATUT D'UNE RECLAMATION
# =========================================================

@app.patch("/gestionnaire/reclamations/{reclamation_id}/statut")
def modifier_statut_reclamation(
    reclamation_id: str,
    payload: UpdateStatutRequest,
    current_user=Depends(get_current_gestionnaire)
):
    """Met à jour le statut en garantissant une prise en charge exclusive."""
    statuts_autorises = {"Soumise", "En cours", "Traitée", "Fausse", "Annulée"}
    if payload.statut not in statuts_autorises:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    try:
        reclamation_id_obj = ObjectId(reclamation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Identifiant de réclamation invalide.")

    reclamation = reclamations_collection.find_one({"_id": reclamation_id_obj})
    if reclamation is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable.")

    manager_id = str(current_user.get("_id"))
    manager_name = " ".join(filter(None, [current_user.get("prenom", ""), current_user.get("nom", "")])).strip()
    if not manager_name:
        manager_name = current_user.get("email", "Gestionnaire")

    assigned_id = reclamation.get("gestionnaire_id")
    current_status = reclamation.get("statut", "Soumise")
    closed_statuses = {"Traitée", "Fausse", "Annulée"}

    if current_status in closed_statuses:
        raise HTTPException(status_code=409, detail="Cette réclamation est déjà clôturée.")

    if assigned_id and str(assigned_id) != manager_id:
        raise HTTPException(
            status_code=409,
            detail=f"Cette réclamation est déjà prise en charge par {reclamation.get('gestionnaire_nom', 'un autre gestionnaire')}."
        )

    if payload.statut == "Soumise" and current_status != "Soumise":
        raise HTTPException(status_code=400, detail="Une réclamation ne peut pas revenir au statut En attente.")

    if payload.statut == "En cours":
        now = datetime.now(timezone.utc)
        set_fields = {"statut": "En cours", "dateModificationStatut": now}

        if not assigned_id:
            # Prise en charge atomique : une seule requête peut attribuer cette réclamation.
            # Supporte les anciennes réclamations non attribuées déjà en "En cours".
            unassigned_filter = {
                "$or": [
                    {"gestionnaire_id": {"$exists": False}},
                    {"gestionnaire_id": None},
                    {"gestionnaire_id": ""},
                ]
            }
            if "statut" in reclamation:
                status_filter = {"statut": current_status}
            else:
                status_filter = {"statut": {"$exists": False}}

            filter_query = {"_id": reclamation_id_obj, **status_filter, **unassigned_filter}
            set_fields.update({
                "gestionnaire_id": manager_id,
                "gestionnaire_nom": manager_name,
                "datePriseEnCharge": now,
            })
            result = reclamations_collection.update_one(filter_query, {"$set": set_fields})
            if result.modified_count != 1:
                latest = reclamations_collection.find_one({"_id": reclamation_id_obj}) or {}
                latest_manager_id = latest.get("gestionnaire_id")
                if latest_manager_id and str(latest_manager_id) != manager_id:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Cette réclamation vient d'être prise en charge par {latest.get('gestionnaire_nom', 'un autre gestionnaire')}."
                    )
                raise HTTPException(status_code=409, detail="La réclamation a changé. Actualisez la page et réessayez.")
        else:
            # Le gestionnaire déjà responsable peut poursuivre le traitement.
            result = reclamations_collection.update_one(
                {"_id": reclamation_id_obj, "gestionnaire_id": manager_id, "statut": current_status},
                {"$set": set_fields}
            )
            if result.matched_count != 1:
                raise HTTPException(status_code=409, detail="La réclamation a changé. Actualisez la page et réessayez.")
    else:
        # Pour clôturer, la réclamation doit être prise en charge par ce gestionnaire.
        if current_status == "Soumise" or not assigned_id:
            raise HTTPException(status_code=409, detail="Cliquez d'abord sur « Prise en charge » avant de modifier le statut.")

        now = datetime.now(timezone.utc)
        result = reclamations_collection.update_one(
            {"_id": reclamation_id_obj, "gestionnaire_id": manager_id, "statut": current_status},
            {"$set": {"statut": payload.statut, "dateModificationStatut": now}}
        )
        if result.matched_count != 1:
            raise HTTPException(status_code=409, detail="La réclamation a changé. Actualisez la page et réessayez.")

    updated = reclamations_collection.find_one({"_id": reclamation_id_obj}) or {}
    date_prise_en_charge = updated.get("datePriseEnCharge")
    return {
        "message": "Statut modifié avec succès.",
        "statut": updated.get("statut", payload.statut),
        "gestionnaire_id": updated.get("gestionnaire_id"),
        "gestionnaire_nom": updated.get("gestionnaire_nom"),
        "datePriseEnCharge": date_prise_en_charge.isoformat() if isinstance(date_prise_en_charge, datetime) else date_prise_en_charge,
        "isAssignedToCurrentUser": str(updated.get("gestionnaire_id", "")) == manager_id,
    }


# =========================================================
# PRÉSENCE GESTIONNAIRE (heartbeat)
# =========================================================

@app.post("/auth/heartbeat")
def auth_heartbeat(current_user=Depends(get_current_user)):
    """Met à jour la dernière activité de l'utilisateur authentifié."""
    now = datetime.now(timezone.utc)
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"lastSeenAt": now}}
    )
    return {"ok": True, "lastSeenAt": now.isoformat()}


# =========================================================
# ADMIN - GESTION DES GESTIONNAIRES
# =========================================================

@app.get("/admin/gestionnaires")
def admin_lister_gestionnaires(
    current_user=Depends(get_current_admin)
):
    gestionnaires = list(
        users_collection.find({"role": "gestionnaire"}).sort("dateCreation", -1)
    )

    resultat = []
    for gestionnaire in gestionnaires:
        date_creation = gestionnaire.get("dateCreation")
        last_seen = gestionnaire.get("lastSeenAt")
        if isinstance(last_seen, str):
            try:
                last_seen_dt = datetime.fromisoformat(last_seen.replace("Z", "+00:00"))
            except ValueError:
                last_seen_dt = None
        else:
            last_seen_dt = last_seen if isinstance(last_seen, datetime) else None
        if last_seen_dt and last_seen_dt.tzinfo is None:
            last_seen_dt = last_seen_dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        online = bool(last_seen_dt and (now - last_seen_dt).total_seconds() <= 90)
        resultat.append({
            "id": str(gestionnaire["_id"]),
            "nom": gestionnaire.get("nom", ""),
            "prenom": gestionnaire.get("prenom", ""),
            "email": gestionnaire.get("email", ""),
            "role": "gestionnaire",
            "dateCreation": date_creation.isoformat() if isinstance(date_creation, datetime) else date_creation,
            "derniereActivite": last_seen_dt.isoformat() if last_seen_dt else None,
            "enLigne": online,
        })
    return resultat


@app.post("/admin/gestionnaires", status_code=201)
def admin_creer_gestionnaire(
    payload: CreateGestionnaireRequest,
    current_user=Depends(get_current_admin)
):
    nom = payload.nom.strip()
    prenom = payload.prenom.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not nom or not prenom or not email:
        raise HTTPException(
            status_code=400,
            detail="Le nom, le prénom et l'email sont obligatoires."
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe doit contenir au moins 8 caractères."
        )

    if users_collection.find_one({"email": email}):
        raise HTTPException(
            status_code=409,
            detail="Un compte avec cet email existe déjà."
        )

    gestionnaire = {
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "password": password_hash.hash(password),
        "role": "gestionnaire",
        "dateCreation": datetime.now(timezone.utc),
        "lastSeenAt": None,
    }

    result = users_collection.insert_one(gestionnaire)
    return {
        "message": "Compte gestionnaire créé avec succès.",
        "gestionnaire": {
            "id": str(result.inserted_id),
            "nom": nom,
            "prenom": prenom,
            "email": email,
            "role": "gestionnaire",
        }
    }
# À ajouter à la fin de backend/main.py
# Cet endpoint permet à un administrateur connecté de supprimer un compte gestionnaire.

@app.delete("/admin/gestionnaires/{gestionnaire_id}")
def admin_supprimer_gestionnaire(
    gestionnaire_id: str,
    current_user=Depends(get_current_admin)
):
    try:
        gestionnaire_object_id = ObjectId(gestionnaire_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Identifiant de gestionnaire invalide."
        )

    resultat = users_collection.delete_one({
        "_id": gestionnaire_object_id,
        "role": "gestionnaire"
    })

    if resultat.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Compte gestionnaire introuvable."
        )

    return {"message": "Compte gestionnaire supprimé avec succès."}

# =========================================================
# ADMIN - COMPTES ADMINISTRATEURS ET RÉCLAMATIONS
# =========================================================

class CreateAdminRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str


class AdminUpdateStatutRequest(BaseModel):
    statut: str


def _admin_serialize_reclamation(item):
    """Convertit une réclamation MongoDB en données JSON utilisables par React."""
    item = dict(item)
    reclamation_id = item.get("_id")
    item["_id"] = str(reclamation_id) if reclamation_id is not None else None

    user_id = item.get("user_id")
    client_info = None
    if user_id:
        try:
            client_info = users_collection.find_one({"_id": ObjectId(str(user_id))})
        except Exception:
            client_info = None

    item["client"] = {
        "id": str(client_info["_id"]) if client_info else (str(user_id) if user_id else None),
        "nom": (client_info or {}).get("nom", item.get("clientNom", "")),
        "prenom": (client_info or {}).get("prenom", item.get("clientPrenom", "")),
        "email": (client_info or {}).get("email", item.get("clientEmail", "")),
    }

    for key, value in list(item.items()):
        if isinstance(value, datetime):
            item[key] = value.isoformat()
    return item


@app.post("/admin/admins", status_code=201)
def admin_creer_admin(
    payload: CreateAdminRequest,
    current_user=Depends(get_current_admin)
):
    nom = payload.nom.strip()
    prenom = payload.prenom.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not nom or not prenom or not email:
        raise HTTPException(status_code=400, detail="Le nom, le prénom et l'email sont obligatoires.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères.")
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Un compte avec cet email existe déjà.")

    result = users_collection.insert_one({
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "password": password_hash.hash(password),
        "role": "admin",
        "dateCreation": datetime.now(timezone.utc),
    })
    return {
        "message": "Compte administrateur créé avec succès.",
        "admin": {
            "id": str(result.inserted_id),
            "nom": nom,
            "prenom": prenom,
            "email": email,
            "role": "admin",
        },
    }


@app.get("/admin/reclamations")
def admin_lister_reclamations(current_user=Depends(get_current_admin)):
    items = list(reclamations_collection.find().sort("dateEnregistrement", -1))
    return [_admin_serialize_reclamation(item) for item in items]


@app.get("/admin/reclamations/{reclamation_id}")
def admin_detail_reclamation(
    reclamation_id: str,
    current_user=Depends(get_current_admin)
):
    try:
        oid = ObjectId(reclamation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Identifiant de réclamation invalide.")

    item = reclamations_collection.find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Réclamation introuvable.")
    return _admin_serialize_reclamation(item)


@app.patch("/admin/reclamations/{reclamation_id}/statut")
def admin_modifier_statut_reclamation(
    reclamation_id: str,
    payload: AdminUpdateStatutRequest,
    current_user=Depends(get_current_admin)
):
    statuts_autorises = {"Soumise", "En cours", "Traitée", "Fausse", "Annulée"}
    if payload.statut not in statuts_autorises:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    try:
        oid = ObjectId(reclamation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Identifiant de réclamation invalide.")

    result = reclamations_collection.update_one(
        {"_id": oid},
        {"$set": {
            "statut": payload.statut,
            "dateModificationStatut": datetime.now(timezone.utc),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réclamation introuvable.")

    return {"message": "Statut modifié avec succès.", "statut": payload.statut}

