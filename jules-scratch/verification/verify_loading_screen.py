from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Clear localStorage before navigating
    page.goto("http://localhost:9002")
    page.evaluate("localStorage.clear()")
    page.reload()

    # Wait for the "Choose Your Class" screen to be visible
    expect(page.get_by_text("Choose Your Class")).to_be_visible(timeout=30000)

    # Enter a hero name
    page.get_by_placeholder("Enter your hero's name").fill("Jules")

    # Now that we know the class selection screen is visible, we can take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    # Check if the "Choose Berserker" button is visible and enabled
    expect(page.get_by_role("button", name="Choose Berserker")).to_be_visible()
    expect(page.get_by_role("button", name="Choose Berserker")).to_be_enabled()

    print("Successfully loaded the class selection screen and enabled the buttons.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
