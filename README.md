# Canadian Physician Recruitment — Django REST API

A complete backend API for the Canadian Physician Recruitment Platform, connecting job-seeking physicians with healthcare employers and recruiters across Canada.

---

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- pip

---

## Installation

```bash
# 1. Clone / enter the project directory
cd CanadianMedProject

# 2. Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Environment Setup

Copy `.env` and fill in your values:

```bash
cp .env .env.local   # optional — edit .env directly
```

Required `.env` variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key (generate a strong random string) |
| `DEBUG` | `True` for dev, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | Database host (default: localhost) |
| `DB_PORT` | Database port (default: 5432) |
| `AWS_ACCESS_KEY_ID` | AWS key (leave blank to use local media storage) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name |
| `AWS_S3_REGION_NAME` | AWS region (default: ca-central-1) |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_HOST_USER` | Email address |
| `EMAIL_HOST_PASSWORD` | Email app password |
| `FRONTEND_URL` | Frontend URL for password reset links |

---

## Database Setup

```bash
# Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE canadian_med_db;"

# Run migrations
python manage.py migrate

# Create a superuser (admin)
python manage.py createsuperuser
```

---

## Run Development Server

```bash
python manage.py runserver
```

Server starts at: `http://127.0.0.1:8000`

---

## API Documentation

| URL | Description |
|---|---|
| `/api/docs/` | Swagger UI (interactive) |
| `/api/redoc/` | ReDoc documentation |
| `/api/schema/` | OpenAPI schema (JSON/YAML) |

---

## API Endpoints Overview

### Authentication (`/api/auth/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register/physician/` | Public | Register as physician |
| POST | `/api/auth/register/employer/` | Public | Register as employer |
| POST | `/api/auth/login/` | Public | Login — returns JWT tokens |
| POST | `/api/auth/logout/` | Auth | Logout — blacklists refresh token |
| POST | `/api/auth/token/refresh/` | Public | Refresh access token |
| POST | `/api/auth/password/reset/` | Public | Request password reset email |
| POST | `/api/auth/password/reset/confirm/` | Public | Confirm password reset |
| GET/PUT | `/api/auth/me/` | Auth | Get / update current user info |

### Profiles (`/api/profile/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET/PUT | `/api/profile/physician/` | Physician | Get / update physician profile |
| POST | `/api/profile/physician/resume/` | Physician | Upload resume (PDF/DOC/DOCX, max 5MB) |
| GET/PUT | `/api/profile/employer/` | Employer | Get / update employer profile |

### Jobs (`/api/jobs/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/jobs/` | Public | List active approved jobs (filterable) |
| POST | `/api/jobs/` | Employer | Create job posting |
| GET | `/api/jobs/{id}/` | Public | Job detail (increments view count) |
| PUT | `/api/jobs/{id}/` | Employer (owner) | Update job |
| DELETE | `/api/jobs/{id}/` | Employer (owner) | Delete job |
| GET | `/api/jobs/my-jobs/` | Employer | Own job listings |
| POST | `/api/jobs/{id}/apply/` | Physician | Apply to job |
| GET | `/api/jobs/my-applications/` | Physician | Own applications |
| DELETE | `/api/jobs/applications/{id}/` | Physician | Withdraw application |
| POST | `/api/jobs/{id}/save/` | Physician | Save a job |
| DELETE | `/api/jobs/{id}/unsave/` | Physician | Unsave a job |
| GET | `/api/jobs/saved/` | Physician | List saved jobs |
| GET | `/api/jobs/specialties/` | Public | List specialty choices |
| GET | `/api/jobs/sub-specialties/` | Public | List sub-specialty choices |
| GET | `/api/jobs/provinces/` | Public | List Canadian provinces |

**Job Search Filters:**
```
GET /api/jobs/?keyword=cardiology
GET /api/jobs/?specialty=cardiology
GET /api/jobs/?sub_specialty=nephrology
GET /api/jobs/?province=ON
GET /api/jobs/?city=Toronto
GET /api/jobs/?job_type=full_time
GET /api/jobs/?employer=Toronto+General
GET /api/jobs/?ordering=-created_at
GET /api/jobs/?specialty=cardiology&province=ON&job_type=locum
```

