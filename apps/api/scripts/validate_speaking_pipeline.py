from __future__ import annotations
"""
validate_speaking_pipeline.py -- end-to-end smoke test for the speaking pipeline.

Tests each stage independently using real credentials from .env:
  Stage 1 -- S3: generate presigned upload URL -> PUT a tiny test WAV -> download it back
  Stage 2 -- Whisper STT: send downloaded audio bytes -> get transcript
  Stage 3 -- GPT-4o-mini: send transcript to scoring model -> get structured score
  Stage 4 -- Full pipeline summary

Run from apps/api/:
  python scripts/validate_speaking_pipeline.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")



import asyncio
import json
import os
import struct
import sys
import time
import uuid

# -- Load .env before importing app modules ----------------------------------
from pathlib import Path
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print(f"Loaded .env from {env_path}")
else:
    print(f"WARNING: .env not found at {env_path} -- relying on shell environment")

sys.path.insert(0, str(Path(__file__).parent.parent))

import boto3
import httpx
from botocore.config import Config as BotoConfig

# -- Settings -----------------------------------------------------------------
AWS_ACCESS_KEY_ID     = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
S3_BUCKET             = os.environ.get("S3_BUCKET_NAME", "celpip-audio-dev")
S3_REGION             = os.environ.get("S3_REGION", "ca-central-1")
S3_ENDPOINT_URL       = os.environ.get("S3_ENDPOINT_URL")  # None for AWS, set for R2
OPENAI_API_KEY        = os.environ["OPENAI_API_KEY"]
AI_STT_MODEL          = os.environ.get("AI_STT_MODEL", "whisper-1")
AI_SCORING_MODEL      = os.environ.get("AI_SCORING_MODEL", "gpt-4o-mini")

# -- Helpers -------------------------------------------------------------------

def ok(msg: str):   print(f"  [PASS] {msg}")
def err(msg: str):  print(f"  [FAIL] {msg}"); sys.exit(1)
def info(msg: str): print(f"  [INFO] {msg}")


def make_test_wav(duration_ms: int = 2000, sample_rate: int = 16000) -> bytes:
    """Build a minimal valid WAV file with a 440 Hz tone -- just enough for Whisper."""
    import math
    num_samples = int(sample_rate * duration_ms / 1000)
    samples = [
        int(32767 * math.sin(2 * math.pi * 440 * i / sample_rate))
        for i in range(num_samples)
    ]
    pcm = struct.pack(f"<{num_samples}h", *samples)

    # WAV header
    data_size   = len(pcm)
    header_size = 44
    total_size  = header_size + data_size - 8

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", total_size,
        b"WAVE",
        b"fmt ", 16,    # chunk size
        1,              # PCM
        1,              # mono
        sample_rate,
        sample_rate * 2,  # byte rate
        2,              # block align
        16,             # bits per sample
        b"data", data_size,
    )
    return header + pcm


# -- Stage 1: S3 Presigned Upload + Download -----------------------------------

def stage1_s3(test_key: str, wav_bytes: bytes) -> bytes:
    print("\n--- Stage 1: S3 Upload & Download ---")

    boto_kwargs: dict = {
        "aws_access_key_id":     AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
        "region_name":           S3_REGION,
        "config": BotoConfig(signature_version="s3v4"),
    }
    if S3_ENDPOINT_URL:
        boto_kwargs["endpoint_url"] = S3_ENDPOINT_URL
        info(f"Using custom endpoint: {S3_ENDPOINT_URL}")

    s3 = boto3.client("s3", **boto_kwargs)

    # Generate presigned PUT URL (same logic as storage_service.py)
    info(f"Bucket: {S3_BUCKET}  Region: {S3_REGION}")
    info(f"Key: {test_key}")

    try:
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket":      S3_BUCKET,
                "Key":         test_key,
                "ContentType": "audio/wav",
            },
            ExpiresIn=900,
            HttpMethod="PUT",
        )
    except Exception as e:
        err(f"Failed to generate presigned URL: {e}")

    ok(f"Presigned PUT URL generated ({len(upload_url)} chars)")
    info(f"URL host: {upload_url.split('/')[2]}")

    # PUT the file directly to S3 (same as frontend does)
    t0 = time.time()
    resp = httpx.put(upload_url, content=wav_bytes, headers={"Content-Type": "audio/wav"}, timeout=30)
    elapsed = time.time() - t0

    if resp.status_code not in (200, 204):
        err(f"S3 PUT failed: HTTP {resp.status_code}\n{resp.text[:400]}")
    ok(f"PUT {len(wav_bytes):,} bytes -> S3 in {elapsed:.2f}s (HTTP {resp.status_code})")

    # Generate presigned GET URL and download (same as presigner.py does for Celery)
    try:
        download_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": test_key},
            ExpiresIn=300,
        )
    except Exception as e:
        err(f"Failed to generate presigned GET URL: {e}")

    t0 = time.time()
    dl = httpx.get(download_url, timeout=30)
    elapsed = time.time() - t0

    if dl.status_code != 200:
        err(f"S3 GET failed: HTTP {dl.status_code}\n{dl.text[:400]}")

    downloaded = dl.content
    if downloaded != wav_bytes:
        err(f"Downloaded bytes ({len(downloaded):,}) don't match uploaded ({len(wav_bytes):,})")
    ok(f"Downloaded {len(downloaded):,} bytes from S3 in {elapsed:.2f}s -- byte-for-byte match")

    # Clean up test object
    try:
        s3.delete_object(Bucket=S3_BUCKET, Key=test_key)
        ok("Test object deleted from S3")
    except Exception as e:
        info(f"Could not delete test object (non-fatal): {e}")

    return downloaded


# -- Stage 2: Whisper STT ------------------------------------------------------

async def stage2_whisper(audio_bytes: bytes) -> str:
    print("\n--- Stage 2: Whisper STT ---")
    info(f"Model: {AI_STT_MODEL}  Audio size: {len(audio_bytes):,} bytes")

    async with httpx.AsyncClient(
        base_url="https://api.openai.com/v1",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        timeout=httpx.Timeout(60.0, read=90.0),
    ) as client:
        t0 = time.time()
        resp = await client.post(
            "/audio/transcriptions",
            files={"file": ("test_audio.wav", audio_bytes, "audio/wav")},
            data={"model": AI_STT_MODEL, "response_format": "verbose_json"},
        )
        elapsed = time.time() - t0

    if resp.status_code != 200:
        err(f"Whisper API error: HTTP {resp.status_code}\n{resp.text[:400]}")

    body = resp.json()
    transcript = body.get("text", "").strip()
    language   = body.get("language", "unknown")
    duration   = body.get("duration", 0)

    ok(f"Transcribed in {elapsed:.2f}s | language={language} | audio_duration={duration:.1f}s")

    if transcript:
        ok(f"Transcript: \"{transcript}\"")
    else:
        info("Transcript is empty (expected for a pure tone -- no speech content)")
        transcript = "[silence -- test tone only]"

    return transcript


# -- Stage 3: GPT-4o-mini Scoring ---------------------------------------------

_SPEAKING_SCHEMA = {
    "name": "celpip_speaking_score",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "task_completion":  {"type": "integer", "minimum": 1, "maximum": 12},
            "coherence":        {"type": "integer", "minimum": 1, "maximum": 12},
            "vocabulary":       {"type": "integer", "minimum": 1, "maximum": 12},
            "fluency":          {"type": "integer", "minimum": 1, "maximum": 12},
            "grammar":          {"type": "integer", "minimum": 1, "maximum": 12},
            "estimated_band":   {"type": "number",  "minimum": 1, "maximum": 12},
            "strengths":        {"type": "array", "items": {"type": "string"}, "maxItems": 4},
            "weaknesses":       {"type": "array", "items": {"type": "string"}, "maxItems": 4},
            "improvement_tips": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
            "sample_response":  {"type": "string"},
        },
        "required": [
            "task_completion", "coherence", "vocabulary", "fluency", "grammar",
            "estimated_band", "strengths", "weaknesses", "improvement_tips",
            "sample_response",
        ],
        "additionalProperties": False,
    },
}

_SYSTEM_PROMPT = """\
You are an expert CELPIP speaking examiner. Score the following speaking response
on a scale of 1-12 for each rubric dimension. The candidate was asked to describe a photograph.
Be strict but fair. Return a JSON object matching the requested schema exactly.
"""

_TEST_TRANSCRIPT = (
    "Um, in this photo I can see a busy market. There are, uh, lots of people walking around. "
    "The vendors are selling vegetables and fruits. In the background there are more stalls. "
    "The weather looks nice and sunny. People seem to be enjoying themselves and buying things."
)

_TEST_PROMPT = "Describe the photograph. What is happening? Who is there? What is the atmosphere like?"


async def stage3_scoring(transcript: str) -> dict:
    print("\n--- Stage 3: GPT-4o-mini Scoring ---")
    info(f"Model: {AI_SCORING_MODEL}")

    # If Whisper returned silence, use the canned test transcript for a meaningful score
    if transcript.startswith("[silence"):
        info("Using canned test transcript (Whisper got silence from tone-only audio)")
        transcript = _TEST_TRANSCRIPT

    info(f"Transcript ({len(transcript)} chars): \"{transcript[:80]}…\"")

    payload = {
        "model": AI_SCORING_MODEL,
        "response_format": {"type": "json_schema", "json_schema": _SPEAKING_SCHEMA},
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"PROMPT:\n{_TEST_PROMPT}\n\nTRANSCRIPT:\n{transcript}",
            },
        ],
    }

    async with httpx.AsyncClient(
        base_url="https://api.openai.com/v1",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        timeout=httpx.Timeout(60.0, read=90.0),
    ) as client:
        t0 = time.time()
        resp = await client.post("/chat/completions", json=payload)
        elapsed = time.time() - t0

    if resp.status_code != 200:
        err(f"Scoring API error: HTTP {resp.status_code}\n{resp.text[:400]}")

    body    = resp.json()
    raw     = json.loads(body["choices"][0]["message"]["content"])
    usage   = body["usage"]

    ok(f"Scored in {elapsed:.2f}s | tokens: {usage['prompt_tokens']} prompt + {usage['completion_tokens']} completion")
    ok(f"Estimated band: {raw['estimated_band']}")

    dims = ["task_completion", "coherence", "vocabulary", "fluency", "grammar"]
    scores_str = "  ".join(f"{d.split('_')[0]}={raw[d]}" for d in dims)
    ok(f"Dimensions: {scores_str}")
    s0 = raw['strengths'][0][:60] if raw['strengths'] else "(none)"
    w0 = raw['weaknesses'][0][:60] if raw['weaknesses'] else "(none)"
    t0 = raw['improvement_tips'][0][:60] if raw['improvement_tips'] else "(none)"
    ok(f"Strengths ({len(raw['strengths'])}): {s0!r}")
    ok(f"Weaknesses ({len(raw['weaknesses'])}): {w0!r}")
    ok(f"Tips ({len(raw['improvement_tips'])}): {t0!r}")
    ok(f"Sample response: {len(raw['sample_response'])} chars")

    # Validate all required keys are present
    required = ["task_completion", "coherence", "vocabulary", "fluency", "grammar",
                "estimated_band", "strengths", "weaknesses", "improvement_tips", "sample_response"]
    missing = [k for k in required if k not in raw]
    if missing:
        err(f"Missing keys in scoring response: {missing}")
    ok("All required scoring keys present")

    return raw


# -- Main ---------------------------------------------------------------------

async def main() -> None:
    print("=" * 50)
    print("  CELPIPBro - Speaking Pipeline Validation")
    print("=" * 50)

    test_id  = str(uuid.uuid4())
    test_key = f"audio/validate/{test_id}.wav"

    # Build a 2-second test WAV
    wav_bytes = make_test_wav(duration_ms=2000)
    info(f"Test WAV: {len(wav_bytes):,} bytes, 16 kHz mono, 440 Hz tone, 2s")

    # Stage 1 -- S3
    downloaded = stage1_s3(test_key, wav_bytes)

    # Stage 2 -- Whisper
    transcript = await stage2_whisper(downloaded)

    # Stage 3 -- GPT-4o-mini
    score = await stage3_scoring(transcript)

    # Summary
    print("\n" + "=" * 50)
    print("  Pipeline Summary")
    print("=" * 50)
    ok("Stage 1 (S3):    presigned upload -> PUT -> presigned download -> byte match")
    ok("Stage 2 (Whisper): audio bytes -> transcript via OpenAI STT")
    ok(f"Stage 3 (GPT-4o-mini): transcript -> structured score (band {score['estimated_band']})")
    print()
    print("  Full speaking pipeline validated. All stages PASS.")
    print()


if __name__ == "__main__":
    asyncio.run(main())
