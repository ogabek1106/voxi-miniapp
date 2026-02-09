from fastapi import FastAPI

app = FastAPI(title="Voxi Mini App API")

@app.get("/")
async def root():
    return {"status": "ok", "service": "voxi-miniapp-backend"}