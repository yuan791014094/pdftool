import os
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pdf2docx import Converter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "pdftool_convert"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@app.post("/api/pdf-to-docx")
async def pdf_to_docx(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 50MB)")

    job_id = uuid.uuid4().hex[:12]
    pdf_path = UPLOAD_DIR / f"{job_id}.pdf"
    docx_path = UPLOAD_DIR / f"{job_id}.docx"

    try:
        pdf_path.write_bytes(content)
        cv = Converter(str(pdf_path))
        cv.convert(str(docx_path))
        cv.close()

        if not docx_path.exists():
            raise HTTPException(500, "Conversion failed")

        out_name = file.filename.rsplit(".", 1)[0] + ".docx"
        return FileResponse(
            str(docx_path),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=out_name,
            headers={"Access-Control-Expose-Headers": "Content-Disposition"},
        )
    finally:
        pdf_path.unlink(missing_ok=True)
        # docx cleaned up after response via background task or next request


@app.on_event("startup")
def cleanup_old_files():
    """Remove leftover files from previous runs."""
    import time
    now = time.time()
    for f in UPLOAD_DIR.iterdir():
        if now - f.stat().st_mtime > 3600:
            f.unlink(missing_ok=True)
