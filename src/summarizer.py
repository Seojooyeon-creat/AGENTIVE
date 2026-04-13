"""Claude API를 사용한 공지사항 요약"""

import anthropic

SYSTEM_PROMPT = """당신은 충남대학교 학생들을 위한 공지사항 요약 어시스턴트입니다.
공지사항의 핵심 내용을 한국어로 간결하고 명확하게 요약하세요.

요약 형식:
- 📌 **핵심 내용**: (1~2문장 요약)
- 📅 **중요 일정**: (날짜/마감일이 있으면 반드시 포함, 없으면 생략)
- ✅ **학생 행동 필요**: (신청, 제출, 참석 등 해야 할 일, 없으면 생략)

없는 항목은 생략하고, 300자 이내로 작성하세요."""


def summarize_notice(title: str, content: str) -> str:
    """공지사항 제목과 본문을 요약"""
    client = anthropic.Anthropic()

    user_message = f"공지 제목: {title}\n\n공지 내용:\n{content[:2000]}"

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        return stream.get_final_message().content[0].text


def answer_question(question: str, conversation_history: list[dict]) -> str:
    """디스코드 Q&A 챗봇용: 학생 질문에 답변"""
    client = anthropic.Anthropic()

    system = """당신은 충남대학교 학생들을 위한 AI 도우미 'AGENTIVE'입니다.
학교생활, 수강신청, 장학금, 졸업요건, 학사일정 등 학교 관련 질문에 친절하게 답변하세요.
모르는 정보는 솔직히 모른다고 하고, 공식 사이트(plus.cnu.ac.kr)를 안내하세요.
답변은 한국어로, 500자 이내로 작성하세요."""

    messages = conversation_history + [{"role": "user", "content": question}]

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=600,
        system=system,
        messages=messages,
    )
    return response.content[0].text
