# -*- coding: utf-8 -*-
"""
Full endpoint test - Canadian Physician Recruitment API
Run: python test_all_endpoints.py
"""
import json, sys, subprocess, os
import urllib.request, urllib.error

BASE = "http://127.0.0.1:8000"
results = []

sys.stdout.reconfigure(encoding='utf-8')


def req(method, path, data=None, token=None, label="", expect_fail=False):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            raw = resp.read().decode()
            parsed = json.loads(raw)
            http_ok = True
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        http_ok = False
        status = e.code
    except Exception as ex:
        parsed = {"error": str(ex)}
        http_ok = False
        status = 0

    # If we expect a failure, flip the pass/fail logic
    passed = (not http_ok) if expect_fail else http_ok
    tag_status = "PASS" if passed else "FAIL"
    tag_http = f"[{status}]"
    display = label or f"{method} {path}"
    note = " (expected fail)" if expect_fail and not http_ok else ""

    results.append((passed, tag_http, display))
    print(f"  [{tag_status}] {tag_http} {display}{note}")
    if not passed:
        snippet = json.dumps(parsed, indent=2)[:400]
        print(f"        {snippet}")
    return parsed, http_ok


def section(title):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}")


# =========================================================
# CLEAN UP previous test data
# =========================================================
cleanup = """
import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()
from accounts.models import CustomUser
from jobs.models import Job
from assessments.models import CareerAssessment
from contact.models import ContactSubmission
from faq.models import FAQ
from testimonials.models import Testimonial

CustomUser.objects.filter(email__in=[
    'test.physician@medtest.ca',
    'test.employer@hospital.ca'
]).delete()
Job.objects.all().delete()
CareerAssessment.objects.all().delete()
ContactSubmission.objects.all().delete()
FAQ.objects.all().delete()
Testimonial.objects.all().delete()
print("cleanup done")
"""
r = subprocess.run(
    [r"venv\Scripts\python.exe", "-c", cleanup],
    capture_output=True, text=True,
    cwd=os.path.dirname(os.path.abspath(__file__))
)
print(f"[SETUP] {r.stdout.strip() or r.stderr.strip()}")


# =========================================================
# 1. PUBLIC ENDPOINTS
# =========================================================
section("1. PUBLIC ENDPOINTS")

req("GET", "/api/stats/",              label="GET /api/stats/ - platform stats")
req("GET", "/api/jobs/specialties/",   label="GET /api/jobs/specialties/")
req("GET", "/api/jobs/sub-specialties/", label="GET /api/jobs/sub-specialties/")
req("GET", "/api/jobs/provinces/",     label="GET /api/jobs/provinces/")
req("GET", "/api/jobs/",               label="GET /api/jobs/ - public list (empty)")
req("GET", "/api/testimonials/",       label="GET /api/testimonials/ - public list")
req("GET", "/api/faq/",                label="GET /api/faq/ - public list")
req("GET", "/api/faq/?category=physician", label="GET /api/faq/?category=physician")


# =========================================================
# 2. PHYSICIAN REGISTER + AUTH
# =========================================================
section("2. PHYSICIAN REGISTRATION & AUTH")

r, _ = req("POST", "/api/auth/register/physician/",
    data={
        "email": "test.physician@medtest.ca",
        "confirm_email": "test.physician@medtest.ca",
        "first_name": "Fatima",
        "last_name": "Rahman",
        "phone": "6471112222",
        "password": "Doctor123",
        "confirm_password": "Doctor123",
        "terms_accepted": True,
        "specialty": "neurology",
        "sub_specialty": "critical_care",
        "cpso_number": "CPSO12345",
        "board_certifications": "FRCPC",
        "degrees": "MD, MBBS",
        "country": "Canada",
        "address": "123 Medical Ave, Toronto, ON",
        "zip_code": "M4B 1B3",
        "work_eligibility": True,
    },
    label="POST /api/auth/register/physician/")
PHYS_TOKEN    = r.get("data", {}).get("access", "")
PHYS_REFRESH  = r.get("data", {}).get("refresh", "")

