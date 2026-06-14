from uuid import uuid4

import pytest

from app.core.errors import NotFoundError
from app.services.chat import ChatService


class FakeSession:
    def __init__(self):
        self.commits = 0

    async def commit(self):
        self.commits += 1


class FakeChatRepo:
    def __init__(self, chat_session):
        self.chat_session = chat_session
        self.deleted = []

    async def get_session(self, session_id, user_id):
        return self.chat_session

    async def delete_session(self, session_id, user_id):
        self.deleted.append((session_id, user_id))


@pytest.mark.asyncio
async def test_delete_session_deletes_owned_chat_and_commits():
    session_id = uuid4()
    user_id = uuid4()
    db_session = FakeSession()
    service = ChatService(db_session)
    service.chats = FakeChatRepo(chat_session=object())

    await service.delete_session(session_id, user_id)

    assert service.chats.deleted == [(session_id, user_id)]
    assert db_session.commits == 1


@pytest.mark.asyncio
async def test_delete_session_raises_not_found_for_missing_chat():
    db_session = FakeSession()
    service = ChatService(db_session)
    service.chats = FakeChatRepo(chat_session=None)

    with pytest.raises(NotFoundError):
        await service.delete_session(uuid4(), uuid4())

    assert service.chats.deleted == []
    assert db_session.commits == 0
