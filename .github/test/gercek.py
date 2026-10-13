import sys, json, urllib.request
from playwright.sync_api import sync_playwright

out = sys.argv[1]
rapor = []

# ESPN tarayıcıdan erişime izin veriyor mu?
for origin in ["https://enskygr234.github.io", "http://localhost:8080"]:
    for u in ["https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=20261012-20261014",
              "https://site.api.espn.com/apis/v2/sports/soccer/tur.1/standings"]:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"Origin": origin, "User-Agent": "Mozilla/5.0"}), timeout=20)
        rapor.append(f"{origin} -> {u.split('soccer/')[1]}: durum={r.status} CORS={r.headers.get('Access-Control-Allow-Origin')}")

with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-web-security'])
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    hatalar = []
    pg.on("pageerror", lambda e: hatalar.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and hatalar.append(m.text))
    pg.goto("http://localhost:8080/")
    pg.wait_for_selector(".match, .empty, .error", timeout=30000)
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f"{out}/1-bugun.png")
    rapor.append(f"bugün maç sayısı: {pg.locator('.match').count()}")
    rapor.append("ligler: " + ", ".join(pg.locator(".league-head .name").all_inner_texts()))
    # Dün (biten maçlar) ve bir maçın detayı
    pg.click(".date[data-d='-1']")
    pg.wait_for_timeout(4000)
    pg.screenshot(path=f"{out}/2-dun.png")
    rapor.append(f"dün maç sayısı: {pg.locator('.match').count()}")
    if pg.locator(".match").count():
        pg.locator(".match").first.click()
        pg.wait_for_selector(".detail-head, .error", timeout=20000); pg.wait_for_timeout(1500)
        pg.screenshot(path=f"{out}/3-detay-olaylar.png")
        for sekme in ["İstatistik", "Kadrolar"]:
            pg.click(f"#seg >> text={sekme}"); pg.wait_for_timeout(800)
            pg.screenshot(path=f"{out}/4-detay-{sekme}.png")
    pg.goto("http://localhost:8080/#/puan/tur.1")
    pg.wait_for_selector(".table, .error, .empty", timeout=20000); pg.wait_for_timeout(1500)
    pg.screenshot(path=f"{out}/5-puan.png", full_page=True)
    rapor.append(f"puan durumu satır: {pg.locator('.table tbody tr').count()}")
    rapor.append("hatalar: " + json.dumps(hatalar, ensure_ascii=False))
    b.close()

open(f"{out}/rapor.txt", "w").write("\n".join(rapor) + "\n")
print("\n".join(rapor))
