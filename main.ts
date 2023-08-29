import { Plugin } from 'obsidian';
import {Converter} from "showdown";

import { handleAddOrUpdateSingleFile, handleDeleteSingleFile, handleScanVault } from 'src/handlers';
import { settingTab } from 'src/settingTab';
import { AnkiObsidianIntegrationSettings } from 'src/interfaces';
import { getBasePath } from 'src/getBasePath';

const DEFAULT_SETTINGS: AnkiObsidianIntegrationSettings = {
	targetFolder: "",
	attachmentsFolder: "",
	regexDisplay: "",
	ignoreTagsDisplay: "",
	excludeTagsDisplay: "",
	exclusionRegex: undefined,
	defaultDeck: "Default",
	ignoreTags: [],
	excludeTags: []
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
			name: "Add/Update all notes on selected folder",
			icon: "dice",
			callback: () => handleScanVault(this.app.vault, this.settings, this.createdDecks),
		});
		this.addRibbonIcon("dice", "Add/Update all notes on selected folder", () => handleScanVault(this.app.vault, this.settings, this.createdDecks));


		this.addCommand({
			id: "addUpdateSingleCardCommand",
			name: "Add/Update card for current note",
			icon: "dice",
			callback: () => handleAddOrUpdateSingleFile(this.app.vault, this.settings, this.createdDecks),
		});
		this.addRibbonIcon('dice', 'Add/Update current note', () => handleAddOrUpdateSingleFile(this.app.vault, this.settings, this.createdDecks));


		this.addCommand({
			id: "deleteSingleCardCommand",
			name: "Delete card for current note",
			icon: "dice",
			callback: () => handleDeleteSingleFile(this.app.vault),
		});
		this.addRibbonIcon('dice', 'Delete current note', () => handleDeleteSingleFile(this.app.vault));


		this.addRibbonIcon('dice', 'test', () => {
		});


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