r2, _ = req("POST", "/api/auth/login/",
    data={"email": "test.physician@medtest.ca", "password": "Doctor123"},
    label="POST /api/auth/login/ - physician login")
PHYS_TOKEN   = r2.get("data", {}).get("access", PHYS_TOKEN)
PHYS_REFRESH = r2.get("data", {}).get("refresh", PHYS_REFRESH)

req("GET",  "/api/auth/me/",
    token=PHYS_TOKEN, label="GET /api/auth/me/ - current physician")

req("PUT",  "/api/auth/me/",
    data={"first_name": "Fatima", "phone": "6479998888"},
    token=PHYS_TOKEN, label="PUT /api/auth/me/ - update name & phone")

req("POST", "/api/auth/token/refresh/",
    data={"refresh": PHYS_REFRESH},
    label="POST /api/auth/token/refresh/ - get new access token")

# duplicate email should fail
req("POST", "/api/auth/register/physician/",
    data={
        "email": "test.physician@medtest.ca",
        "first_name": "X", "last_name": "Y",
        "password": "Doctor123", "confirm_password": "Doctor123",
        "user_type": "physician",
    },
    label="POST register duplicate email (EXPECTED FAIL)", expect_fail=True)

# bad password should fail
req("POST", "/api/auth/register/physician/",
    data={
        "email": "new2@test.ca",
        "first_name": "X", "last_name": "Y",
        "password": "abc",
        "confirm_password": "abc",
        "terms_accepted": True,
    },
    label="POST register weak password (EXPECTED FAIL)", expect_fail=True)

# mismatched email should fail
req("POST", "/api/auth/register/physician/",
    data={
        "email": "new3@test.ca",
        "confirm_email": "different@test.ca",
        "first_name": "X", "last_name": "Y",
        "password": "Doctor123",
        "confirm_password": "Doctor123",
        "terms_accepted": True,
    },
    label="POST register mismatched email (EXPECTED FAIL)", expect_fail=True)

