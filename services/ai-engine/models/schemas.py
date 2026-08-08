from pydantic import BaseModel, Field, validator
from typing import Optional

class SessionStartRequest(BaseModel):
    class_id: str
    opened_at: Optional[str] = None
    online_mode: bool = False
    face_id_required: bool = True
    location_required: bool = True
    geo_lat: float = Field(default=3.115)
    geo_lng: float = Field(default=101.655)
    geo_radius_meters: int = Field(default=50)

class AssessmentCreateRequest(BaseModel):
    title: str
    type: str  # 'Continuous', 'Midterm', 'Final'
    weightage: float
    total_marks: int

class ScoreSaveRequest(BaseModel):
    student_id: str
    score_achieved: float

class StudentMeritClaimRequest(BaseModel):
    title: str
    category: str
    description: str
    proof_file_url: str
    awarded_points: float = 10.0

    @validator('title', 'category', 'description', 'proof_file_url')
    def check_non_empty(cls, v):
        if not v or not v.strip() or v.strip() == 'https://':
            raise ValueError('Field cannot be empty or default placeholder')
        return v.strip()

class InterventionCreateRequest(BaseModel):
    student_id: str
    class_id: str
    issue_description: str
    status: str
    priority: str
    schedule_advising: bool = False

    @validator('student_id', 'class_id', 'issue_description', 'status', 'priority')
    def check_fields_non_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Fields cannot be empty')
        return v.strip()

class AdminUserCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    institutional_id: str
    affiliation: str
    phone_number: Optional[str] = None
    office_location: Optional[str] = None

    @validator('full_name', 'email', 'role', 'institutional_id', 'affiliation')
    def check_mandatory(cls, v):
        if not v or not v.strip():
            raise ValueError('Mandatory field cannot be empty')
        return v.strip()

class AdminUserUpdateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    institutional_id: Optional[str] = None
    phone_number: Optional[str] = None
    office_location: Optional[str] = None
    affiliation: Optional[str] = None

class AdminSubjectCreateRequest(BaseModel):
    code: str
    name: str
    credit_hours: int

class AdminClassCreateRequest(BaseModel):
    subject_id: str
    lecturer_id: str
    group_code: str
    type: str
    semester: str
    day_of_week: str
    start_time: str
    end_time: str
    location: str

class AdminEnrollmentRequest(BaseModel):
    student_id: str
    class_id: str

class AdminInterventionUpdateRequest(BaseModel):
    status: str
    priority: str
    issue_description: str

class AdminMeritReviewRequest(BaseModel):
    status: str
    awarded_points: float

class AdminSettingsUpdateRequest(BaseModel):
    attendance_threshold: int = Field(default=80, ge=50, le=100)
    default_geofence_radius: int = Field(default=50, ge=10, le=500)
    grade_drop_threshold: int = Field(default=20, ge=5, le=50)
    mandatory_face_id: bool = True
    mandatory_location: bool = True
    max_merit_points_per_claim: float = Field(default=50.0, ge=1.0, le=500.0)
    default_merit_points_recommended: float = Field(default=10.0, ge=1.0, le=100.0)
    auto_email_absence_alert: bool = True
    auto_escalate_intervention_days: int = Field(default=3, ge=1, le=30)
    maintenance_mode: bool = False
    default_user_password: str = Field(default="password123", min_length=6)
    session_timeout_hours: int = Field(default=12, ge=1, le=168)
    enable_audit_logs: bool = True

