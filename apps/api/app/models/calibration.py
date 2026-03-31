import uuid
from sqlalchemy import Text, Integer, Numeric, Boolean, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

class CalibrationSample(Base, TimestampMixin):
    __tablename__ = "calibration_samples"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    skill: Mapped[str] = mapped_column(Text, nullable=False)
    task_number: Mapped[int | None] = mapped_column(Integer)
    band_level: Mapped[float] = mapped_column(Numeric(3, 1), nullable=False)
    sample_text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, default="official", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        CheckConstraint("skill IN ('speaking', 'writing')", name="check_calibration_skill"),
        Index("idx_calibration_skill_task", "skill", "task_number"),
    )
