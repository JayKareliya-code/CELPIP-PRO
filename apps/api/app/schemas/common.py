from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response — `per_page` matches the frontend TypeScript interface."""
    items:    list[T]
    total:    int
    page:     int
    per_page: int   # renamed from `size` to match frontend PaginatedResponse<T>
    pages:    int
