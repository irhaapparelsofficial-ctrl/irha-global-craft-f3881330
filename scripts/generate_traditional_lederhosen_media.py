from __future__ import annotations
import hashlib, io, json, urllib.request
from pathlib import Path
from PIL import Image

SLUG="traditional-knee-length-lederhosen"
LOGO="https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/brand/irha-apparels-official-locked-logo-256.png"
SOURCES={
"front":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:623b2ad2-fb93-4c34-a821-d859b48f3173",
"three-quarter":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:a66cd8c9-1c2a-4f42-b337-84fd15b8acc8",
"side":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:a200e974-a94e-4768-b371-cfb824293901",
"back":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:80922447-35bc-4b0f-a953-bb490caaa44e"}

def get(url:str)->bytes:
    r=urllib.request.Request(url,headers={"User-Agent":"Irha-Media/3.2"})
    with urllib.request.urlopen(r,timeout=120) as x:
        if x.status!=200 or not x.headers.get("content-type","").startswith("image/"): raise RuntimeError(url)
        b=x.read()
        if len(b)>20_000_000: raise RuntimeError("oversize")
        return b

def main():
    base=Path("public/product-media")/SLUG
    for d in (base/"clean",base/"branded",base/"web"): d.mkdir(parents=True,exist_ok=True)
    lb=get(LOGO); lm=Image.open(io.BytesIO(lb)).convert("RGBA")
    if min(lm.size)<200: raise RuntimeError("logo too small")
    m={"product":"Traditional Knee-Length Lederhosen","slug":SLUG,"design":"01","category":"Bavarian & Trachten Wear / Men / Lederhosen","logo_source":LOGO,"logo_sha256":hashlib.sha256(lb).hexdigest(),"logo_rule":"Exact official raster overlay only; no generative redraw","views":[]}
    for view,url in SOURCES.items():
        sb=get(url); src=Image.open(io.BytesIO(sb)).convert("RGBA"); original=src.size
        if src.width!=src.height or min(original)<1200: raise RuntimeError(f"bad dimensions {view} {original}")
        clean=src if original==(2048,2048) else src.resize((2048,2048),Image.Resampling.LANCZOS)
        cp=base/"clean"/f"{SLUG}-design-01-{view}-clean-2048.png"; clean.save(cp,"PNG",compress_level=6)
        logo=lm.copy(); lw=220; logo=logo.resize((lw,round(logo.height*lw/logo.width)),Image.Resampling.LANCZOS); logo.putalpha(logo.getchannel("A").point(lambda v:round(v*.72)))
        x,y=clean.width-logo.width-72,72; branded=clean.copy(); branded.alpha_composite(logo,(x,y))
        bp=base/"branded"/f"{SLUG}-design-01-{view}-branded-2048.png"; branded.save(bp,"PNG",compress_level=6)
        web=branded.convert("RGB"); web.thumbnail((1600,1600),Image.Resampling.LANCZOS)
        wp=base/"web"/f"{SLUG}-design-01-{view}-web-1600.webp"; web.save(wp,"WEBP",quality=86,method=6)
        m["views"].append({"view":view,"source_url":url,"source_dimensions":list(original),"clean_path":str(cp),"branded_path":str(bp),"web_path":str(wp),"master_dimensions":list(branded.size),"web_dimensions":list(web.size),"logo_box":[x,y,logo.width,logo.height],"source_sha256":hashlib.sha256(sb).hexdigest(),"clean_sha256":hashlib.sha256(cp.read_bytes()).hexdigest(),"branded_sha256":hashlib.sha256(bp.read_bytes()).hexdigest(),"web_sha256":hashlib.sha256(wp.read_bytes()).hexdigest()})
    (base/"media-manifest.json").write_text(json.dumps(m,indent=2)+"\n")
if __name__=="__main__": main()
