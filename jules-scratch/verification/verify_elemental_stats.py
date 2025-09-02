from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000/")

        # Start a new game
        page.get_by_role("button", name="Nouvelle partie").click()
        page.get_by_label("Nom du personnage").click()
        page.get_by_label("Nom du personnage").fill("Jules")
        page.get_by_role("button", name="Berserker").click()
        page.get_by_role("button", name="Commencer la partie").click()

        # Wait for the town view to load
        expect(page.get_by_role("heading", name="Artisanat")).to_be_visible()

        # Give the item to the player
        page.evaluate("""
            () => {
                const { useGameStore } = window.zustand_gameStore;
                const fireRubyAmulet = useGameStore.getState().gameData.items.find(i => i.id === 'amulet_fire_ruby');
                if (fireRubyAmulet) {
                    useGameStore.getState().inventory.items.push({ ...fireRubyAmulet, id: 'test-fire-ruby' });
                }
            }
        """)

        # Go to character view
        page.get_by_role("button", name="Personnage").click()

        # Equip the item
        page.get_by_alt_text("Fire Ruby Amulet").click()

        # Take a screenshot of the stats
        page.screenshot(path="jules-scratch/verification/elemental-stats.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
