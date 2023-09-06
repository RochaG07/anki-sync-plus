import { Plugin } from 'obsidian';

import { handleAddOrUpdateSingleFile, handleDeleteSingleFile, handleScanVault } from 'src/handlers';
import { settingTab } from 'src/settingTab';
import { AnkiObsidianIntegrationSettings } from 'src/interfaces';

const DEFAULT_SETTINGS: AnkiObsidianIntegrationSettings = {
	targetFolder: "",
	attachmentsFolder: "",
	regexDisplay: "",
	ignoreTagsDisplay: "",
	excludeTagsDisplay: "",
	exclusionRegex: undefined,
	defaultDeck: "Default",
	ignoreTags: [],
	excludeTags: [],
	excalidrawSupportEnabled: false,
	excalidrawFolder: "",
	tagsInProps: false
}

export default class AnkiObsidianIntegrationPlugin extends Plugin {
	settings: AnkiObsidianIntegrationSettings;
	basePath: string;

	createdDecks: string[] = [];
	excalidrawSupportActive = true;
	
	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "scanCommand",
			name: "Add/Update cards for all notes of selected folder on Anki",
			icon: "layers",
			callback: () => handleScanVault(this.app.vault, this.settings, this.createdDecks),
		});
		this.addRibbonIcon("layers", "Add/Update cards for all notes of selected folder on Anki", () => handleScanVault(this.app.vault, this.settings, this.createdDecks));


		this.addCommand({
			id: "addUpdateSingleCardCommand",
			name: "Add/Update card for current note on Anki",
			icon: "copy-plus",
			callback: () => handleAddOrUpdateSingleFile(this.app.vault, this.settings, this.createdDecks),
		});
		this.addRibbonIcon('copy-plus', 'Add/Update card for current note on Anki', () => handleAddOrUpdateSingleFile(this.app.vault, this.settings, this.createdDecks));


		this.addCommand({
			id: "deleteSingleCardCommand",
			name: "Delete card for current note on Anki",
			icon: "copy-minus",
			callback: () => handleDeleteSingleFile(this.app.vault),
		});
		this.addRibbonIcon('copy-minus', 'Delete card for  current note on Anki', () => handleDeleteSingleFile(this.app.vault));


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new settingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}