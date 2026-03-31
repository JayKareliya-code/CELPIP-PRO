# Export all models for Alembic — Phase 1 + Phase 2
from app.models.base import Base
from app.models.user import User
from app.models.subscription import Subscription
from app.models.prompt import SpeakingPrompt, WritingPrompt
from app.models.attempt import Attempt, SpeakingAttempt, WritingAttempt
from app.models.calibration import CalibrationSample

# Phase 2 additions
from app.models.ai_cost_log import AICostLog
from app.models.score_report import ScoreReport, ScoreDimension
from app.models.transcript import Transcript
from app.models.feedback_report import FeedbackReport

__all__ = [
    # Phase 1
    "Base", "User", "Subscription",
    "SpeakingPrompt", "WritingPrompt",
    "Attempt", "SpeakingAttempt", "WritingAttempt",
    "CalibrationSample",
    # Phase 2
    "AICostLog",
    "ScoreReport", "ScoreDimension",
    "Transcript",
    "FeedbackReport",
]
