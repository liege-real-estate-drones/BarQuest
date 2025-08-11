# **App Name**: BarQuest

## Core Features:

- Attack Ring: Attack Ring: Displays an animated SVG ring representing the attack progress. Triggers an action on completion.
- Bars: Bars: Displays health and resource bars for heroes and enemies, along with effect icons.
- Action Strip: Action Strip: Presents three actions (Combat Skill 1, Potion, Retreat) with keyboard shortcuts (1, 2, R).
- Combat Log: Combat Log: Shows a compact log of combat events (hits, crits, dodges, loot, effects) with color-coding.
- Vendors View: Vendors View: Implements views for vendors (Blacksmith, Enchanter, Alchemist, Gambler) with minimal UI for buying, selling, salvaging, enchanting, and gambling.
- Inventory View: Inventory View: Shows the inventory with items, gold, and essences. Allows equipping, salvaging, and basic enchanting.
- Talents View: Talents View: Implements a talent tree view for allocating talents (levels 1-15) for Berserker, Mage, and Druid classes.
- Dungeons View: Dungeons View: Presents a dungeon progression view with corruption levels (0-10), tables, and active modifiers.
- Offline Progress: Offline Progress: Simulates offline progress (up to 120 minutes) based on DPS and average TTK, displaying a "While You Were Away" journal.
- Data Persistence: Data Persistence: Implements saving and loading game state to/from localStorage, with JSON export/import functionality.

## Style Guidelines:

- Use a clear, concise font for the combat log to ensure readability.
- Color-code combat log entries for hits, crits, dodges, loot, and effects to improve information recognition.
- Design the layout around a central arena view.
- Use simple, clear icons.
- Use subtle animations.