### Career Assessments (`/api/assessments/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/assessments/` | Public | Submit career assessment |
| GET | `/api/assessments/` | Admin | List all submissions |
| GET | `/api/assessments/{id}/` | Admin | Assessment detail |
| PATCH | `/api/assessments/{id}/` | Admin | Mark as reviewed |

### Testimonials (`/api/testimonials/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/testimonials/` | Public | List active testimonials |
| POST | `/api/testimonials/` | Admin | Create testimonial |
| PUT | `/api/testimonials/{id}/` | Admin | Update testimonial |
| DELETE | `/api/testimonials/{id}/` | Admin | Delete testimonial |

### Contact (`/api/contact/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/contact/` | Public | Submit contact form |
| GET | `/api/contact/` | Admin | List all submissions |
| PATCH | `/api/contact/{id}/` | Admin | Mark as responded |

### FAQ (`/api/faq/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/faq/` | Public | List active FAQs |
| GET | `/api/faq/?category=physician` | Public | Filter by category |
| POST | `/api/faq/` | Admin | Create FAQ |
| PUT | `/api/faq/{id}/` | Admin | Update FAQ |
| DELETE | `/api/faq/{id}/` | Admin | Delete FAQ |

### Stats (`/api/stats/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/stats/` | Public | Get platform statistics |
| PUT | `/api/stats/` | Admin | Update statistics |

---

## Django Admin

Access at: `http://127.0.0.1:8000/admin/`

Features:
- Full user management (physicians & employers)
- Job approval workflow (bulk approve / deactivate)
- Career assessment review queue
- Testimonials ordering and visibility management
- FAQ ordering and category management
- Contact form response tracking
- Platform stats management

---

## Authentication Flow

The API uses JWT Bearer tokens:

```
Authorization: Bearer <access_token>
```

1. Register or login → receive `access` + `refresh` tokens
2. Include `access` token in `Authorization` header for protected endpoints
3. When access token expires (60 min), use `refresh` token at `/api/auth/token/refresh/`
4. On logout, send `refresh` token to blacklist it

JWT custom claims include: `user_type`, `full_name`, `email`

---

## File Upload Rules

| File Type | Allowed Formats | Max Size |
|---|---|---|
| Resume (physician) | PDF, DOC, DOCX | 5 MB |
| Assessment resume | PDF, DOC, DOCX | 5 MB |
| Testimonial photo | JPG, PNG | 2 MB |

---

## Deployment (Railway / Render)

1. Set all environment variables in the platform dashboard
2. Set `DEBUG=False`
3. Set `ALLOWED_HOSTS=your-domain.com`
4. Set `SECRET_KEY` to a strong random value
5. Configure a PostgreSQL database (Railway/Render provide managed Postgres)
6. Configure AWS S3 for file storage (set `AWS_*` variables)
7. Run build command:
   ```bash
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
   ```
8. Start command:
   ```bash
   gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
   ```
9. Install gunicorn: `pip install gunicorn` and add to requirements.txt

**Render `render.yaml` example:**
```yaml
services:
  - type: web
    name: canadian-med-api
    env: python
    buildCommand: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
    startCommand: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
      - key: DATABASE_URL
        fromDatabase:
          name: canadian-med-db
          property: connectionString
```

---

## Project Structure

```
CanadianMedProject/
├── core/                   # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── pagination.py       # Standard paginator
│   ├── exceptions.py       # Custom error + success responses
│   └── permissions.py      # IsPhysician, IsEmployer, etc.
├── accounts/               # Users, physician & employer profiles
├── jobs/                   # Job listings, applications, saved jobs
├── assessments/            # Free career assessment submissions
├── testimonials/           # Physician testimonials
├── contact/                # Contact form submissions
├── faq/                    # FAQ items
├── stats/                  # Platform statistics + signals
├── media/                  # Local file uploads (dev only)
├── staticfiles/            # Collected static files
├── .env                    # Environment variables
├── requirements.txt
└── manage.py
```
