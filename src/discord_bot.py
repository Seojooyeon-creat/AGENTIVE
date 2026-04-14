"""AGENTIVE 디스코드 Q&A 챗봇 (별도 서버에서 상시 실행)

실행: python discord_bot.py
호스팅: Railway, Fly.io, 또는 개인 서버
"""

import os
import asyncio
import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv

from summarizer import answer_question
from main import run_pipeline

load_dotenv()

TOKEN = os.environ["DISCORD_BOT_TOKEN"]

# 대화 이력 저장 (user_id → 최근 메시지 목록)
# 실서비스에서는 Redis 등으로 교체 권장
conversation_history: dict[int, list[dict]] = {}
MAX_HISTORY = 10  # 최근 10턴만 유지


intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


@tasks.loop(hours=3)
async def crawl_task():
    """3시간마다 공지 크롤링 → 요약 → 디스코드 전송"""
    print("[크롤링 스케줄러] 파이프라인 시작")
    await asyncio.get_event_loop().run_in_executor(None, run_pipeline)


@bot.event
async def on_ready():
    await bot.tree.sync()
    crawl_task.start()
    print(f"[AGENTIVE 봇] 로그인: {bot.user} (ID: {bot.user.id})")


@bot.tree.command(name="질문", description="충남대 학교생활 관련 질문하기")
async def ask(interaction: discord.Interaction, 질문내용: str):
    """슬래시 커맨드 /질문 [내용]"""
    await interaction.response.defer(thinking=True)

    user_id = interaction.user.id
    history = conversation_history.get(user_id, [])

    try:
        answer = answer_question(질문내용, history)

        # 대화 이력 업데이트
        history.append({"role": "user", "content": 질문내용})
        history.append({"role": "assistant", "content": answer})
        # 최근 N턴만 유지
        conversation_history[user_id] = history[-(MAX_HISTORY * 2):]

        embed = discord.Embed(
            title="💬 AGENTIVE 답변",
            description=answer,
            color=0x0066CC,
        )
        embed.set_footer(text=f"질문: {질문내용[:80]}")
        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(
            f"⚠️ 오류가 발생했습니다: {e}", ephemeral=True
        )


@bot.tree.command(name="대화초기화", description="AI와의 대화 기록을 초기화합니다")
async def reset(interaction: discord.Interaction):
    user_id = interaction.user.id
    conversation_history.pop(user_id, None)
    await interaction.response.send_message("✅ 대화 기록이 초기화되었습니다.", ephemeral=True)


@bot.event
async def on_message(message: discord.Message):
    """봇 멘션 시 자동 응답 (슬래시 커맨드 대신 멘션으로도 사용 가능)"""
    if message.author.bot:
        return

    # 봇 멘션 감지
    if bot.user in message.mentions:
        # 멘션 제거 후 질문 추출
        question = message.content.replace(f"<@{bot.user.id}>", "").strip()
        if not question:
            await message.reply("안녕하세요! 충남대 학교생활에 관해 궁금한 점을 물어보세요. 😊\n예) `@AGENTIVE 수강신청 일정이 언제야?`")
            return

        async with message.channel.typing():
            user_id = message.author.id
            history = conversation_history.get(user_id, [])

            try:
                answer = answer_question(question, history)

                history.append({"role": "user", "content": question})
                history.append({"role": "assistant", "content": answer})
                conversation_history[user_id] = history[-(MAX_HISTORY * 2):]

                await message.reply(answer)
            except Exception as e:
                await message.reply(f"⚠️ 오류가 발생했습니다: {e}")

    await bot.process_commands(message)


if __name__ == "__main__":
    bot.run(TOKEN)