# terms not accepted should fail
req("POST", "/api/auth/register/physician/",
    data={
        "email": "new4@test.ca",
        "confirm_email": "new4@test.ca",
        "first_name": "X", "last_name": "Y",
        "password": "Doctor123",
        "confirm_password": "Doctor123",
        "terms_accepted": False,
    },
    label="POST register terms not accepted (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 3. PHYSICIAN PROFILE
# =========================================================
section("3. PHYSICIAN PROFILE")

req("GET", "/api/profile/physician/",
    token=PHYS_TOKEN, label="GET /api/profile/physician/")

req("PUT", "/api/profile/physician/",
    data={
        "specialty": "neurology",
        "sub_specialty": "critical_care",
        "cpso_number": "CPSO99999",
        "board_certifications": "FRCPC, ABPN",
        "degrees": "MD (McGill), MBBS",
        "country": "Canada",
        "address": "456 Health Blvd, Toronto ON",
        "zip_code": "M5A 2K3",
        "work_eligibility": True,
    },
    token=PHYS_TOKEN, label="PUT /api/profile/physician/ - update profile")

req("GET", "/api/profile/physician/",
    token=PHYS_TOKEN, label="GET /api/profile/physician/ - verify update")


# =========================================================
# 4. EMPLOYER REGISTER + AUTH
# =========================================================
section("4. EMPLOYER REGISTRATION & AUTH")

r3, _ = req("POST", "/api/auth/register/employer/",
    data={
        "email": "test.employer@hospital.ca",
        "confirm_email": "test.employer@hospital.ca",
        "first_name": "John",
        "last_name": "Carter",
        "phone": "4161234567",
        "password": "Employer123",
        "confirm_password": "Employer123",
        "terms_accepted": True,
        "company_name": "Maple Health Network",
        "company_type": "employer",
        "company_phone": "4169990000",
        "address": "100 Hospital Drive, Toronto ON",
        "country": "Canada",
        "zip_code": "M5B 1W8",
        "contact_person_first_name": "John",
        "contact_person_last_name": "Carter",
        "website": "https://maplehealthnetwork.ca",
    },
    label="POST /api/auth/register/employer/")
EMP_TOKEN   = r3.get("data", {}).get("access", "")
EMP_REFRESH = r3.get("data", {}).get("refresh", "")

r4, _ = req("POST", "/api/auth/login/",
    data={"email": "test.employer@hospital.ca", "password": "Employer123"},
    label="POST /api/auth/login/ - employer login")
EMP_TOKEN = r4.get("data", {}).get("access", EMP_TOKEN)

req("GET", "/api/auth/me/",
    token=EMP_TOKEN, label="GET /api/auth/me/ - current employer")


# =========================================================
# 5. EMPLOYER PROFILE
# =========================================================
section("5. EMPLOYER PROFILE")

req("GET", "/api/profile/employer/",
    token=EMP_TOKEN, label="GET /api/profile/employer/")

req("PUT", "/api/profile/employer/",
    data={
        "company_name": "Maple Health Network",
        "company_type": "employer",
        "company_phone": "4160000001",
        "address": "200 Medical Center Pkwy, Toronto ON",
        "country": "Canada",
        "zip_code": "M5G 2N2",
        "website": "https://maplehealthnetwork.ca",
    },
    token=EMP_TOKEN, label="PUT /api/profile/employer/ - update")


# =========================================================
# 6. JOB CRUD
# =========================================================
section("6. JOB CRUD (Employer)")

r5, ok5 = req("POST", "/api/jobs/",
    data={
        "title": "Staff Cardiologist - Full Time",
        "specialty": "cardiac_surgery",
        "sub_specialty": "cardiology",
        "province": "ON",
        "city": "Toronto",
        "description": "We are seeking a board-certified Cardiologist to join our growing cardiac team at Maple Health Network. The successful candidate will provide comprehensive cardiac care including diagnostics, intervention, and patient management in an inpatient and outpatient setting.",
        "qualifications": "FRCPC (Cardiology), Valid CPSO license, minimum 3 years post-residency experience",
        "compensation": "$350,000 to $450,000 annually depending on experience",
        "benefits": "Full benefits, CME allowance, malpractice coverage, relocation assistance",
        "contact_person": "John Carter",
        "contact_email": "hr@maplehealthnetwork.ca",
        "job_type": "full_time",
        "is_active": True,
    },
    token=EMP_TOKEN, label="POST /api/jobs/ - create job 1 (pending approval)")
JOB_ID = r5.get("data", {}).get("id", 1)

r6, ok6 = req("POST", "/api/jobs/",
    data={
        "title": "Locum Neurologist - 3 Month Contract",
        "specialty": "neurology",
        "sub_specialty": "critical_care",
        "province": "BC",
        "city": "Vancouver",
        "description": "Vancouver General Hospital is looking for a licensed Neurologist for a locum engagement covering maternity leave. The role involves inpatient neurology consultations, EEG interpretation, and stroke unit coverage. Excellent remuneration and housing allowance available.",
        "qualifications": "FRCPC Neurology, BC College license or eligible, BLS/ACLS required",
        "compensation": "$2,800/day",
        "benefits": "Housing allowance, travel covered, malpractice covered",
        "contact_person": "John Carter",
        "contact_email": "hr@maplehealthnetwork.ca",
        "job_type": "locum",
        "is_active": True,
    },
    token=EMP_TOKEN, label="POST /api/jobs/ - create job 2 (locum)")
JOB_ID2 = r6.get("data", {}).get("id", 2)

req("GET", "/api/jobs/my-jobs/",
    token=EMP_TOKEN, label="GET /api/jobs/my-jobs/ - employer own listings")

req("PUT", f"/api/jobs/{JOB_ID}/",
    data={"compensation": "$370,000 to $460,000 annually", "is_active": True},
    token=EMP_TOKEN, label=f"PUT /api/jobs/{JOB_ID}/ - update compensation")

# physician cannot create job
req("POST", "/api/jobs/",
    data={"title": "Illegal post"},
    token=PHYS_TOKEN,
    label="POST /api/jobs/ as physician (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 7. ADMIN APPROVE JOBS
# =========================================================
section("7. ADMIN LOGIN + APPROVE JOBS")

r_admin, _ = req("POST", "/api/auth/login/",
    data={"email": "admin@canadianmed.ca", "password": "Admin1234"},
    label="POST /api/auth/login/ - admin")
ADMIN_TOKEN = r_admin.get("data", {}).get("access", "")

approve = """
import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()
from jobs.models import Job
n = Job.objects.filter(is_active=True).update(is_approved=True)
print(f"Approved {n} jobs")
"""
res = subprocess.run(
    [r"venv\Scripts\python.exe", "-c", approve],
    capture_output=True, text=True,
    cwd=os.path.dirname(os.path.abspath(__file__))
)
approved = "Approved" in res.stdout
results.append((approved, "[shell]", "Admin: approve all active jobs"))
print(f"  {'[PASS]' if approved else '[FAIL]'} [shell] Admin: approve all active jobs -- {res.stdout.strip()}")


# =========================================================
# 8. JOB BROWSING & SEARCH (Public)
# =========================================================
section("8. JOB BROWSING & SEARCH (Public after approval)")

req("GET", "/api/jobs/",
    label="GET /api/jobs/ - all approved public jobs")
req("GET", f"/api/jobs/{JOB_ID}/",
    label=f"GET /api/jobs/{JOB_ID}/ - job detail (view count +1)")
req("GET", f"/api/jobs/{JOB_ID}/",
    label=f"GET /api/jobs/{JOB_ID}/ - 2nd view (count = 2)")
req("GET", "/api/jobs/?specialty=cardiac_surgery",
    label="GET /api/jobs/?specialty=cardiac_surgery")
req("GET", "/api/jobs/?specialty=neurology&province=BC",
    label="GET /api/jobs/?specialty=neurology&province=BC")
req("GET", "/api/jobs/?province=ON",
    label="GET /api/jobs/?province=ON")
req("GET", "/api/jobs/?job_type=locum",
    label="GET /api/jobs/?job_type=locum")
req("GET", "/api/jobs/?keyword=cardiologist",
    label="GET /api/jobs/?keyword=cardiologist")
req("GET", "/api/jobs/?city=Toronto",
    label="GET /api/jobs/?city=Toronto")
req("GET", "/api/jobs/?employer=Maple+Health",
    label="GET /api/jobs/?employer=Maple+Health")
req("GET", "/api/jobs/?ordering=-views_count",
    label="GET /api/jobs/?ordering=-views_count")
req("GET", "/api/jobs/?ordering=-created_at",
    label="GET /api/jobs/?ordering=-created_at")


# =========================================================
# 9. PHYSICIAN JOB ACTIONS
# =========================================================
section("9. PHYSICIAN JOB ACTIONS (apply, save, withdraw)")

req("POST", f"/api/jobs/{JOB_ID}/apply/",
    data={"cover_letter": "I am a highly motivated Neurologist with 5 years of experience in critical care neurology. I am excited to apply for this full-time position and contribute to your cardiac team."},
    token=PHYS_TOKEN, label=f"POST /api/jobs/{JOB_ID}/apply/ - apply to job 1")

req("POST", f"/api/jobs/{JOB_ID2}/apply/",
    data={"cover_letter": "I am available for the locum neurology position in Vancouver. FRCPC Neurology, BC license eligible."},
    token=PHYS_TOKEN, label=f"POST /api/jobs/{JOB_ID2}/apply/ - apply to job 2")

req("POST", f"/api/jobs/{JOB_ID}/apply/",
    data={"cover_letter": "Duplicate test"},
    token=PHYS_TOKEN,
    label=f"POST /api/jobs/{JOB_ID}/apply/ - duplicate (EXPECTED FAIL)", expect_fail=True)

req("GET", "/api/jobs/my-applications/",
    token=PHYS_TOKEN, label="GET /api/jobs/my-applications/ - physician applications list")

# save / unsave
req("POST", f"/api/jobs/{JOB_ID}/save/",
    token=PHYS_TOKEN, label=f"POST /api/jobs/{JOB_ID}/save/ - save job 1")
req("POST", f"/api/jobs/{JOB_ID2}/save/",
    token=PHYS_TOKEN, label=f"POST /api/jobs/{JOB_ID2}/save/ - save job 2")
req("POST", f"/api/jobs/{JOB_ID}/save/",
    token=PHYS_TOKEN,
    label=f"POST /api/jobs/{JOB_ID}/save/ - already saved (returns success msg)")

req("GET", "/api/jobs/saved/",
    token=PHYS_TOKEN, label="GET /api/jobs/saved/ - saved jobs (2 items)")

req("DELETE", f"/api/jobs/{JOB_ID2}/unsave/",
    token=PHYS_TOKEN, label=f"DELETE /api/jobs/{JOB_ID2}/unsave/ - unsave job 2")

req("GET", "/api/jobs/saved/",
    token=PHYS_TOKEN, label="GET /api/jobs/saved/ - after unsave (1 item)")

# withdraw application 2
get_apps, _ = req("GET", "/api/jobs/my-applications/",
    token=PHYS_TOKEN, label="GET /api/jobs/my-applications/ - get app IDs")
apps = get_apps.get("data", {}).get("results", get_apps.get("data", []))
if isinstance(apps, list) and len(apps) >= 2:
    APP_ID2 = apps[1]["id"]
    req("DELETE", f"/api/jobs/applications/{APP_ID2}/",
        token=PHYS_TOKEN, label=f"DELETE /api/jobs/applications/{APP_ID2}/ - withdraw app 2")


# =========================================================
# 10. CAREER ASSESSMENT
# =========================================================
section("10. CAREER ASSESSMENT (Public form + Admin review)")

req("POST", "/api/assessments/",
    data={
        "full_name": "Dr. Priya Sharma",
        "email": "priya.sharma@gmail.com",
        "phone": "9876543210",
        "specialty": "Family Medicine",
        "sub_specialty": "Geriatric Medicine",
        "current_location": "Mumbai, India",
        "desired_province_in_canada": "Ontario",
        "years_of_experience": 8,
        "licensure_status": "licensed_other",
        "work_eligibility": "need_sponsorship",
        "career_goals": "I am seeking to relocate to Canada and practice Family Medicine. I have 8 years of experience and am in the process of getting my credentials recognized by the MCCQE.",
        "relocation_support_needed": True,
    },
    label="POST /api/assessments/ - submit career assessment (public)")

req("POST", "/api/assessments/",
    data={
        "full_name": "Dr. Reza Ahmadi",
        "email": "reza.ahmadi@gmail.com",
        "phone": "9001234567",
        "specialty": "Psychiatry",
        "current_location": "Tehran, Iran",
        "desired_province_in_canada": "British Columbia",
        "years_of_experience": 12,
        "licensure_status": "in_process",
        "work_eligibility": "pr",
        "career_goals": "I have completed the MCCQE1 and am awaiting my MCCQE2 date. I am looking for a psychiatry position in BC where I can serve the growing population needing mental health services.",
        "relocation_support_needed": False,
    },
    label="POST /api/assessments/ - submit 2nd assessment")

r_alist, _ = req("GET", "/api/assessments/",
    token=ADMIN_TOKEN, label="GET /api/assessments/ - admin list all")
_alist = r_alist.get("results", r_alist.get("data", {}).get("results", r_alist.get("data", [])))
ASSESS_ID = _alist[0]["id"] if isinstance(_alist, list) and _alist else 1

req("GET", f"/api/assessments/{ASSESS_ID}/",
    token=ADMIN_TOKEN, label=f"GET /api/assessments/{ASSESS_ID}/ - admin detail")

req("PATCH", f"/api/assessments/{ASSESS_ID}/",
    data={"is_reviewed": True},
    token=ADMIN_TOKEN, label=f"PATCH /api/assessments/{ASSESS_ID}/ - mark as reviewed")

req("GET", "/api/assessments/",
    token=PHYS_TOKEN,
    label="GET /api/assessments/ as non-admin (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 11. CONTACT FORM
# =========================================================
section("11. CONTACT FORM")

req("POST", "/api/contact/",
    data={
        "full_name": "Dr. Ali Hassan",
        "email": "ali.hassan@outlook.com",
        "phone": "6041239876",
        "subject": "Question about job posting process",
        "message": "Hi, I am an employer looking to post multiple physician jobs on your platform. Could you please explain the approval process and typical turnaround time for job approvals?",
    },
    label="POST /api/contact/ - submit contact form (public)")

req("POST", "/api/contact/",
    data={
        "full_name": "Jane Smith",
        "email": "jane@clinic.ca",
        "phone": "",
        "subject": "Partnership Inquiry",
        "message": "We are a group of family medicine clinics looking to partner with your platform for physician recruitment across Alberta.",
    },
    label="POST /api/contact/ - 2nd contact form submission")

r_clist, _ = req("GET", "/api/contact/",
    token=ADMIN_TOKEN, label="GET /api/contact/ - admin list all submissions")
_craw = r_clist.get("data", [])
_clist = _craw if isinstance(_craw, list) else _craw.get("results", [])
CONTACT_ID = _clist[0]["id"] if isinstance(_clist, list) and _clist else 1

req("PATCH", f"/api/contact/{CONTACT_ID}/",
    data={"is_responded": True},
    token=ADMIN_TOKEN, label=f"PATCH /api/contact/{CONTACT_ID}/ - mark as responded")

req("GET", "/api/contact/",
    label="GET /api/contact/ unauthenticated (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 12. FAQ
# =========================================================
section("12. FAQ MANAGEMENT")

r_faq1, _ = req("POST", "/api/faq/",
    data={
        "question": "What qualifications do I need to apply for physician positions?",
        "answer": "You must hold a valid medical degree, be eligible for licensure with the College of Physicians and Surgeons in your target province, and have completed residency training recognized by the Royal College of Physicians and Surgeons of Canada (RCPSC) or the College of Family Physicians of Canada (CFPC).",
        "category": "physician",
        "order": 1,
        "is_active": True,
    },
    token=ADMIN_TOKEN, label="POST /api/faq/ - create physician FAQ")

req("POST", "/api/faq/",
    data={
        "question": "How do I post a job as an employer?",
        "answer": "Register as an employer, log in, and use the Post a Job feature. Your job will be reviewed by our admin team and approved within 1-2 business days before it becomes publicly visible.",
        "category": "employer",
        "order": 1,
        "is_active": True,
    },
    token=ADMIN_TOKEN, label="POST /api/faq/ - create employer FAQ")

req("POST", "/api/faq/",
    data={
        "question": "Is there a fee to use the platform?",
        "answer": "Physicians can browse and apply for jobs completely free of charge. Employers are charged a listing fee per job posting. Please contact us for current pricing information.",
        "category": "general",
        "order": 1,
        "is_active": True,
    },
    token=ADMIN_TOKEN, label="POST /api/faq/ - create general FAQ")

FAQ_ID = r_faq1.get("data", {}).get("id", 1)

req("GET", "/api/faq/",                   label="GET /api/faq/ - all active (public)")
req("GET", "/api/faq/?category=physician", label="GET /api/faq/?category=physician")
req("GET", "/api/faq/?category=employer",  label="GET /api/faq/?category=employer")
req("GET", "/api/faq/?category=general",   label="GET /api/faq/?category=general")

req("PUT", f"/api/faq/{FAQ_ID}/",
    data={"order": 10, "is_active": True,
          "question": "What qualifications do I need to apply for physician positions?",
          "answer": "Updated: RCPSC or CFPC recognized training required, plus valid provincial license."},
    token=ADMIN_TOKEN, label=f"PUT /api/faq/{FAQ_ID}/ - update FAQ")

req("PUT", f"/api/faq/{FAQ_ID}/",
    token=PHYS_TOKEN,
    data={"question": "Unauthorized edit"},
    label="PUT FAQ as non-admin (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 13. TESTIMONIALS
# =========================================================
section("13. TESTIMONIALS")

r_t1, _ = req("POST", "/api/testimonials/",
    data={
        "physician_name": "Dr. Amara Osei",
        "specialty": "Emergency Medicine",
        "location": "Calgary, Alberta",
        "testimonial_text": "This platform completely changed my career trajectory. Within 3 weeks of registering I had 4 interview offers across Ontario and Alberta. The process was seamless and the support team was incredibly helpful throughout my credentialing process.",
        "is_active": True,
        "order": 1,
    },
    token=ADMIN_TOKEN, label="POST /api/testimonials/ - create testimonial 1")

req("POST", "/api/testimonials/",
    data={
        "physician_name": "Dr. Chen Wei",
        "specialty": "Pediatrics",
        "location": "Vancouver, British Columbia",
        "testimonial_text": "As an internationally trained physician the journey to practicing medicine in Canada seemed overwhelming. This platform guided me through every step from finding the right opportunities to understanding the licensing process. Highly recommended for any IMGs.",
        "is_active": True,
        "order": 2,
    },
    token=ADMIN_TOKEN, label="POST /api/testimonials/ - create testimonial 2")

TEST_ID = r_t1.get("data", {}).get("id", 1)
req("GET", "/api/testimonials/",
    label="GET /api/testimonials/ - public list (2 items)")

req("PUT", f"/api/testimonials/{TEST_ID}/",
    data={
        "physician_name": "Dr. Amara Osei",
        "specialty": "Emergency Medicine",
        "location": "Calgary, Alberta",
        "testimonial_text": "This platform completely changed my career trajectory. Within 3 weeks of registering I had 4 interview offers!",
        "order": 1, "is_active": True,
    },
    token=ADMIN_TOKEN, label=f"PUT /api/testimonials/{TEST_ID}/ - update text")

req("PUT", f"/api/testimonials/{TEST_ID}/",
    token=PHYS_TOKEN,
    data={"physician_name": "hacker"},
    label="PUT testimonial as non-admin (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 13b. NEW EMPLOYER + PUBLIC ENDPOINTS
# =========================================================
section("13b. EMPLOYER APPLICATIONS + FEATURED RECRUITERS")

req("GET", f"/api/jobs/{JOB_ID}/applications/",
    token=EMP_TOKEN,
    label=f"GET /api/jobs/{JOB_ID}/applications/ - employer views applicants")

req("GET", f"/api/jobs/{JOB_ID}/applications/",
    token=PHYS_TOKEN,
    label=f"GET /api/jobs/{JOB_ID}/applications/ as physician (EXPECTED FAIL)", expect_fail=True)

# get the application ID for the remaining application on JOB_ID
apps_for_job, _ = req("GET", f"/api/jobs/{JOB_ID}/applications/",
    token=EMP_TOKEN,
    label=f"GET /api/jobs/{JOB_ID}/applications/ - get app ID for status update")
# paginated response: {success, count, next, previous, results:[...]}
app_list = apps_for_job.get("results", apps_for_job.get("data", {}).get("results", apps_for_job.get("data", [])))
APP_FOR_STATUS = app_list[0]["id"] if isinstance(app_list, list) and app_list else None

if APP_FOR_STATUS:
    req("PATCH", f"/api/jobs/applications/{APP_FOR_STATUS}/status/",
        data={"status": "shortlisted"},
        token=EMP_TOKEN,
        label=f"PATCH /api/jobs/applications/{APP_FOR_STATUS}/status/ - set shortlisted")

    req("PATCH", f"/api/jobs/applications/{APP_FOR_STATUS}/status/",
        data={"status": "invalid_status"},
        token=EMP_TOKEN,
        label=f"PATCH /api/jobs/applications/{APP_FOR_STATUS}/status/ - bad status (EXPECTED FAIL)", expect_fail=True)

    req("PATCH", f"/api/jobs/applications/{APP_FOR_STATUS}/status/",
        data={"status": "reviewed"},
        token=PHYS_TOKEN,
        label=f"PATCH application status as physician (EXPECTED FAIL)", expect_fail=True)

req("GET", "/api/jobs/featured-recruiters/",
    label="GET /api/jobs/featured-recruiters/ - public featured employers")

req("PATCH", "/api/auth/me/",
    data={"first_name": "Fatima2"},
    token=PHYS_TOKEN,
    label="PATCH /api/auth/me/ - partial update (new endpoint)")

req("GET", f"/api/contact/{CONTACT_ID}/",
    token=ADMIN_TOKEN,
    label=f"GET /api/contact/{CONTACT_ID}/ - admin detail (new endpoint)")

req("GET", f"/api/contact/{CONTACT_ID}/",
    label=f"GET /api/contact/{CONTACT_ID}/ unauthenticated (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 14. PLATFORM STATS (signals + manual update)
# =========================================================
section("14. PLATFORM STATS")

req("GET", "/api/stats/",
    label="GET /api/stats/ - check signal-updated counts")

req("PUT", "/api/stats/",
    data={"new_opportunities": 25, "new_candidates": 12},
    token=ADMIN_TOKEN, label="PUT /api/stats/ - admin manual update")

req("GET", "/api/stats/",
    label="GET /api/stats/ - final values")

req("PUT", "/api/stats/",
    data={"new_opportunities": 99},
    label="PUT /api/stats/ unauthenticated (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 15. LOGOUT + TOKEN BLACKLIST
# =========================================================
section("15. LOGOUT (token blacklisting)")

r_fresh, _ = req("POST", "/api/auth/login/",
    data={"email": "test.physician@medtest.ca", "password": "Doctor123"},
    label="POST /api/auth/login/ - fresh login for logout test")
fresh_refresh = r_fresh.get("data", {}).get("refresh", "")
fresh_access  = r_fresh.get("data", {}).get("access", "")

req("POST", "/api/auth/logout/",
    data={"refresh": fresh_refresh},
    token=fresh_access,
    label="POST /api/auth/logout/ - blacklist refresh token")

# Using the same refresh again should fail
req("POST", "/api/auth/token/refresh/",
    data={"refresh": fresh_refresh},
    label="POST /api/auth/token/refresh/ after logout (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 16. PASSWORD RESET FLOW
# =========================================================
section("16. PASSWORD RESET")

req("POST", "/api/auth/password/reset/",
    data={"email": "test.physician@medtest.ca"},
    label="POST /api/auth/password/reset/ - valid email (email sent silently)")

req("POST", "/api/auth/password/reset/",
    data={"email": "nobody@nowhere.ca"},
    label="POST /api/auth/password/reset/ - invalid email (EXPECTED FAIL)", expect_fail=True)


# =========================================================
# 17. DELETE JOB (employer can delete own job)
# =========================================================
section("17. JOB DELETE")

req("DELETE", f"/api/jobs/{JOB_ID}/",
    token=PHYS_TOKEN,
    label=f"DELETE /api/jobs/{JOB_ID}/ as physician (EXPECTED FAIL)", expect_fail=True)

req("DELETE", f"/api/jobs/{JOB_ID2}/",
    token=EMP_TOKEN,
    label=f"DELETE /api/jobs/{JOB_ID2}/ - employer deletes own job")

req("GET", "/api/jobs/",
    label="GET /api/jobs/ - after delete (1 job remaining)")


# =========================================================
# SUMMARY
# =========================================================
total  = len(results)
passed = sum(1 for r in results if r[0])
failed = total - passed

print(f"\n{'='*65}")
print(f"  FINAL RESULTS: {passed}/{total} passed  |  {failed} failed")
print(f"{'='*65}")

if failed:
    print("\n  Failed tests:")
    for ok, tag, label in results:
        if not ok:
            print(f"    [FAIL] {tag} {label}")
else:
    print("\n  All tests passed!")
