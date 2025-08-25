import re
import time
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        verify_combat_ui(page)
    finally:
        browser.close()

def verify_combat_ui(page: Page):
    """
    This test verifies the complete combat UI and floating text functionality.
    """
    # 1. Start the game and choose a class
    time.sleep(5) # Wait for server to start
    page.goto("http://localhost:9002/")
    page.wait_for_load_state("networkidle")

    # Expect the main menu to be visible
    try:
        expect(page.get_by_role("heading", name="Bar Quest")).to_be_visible()
    except Exception as e:
        print(page.content())
        raise e

    # Click the "Nouvelle partie" button
    page.get_by_role("button", name="Nouvelle partie").click()

    # Expect to be on the class selection screen
    expect(page.get_by_role("heading", name="Choisissez votre classe")).to_be_visible()

    # Name the hero
    page.get_by_placeholder("Nom du héros").fill("Jules")

    # Choose Berserker
    page.get_by_role("button", name="Berserker").click()

    # 2. Enter a dungeon
    # Expect to be in the town view
    expect(page.get_by_role("heading", name="Ville")).to_be_visible()

    # Click the "Donjons" button
    page.get_by_role("button", name="Donjons").click()

    # Expect to be in the dungeons view
    expect(page.get_by_role("heading", name="Donjons")).to_be_visible()

    # Enter the first dungeon
    page.get_by_role("button", name="Entrer").first.click()

    # 3. Verify the combat UI
    # Expect to be in combat view, wait for enemies to appear
    expect(page.get_by_role("heading", name=re.compile(r"Vague \d+/\d+"))).to_be_visible(timeout=10000)

    # Verify combat log is NOT on the main combat screen
    expect(page.get_by_text("Combat Log")).to_have_count(0)

    # Verify enemies are displayed
    enemy_cards = page.locator('[data-testid^="enemy-card-"]')
    expect(enemy_cards.first).to_be_visible()

    # 4. Verify clicking an enemy targets them
    # The first enemy should be targeted by default (border color)
    first_enemy_card = enemy_cards.first
    expect(first_enemy_card).to_have_class(re.compile(r"border-red-500"))

    # Click the second enemy if it exists
    if enemy_cards.count() > 1:
        second_enemy_card = enemy_cards.nth(1)
        second_enemy_card.click()
        # Expect the second enemy to be targeted now
        expect(second_enemy_card).to_have_class(re.compile(r"border-red-500"))
        # Expect the first enemy to NOT be targeted
        expect(first_enemy_card).not_to_have_class(re.compile(r"border-red-500"))

    # 5. Verify floating combat text
    # Wait for an attack to happen and for floating text to appear.
    # This is tricky because it's asynchronous. We'll wait for a text element to appear.
    floating_text_locator = page.locator('[data-testid^="floating-text-"]')

    # We'll wait up to 15 seconds for any floating text to appear, which should be plenty of time for attacks to start.
    expect(floating_text_locator.first).to_be_visible(timeout=15000)

    # 6. Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
