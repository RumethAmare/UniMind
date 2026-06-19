from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import NotFoundError
from app.db.models import User
from app.db.repositories import CourseRepository
from app.db.session import get_session
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate

router = APIRouter()


@router.get("", response_model=list[CourseRead])
async def list_courses(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await CourseRepository(session).list_for_user(current_user.id)


@router.post("", response_model=CourseRead, status_code=201)
async def create_course(
    payload: CourseCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    course = await CourseRepository(session).create(current_user.id, payload.name, payload.description)
    await session.commit()
    return course


@router.get("/{course_id}", response_model=CourseRead)
async def get_course(
    course_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    course = await CourseRepository(session).get_for_user(course_id, current_user.id)
    if course is None:
        raise NotFoundError("Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseRead)
async def update_course(
    course_id: UUID,
    payload: CourseUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    repo = CourseRepository(session)
    course = await repo.get_for_user(course_id, current_user.id)
    if course is None:
        raise NotFoundError("Course not found")
    course = await repo.update(course, payload.name, payload.description)
    await session.commit()
    return course


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    repo = CourseRepository(session)
    course = await repo.get_for_user(course_id, current_user.id)
    if course is None:
        raise NotFoundError("Course not found")
    await repo.delete(course)
    await session.commit()

