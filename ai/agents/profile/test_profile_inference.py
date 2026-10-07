# test_profile_inference.py
import asyncio

from ai.agents.profile.llm_inference import infer_profile


async def main():
    result = await infer_profile(
        query="Explain recursion simply with examples, I have an exam tomorrow",
        history=[
            {"role": "user", "content": "I get confused with recursion"},
            {"role": "assistant", "content": "Let’s break it down step by step"},
        ],
        user_profile={
            "preferred_language": "en",
            "academic_level": "undergraduate",
            "department": "software engineering",
        },
        signals={
            "asked_for_examples_count": 2,
            "asked_for_simplification_count": 1,
            "prefers_short_answers": False,
            "prefers_detailed_answers": False,
            "exam_related": True,
            "practice_related": False,
            "signs_of_confusion": True,
            "topic_domain": "computer_science",
        },
    )

    print(result.model_dump())


if __name__ == "__main__":
    asyncio.run(main())