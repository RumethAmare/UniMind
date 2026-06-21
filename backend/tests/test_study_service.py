from uuid import uuid4

import pytest

from app.core.errors import NotFoundError
from app.services.study import StudyService


class FakeSession:
    def __init__(self):
        self.commits = 0

    async def commit(self):
        self.commits += 1


class FakeArtifactRepository:
    def __init__(self, artifact):
        self.artifact = artifact
        self.deleted = []

    async def get_for_user(self, artifact_id, user_id):
        return self.artifact

    async def delete(self, artifact):
        self.deleted.append(artifact)


@pytest.mark.asyncio
async def test_delete_artifact_deletes_owned_session_and_commits():
    db_session = FakeSession()
    artifact = object()
    service = StudyService(db_session)
    service.artifacts = FakeArtifactRepository(artifact)

    await service.delete_artifact(uuid4(), uuid4())

    assert service.artifacts.deleted == [artifact]
    assert db_session.commits == 1


@pytest.mark.asyncio
async def test_get_artifact_raises_not_found_for_missing_session():
    service = StudyService(FakeSession())
    service.artifacts = FakeArtifactRepository(None)

    with pytest.raises(NotFoundError):
        await service.get_artifact(uuid4(), uuid4())
