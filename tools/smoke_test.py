"""Headless smoke test (Playwright + Chromium) at 390x844.
   Serve the site first:  mkdir -p /tmp/site && ln -sfn "$PWD/docs" /tmp/site/blue-mold && (cd /tmp/site && python3 -m http.server 8765)
   Then: python3 tools/smoke_test.py [screens_dir] [chrome_path]"""
import sys, os, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/screens"
CHROME = sys.argv[2] if len(sys.argv) > 2 else None
BASE = "http://localhost:8765/blue-mold/"
os.makedirs(OUT, exist_ok=True)
errors = []
def shot(p, name): p.screenshot(path=os.path.join(OUT, name)); print("screenshot", name)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CHROME) if CHROME else pw.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    p = ctx.new_page()
    p.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    p.on("pageerror", lambda e: errors.append(str(e)))
    # 1. the ship app
    p.goto(BASE, wait_until="networkidle"); p.wait_for_timeout(4500)
    shot(p, "01-app.png")
    assert p.locator("#btnGame").count() == 1, "game link missing"
    # 2. the game
    p.goto(BASE + "game/", wait_until="networkidle"); p.wait_for_timeout(600)
    shot(p, "02-game-title.png")
    p.click("#btnPlay"); p.wait_for_timeout(500)
    shot(p, "03-briefing.png")
    p.click("#mBtns .btn.big"); p.wait_for_timeout(400)
    shot(p, "04-level1.png")
    # win level 1 by tapping the door (cell index of '+')
    st = p.evaluate("(() => { var s = BMC.state(); return {w: s.g.w, door: s.g.cells.indexOf('+')}; })()")
    pos = p.evaluate("i => { var r = document.getElementById('cv'); return null; }", st["door"])
    c = p.evaluate("""i => { var s=BMC.state(), cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
        var g=s.g, cs=Math.floor(Math.min((r.width-8)/g.w,(r.height-8)/g.h)), ox=Math.round((r.width-cs*g.w)/2), oy=Math.round((r.height-cs*g.h)/2);
        return {x:r.left+ox+(i%g.w+.5)*cs, y:r.top+oy+(Math.floor(i/g.w)+.5)*cs}; }""", st["door"])
    p.mouse.click(c["x"], c["y"]); p.wait_for_timeout(500)
    s = p.evaluate("(() => { var s=BMC.state(); return {sealed: s.sealed[%d], status: s.status, turn: s.turn}; })()" % st["door"])
    print("after tap:", s); assert s["sealed"] == 1, "tap did not seal the door"
    shot(p, "05-level1-sealed.png")
    for _ in range(30):
        if p.evaluate("BMC.state().status") != "play": break
        p.click("#aWait"); p.wait_for_timeout(120)
    p.wait_for_timeout(900)
    status = p.evaluate("BMC.state().status"); print("level 1:", status); assert status == "won"
    shot(p, "06-level1-contained.png")
    assert p.evaluate("BMC.progress().solved[1]") == 3
    # lose path: restart level 1 and only wait
    p.evaluate("BMC.start(1, true)"); p.wait_for_timeout(300)
    for _ in range(30):
        if p.evaluate("BMC.state().status") != "play": break
        p.click("#aWait"); p.wait_for_timeout(80)
    p.wait_for_timeout(900)
    status = p.evaluate("BMC.state().status"); print("level 1 wait-only:", status); assert status == "lost"
    shot(p, "07-breach.png")
    p.click("#mBtns .btn:has-text('Case files')"); p.wait_for_timeout(400)
    shot(p, "08-case-files.png")
    # a later level with vents / cold / torch for the screenshot
    p.evaluate("BMC.start(11, true)"); p.wait_for_timeout(300)
    p.evaluate("BMC.act({t:'wait'}); BMC.act({t:'wait'})"); p.wait_for_timeout(700)
    shot(p, "09-level11.png")
    p.evaluate("BMC.start(12, true)"); p.wait_for_timeout(500)
    shot(p, "10-level12.png")
    p.evaluate("BMC.show('about')"); p.wait_for_timeout(300)
    shot(p, "11-about.png")
    p.goto(BASE + "game/privacy.html"); p.wait_for_timeout(300)
    shot(p, "12-privacy.png")
    sw = p.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.scope))"); print("service workers:", sw)
    b.close()
print("console errors:", json.dumps(errors, indent=1))
sys.exit(1 if errors else 0)
