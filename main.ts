import { Plugin, getAllTags } from 'obsidian';

import { handleAddOrUpdateSingleFile, handleDeleteSingleFile, handleScanVault } from 'src/handlers';
import { settingTab } from 'src/settingTab';
import { AnkiObsidianIntegrationSettings } from 'src/interfaces';
import { getCurrentFile, removeAnkiMetaFromNote } from 'src/utils';

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
}


export default class AnkiObsidianIntegrationPlugin extends Plugin {
	settings: AnkiObsidianIntegrationSettings;
	createdDecks: string[] = [];
	
	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "scanCommand",
			name: "Add/Update cards for all notes of selected folder on Anki",
			icon: "layers",
			callback: () => handleScanVault(this.app.vault, this.settings, this.createdDecks, this.app.fileManager),
		});
		this.addRibbonIcon("layers", "Add/Update cards for all notes of selected folder on Anki", () => handleScanVault(this.app.vault, this.settings, this.createdDecks, this.app.fileManager));


		this.addCommand({
			id: "addUpdateSingleCardCommand",
			name: "Add/Update card for current note on Anki",
			icon: "copy-plus",
			callback: () => handleAddOrUpdateSingleFile(this.app.vault, this.settings, this.createdDecks, this.app.fileManager),
		});
		this.addRibbonIcon('copy-plus', 'Add/Update card for current note on Anki', () => handleAddOrUpdateSingleFile(this.app.vault, this.settings, this.createdDecks, this.app.fileManager));


		this.addCommand({
			id: "deleteSingleCardCommand",
			name: "Delete card for current note on Anki",
			icon: "copy-minus",
			callback: () => handleDeleteSingleFile(this.app.vault, this.app.fileManager),
		});
		this.addRibbonIcon('copy-minus', 'Delete card for  current note on Anki', () => handleDeleteSingleFile(this.app.vault, this.app.fileManager));


		this.addSettingTab(new settingTab(this.app, this));
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