#!/usr/bin/env python3
"""Build pt-site-mockup.html from index2.template.html with base64-inlined assets."""
import base64, html as H, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def b64(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(f"assets/{path}", "rb").read()).decode()

tokens = {
    "ANTON": b64("Anton-400.woff2", "font/woff2"),
    "BARLOW400": b64("Barlow-400.woff2", "font/woff2"),
    "BARLOW600": b64("Barlow-600.woff2", "font/woff2"),
    "BARLOW700": b64("Barlow-700.woff2", "font/woff2"),
    "BADGE": b64("badge.png", "image/png"),
    "HERO": b64("gen-hero-clean.jpg", "image/jpeg"),
    "THUMBLATEST": b64("thumb-latest.jpg", "image/jpeg"),
    "PORTA": b64("port-alex.jpg", "image/jpeg"),
    "PORTT": b64("port-troy.jpg", "image/jpeg"),
    "NOISE": b64("noise.png", "image/png"),
}

EPISODES = [
    ("EP 82", "28 Jun 2026", "The Toxic Masculinity Test That Exposed Us Both", "1 hr 7 min", "thumb-E82-S3E25.jpg"),
    ("EP 81", "21 Jun 2026", "The First Race That Changes Everything", "1 hr 11 min", "thumb-E81-S3E24.jpg"),
    ("EP 79", "7 Jun 2026", "The Birth Crisis No One Is Talking About", "1 hr 6 min", "thumb-E79-S3E22.jpg"),
    ("EP 76", "17 May 2026", "The Sub 2 Hour Marathon That Nobody Will Remember", "1 hr 19 min", "thumb-E76-S3E19.jpg"),
    ("EP 75", "10 May 2026", "I Prepared Like a World Champion and Still Lost", "1 hr 51 min", "thumb-E75-S3E18.jpg"),
    ("EP 74", "3 May 2026", "The Household Product Scam Costing You 10x More Than It Should", "1 hr 0 min", "thumb-E74-S3E17.jpg"),
]

cards = []
for num, date, title, dur, thumb in EPISODES:
    cards.append(f'''<a class="ep-card" href="#">
      <span class="ep-thumb"><img src="{b64(thumb, 'image/jpeg')}" alt="{H.escape(title)} thumbnail"></span>
      <span class="ep-info">
        <span class="ep-top"><span class="ep-num">{num}</span><span class="ep-date">{date}</span><span class="ep-date">{dur}</span></span>
        <h4>{H.escape(title)}</h4>
      </span>
    </a>''')
tokens["EPCARDS"] = "\n".join(cards)

tpl = open("index2.template.html").read()
for k, v in tokens.items():
    tpl = tpl.replace("{{" + k + "}}", v)
assert "{{" not in tpl, "unreplaced token remains"
tpl = tpl.encode("ascii", "xmlcharrefreplace").decode()
open("pt-site-mockup.html", "w").write(tpl)
print("built", os.path.getsize("pt-site-mockup.html") // 1024, "KB")
