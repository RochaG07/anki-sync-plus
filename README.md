# AnkiSync+
Unlock the power of seamless integration between [Obsidian](https://obsidian.md/) and [Anki](https://apps.ankiweb.net/) with AnkiSync+, a feature-packed plugin designed to enhance your flashcard creation experience.

![](https://github.com/RochaG07/anki-obsidian-integration/blob/master/media/demo.gif)

## ✨ Key Features
- 🗃️ *Automated Card Management:* Scan the selected folder effortlessly to add new cards or update existing ones. Keep your knowledge up-to-date with ease.
- 📃 *Note-Based Card Actions:* Choose to add, update, or delete individual cards directly from your currently selected note. Tailor your flashcards to your evolving learning needs.
- 🏷️ *Organize with Tags:* Organize your flashcards into decks using tags as deck names. The first tag found on a note becomes the deck name, streamlining your card organization.
- ❌ *Tag Exclusion:* Customize deck names by excluding specific tags. Ensure your decks reflect your unique learning preferences.
- 🌫️ *Tag Filtering:* Define tags to exclude during file scans, preventing unwanted tags from cluttering your flashcard collection.
- 🗑️ *Auto Cleanup:* Say goodbye to clutter. Automatically delete the "anki-id" property on notes when cards are removed in Anki during updates.
- 🖼️ *Image Support:* Seamlessly integrate images into your flashcards and notes for enhanced visual learning.
- ✏️ *Excalidraw Integration:* Take your diagrams and visual explanations to the next level with support for embedded [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) drawings.
- 🔡 *Customizable Regex:* Fine-tune card creation by using regular expressions to omit matching text, ensuring that your flashcards are concise and focused.

## 👨‍🔧 Setup
1. Launch Anki and access your preferred profile.
2. Confirm that you have [AnkiConnect](https://ankiweb.net/shared/info/2055492159) installed.
3. In Anki, go to Tools -> Addons -> AnkiConnect -> Configuration, and modify it to match the following settings.
```json
{
    "apiKey": null,
    "apiLogPath": null,
    "ignoreOriginList": [],
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOriginList": [
        "http://localhost",
        "app://obsidian.md"
    ]
}
```