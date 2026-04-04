import httpx
import re
import asyncio

async def test():
    try:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            res = await client.get("https://www.morganmorgan.com", headers={"User-Agent": "Mozilla/5.0"}, follow_redirects=True)
            print("HTTP Status:", res.status_code)
            text = re.sub(r'<[^>]+>', ' ', res.text)[:200]
            print(text)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
