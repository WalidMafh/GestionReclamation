# GestionReclamation — Claims Management System
# GestionReclamation — Claims Management System

A web-based claims management application developed to simplify the creation, assignment, processing, and tracking of customer claims.

The application provides dedicated interfaces for administrators and claims managers, helping teams manage claims efficiently and monitor their performance.

## Features

### Authentication & User Management
- User authentication and role-based access.
- Dedicated administrator and claims manager spaces.
- Management of claims manager accounts.

### Claims Management
- Create and manage customer claims.
- Support for production and accident-related claims.
- Assign claims to claims managers.
- Track claim statuses throughout the processing workflow.

### Tracking & Monitoring
- View assigned claims and their current status.
- Follow claim processing progress.
- Access claim details and related customer information.

### Statistics & Performance
- Customer activity and claims statistics.
- Claims distribution by status.
- Individual claims manager performance indicators.
- Validation rates and claims processing statistics.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | MongoDB |
| API | REST API |
| Development Tools | Visual Studio Code, Git, GitHub |

## Project Structure

```text
GestionReclamation/
├── Admin/
├── Authentication/
├── Gestionnaire/
├── Reclamation/
├── backend/
├── .gitignore
├── package.json
└── package-lock.json
```

*The structure above provides an overview of the main application modules.*

## Getting Started

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- [Python](https://www.python.org/)
- [MongoDB](https://www.mongodb.com/try/download/community)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/WalidMafh/GestionReclamation.git
cd GestionReclamation
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the backend

Open a terminal in the backend directory:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install the backend dependencies according to the project's dependency file. If the project contains `requirements.txt`, run:

```bash
pip install -r requirements.txt
```

Configure the required environment variables and ensure MongoDB is running before starting the backend.

### 4. Start the backend

If the FastAPI application entry point is `main.py`, run:

```bash
uvicorn main:app --reload
```

The API will normally be available at:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

### 5. Start the frontend

Open another terminal in the project root directory and run:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Security

- Do not commit passwords, secret keys, or sensitive environment variables.
- Keep `.env` files out of version control.
- Use environment variables for sensitive configuration.

## Project Purpose

This project aims to improve the organization and monitoring of customer claims by centralizing claim management, facilitating assignment to claims managers, and providing useful performance indicators.

## Author

**Walid Mafhoum**

GitHub: [@WalidMafh](https://github.com/WalidMafh)

---

*Developed as a web application project for claims management and workflow monitoring.*
