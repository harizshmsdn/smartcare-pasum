from starlette.middleware.cors import CORSMiddleware
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.requests import Request
import asyncio

app = Starlette()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.route("/")
def homepage(request: Request):
    return PlainTextResponse("Hello")

async def main():
    from httpx import AsyncClient
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Preflight request
        response = await client.options(
            "/",
            headers={
                "Origin": "https://myapp.netlify.app",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization"
            }
        )
        print("Preflight response headers:", response.headers)

asyncio.run(main())
