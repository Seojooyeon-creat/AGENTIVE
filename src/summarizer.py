"""Claude API를 사용한 공지사항 요약"""

import json
import anthropic
from dataclasses import dataclass


@dataclass
class NoticeSummary:
    summary: str
    apply_period: str | None      # 신청 기간 텍스트 (예: "2026.04.01 ~ 2026.04.30")
    apply_start: str | None       # 신청 시작일 ISO (YYYY-MM-DD)
    apply_deadline: str | None    # 신청 마감일 ISO (YYYY-MM-DD)
    activity_period: str | None   # 활동/교육 기간 텍스트
    activity_start: str | None    # 활동 시작일 ISO (YYYY-MM-DD)
    activity_end: str | None      # 활동 종료일 ISO (YYYY-MM-DD)
    action: str | None            # 학생 행동 필요 사항


SYSTEM_PROMPT = """당신은 충남대학교 학생들을 위한 공지사항 요약 어시스턴트입니다.
공지사항을 분석하여 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "summary": "핵심 내용 1~2문장 (필수, 300자 이내)",
  "apply_period": "신청/접수 기간 전체 텍스트 (예: '2026.04.01 ~ 2026.04.30', 없으면 null)",
  "apply_start": "신청 시작일 ISO 형식 (예: '2026-04-01', 없으면 null)",
  "apply_deadline": "신청 마감일 ISO 형식 (예: '2026-04-30', 없으면 null)",
  "activity_period": "활동/교육/행사 기간 전체 텍스트 (예: '2026.05.01 ~ 2026.05.31', 없으면 null)",
  "activity_start": "활동 시작일 ISO 형식 (예: '2026-05-01', 없으면 null)",
  "activity_end": "활동 종료일 ISO 형식 (예: '2026-05-31', 없으면 null)",
  "action": "학생이 해야 할 행동 (예: '포털에서 신청서 제출', 없으면 null)"
}

규칙:
- apply_start / apply_deadline: 신청기간의 첫날 / 마지막날
- activity_start / activity_end: 활동기간의 첫날 / 마지막날
- 날짜를 확인할 수 없으면 반드시 null로 설정"""


def summarize_notice(title: str, content: str) -> NoticeSummary:
    """공지사항 제목과 본문을 구조화하여 요약"""
    client = anthropic.Anthropic()

    user_message = f"공지 제목: {title}\n\n공지 내용:\n{content[:2000]}"

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return NoticeSummary(
            summary=raw[:300],
            apply_period=None,
            apply_start=None,
            apply_deadline=None,
            activity_period=None,
            activity_start=None,
            activity_end=None,
            action=None,
        )

    return NoticeSummary(
        summary=data.get("summary", ""),
        apply_period=data.get("apply_period"),
        apply_start=data.get("apply_start"),
        apply_deadline=data.get("apply_deadline"),
        activity_period=data.get("activity_period"),
        activity_start=data.get("activity_start"),
        activity_end=data.get("activity_end"),
        action=data.get("action"),
    )


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
