import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, getAllTags } from 'obsidian';
import {Converter} from "showdown";

// Remember to rename these classes and interfaces!

interface AnkiObsidianIntegrationSettings {
	targetFolder: string,
	regexDisplay: string,
	ignoreTagsDisplay: string,
	excludeTagsDisplay: string,
	exclusionRegex: RegExp | undefined,
	defaultDeck: string,
	ignoreTags: string[],
	excludeTags: string[]
}

const DEFAULT_SETTINGS: AnkiObsidianIntegrationSettings = {
	targetFolder: "",
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
	htmlConverter : Converter;

	createdDecks: string[] = [];
	
	async onload() {
		await this.loadSettings();
		this.htmlConverter = new Converter();

		// scanVault
		this.addCommand({
			id: "scanCommand",
			name: "Add/Update all notes on selected folder",
			icon: "dice",
			callback: () => this.scanVault(),
		});
		this.addRibbonIcon("dice", "Add/Update all notes on selected folder", () => this.scanVault());

		// addOrUpdateCurentFileCard
		this.addCommand({
			id: "addUpdateSingleCardCommand",
			name: "Add/Update card for current note",
			icon: "dice",
			callback: () => this.addOrUpdateCurentFileCard(),
		});
		this.addRibbonIcon('dice', 'Add/Update current note', () => this.addOrUpdateCurentFileCard());

		// deleteCurentFileCard
		this.addCommand({
			id: "deleteSingleCardCommand",
			name: "Delete card for current note",
			icon: "dice",
			callback: () => this.deleteCurentFileCard(),
		});
		this.addRibbonIcon('dice', 'Delete current note', () => this.deleteCurentFileCard());


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

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

	/// Vault actions 
	async scanVault(){
		if(this.settings.targetFolder === ""){
			new Notice("Target folder required for selected action")
			return;
		}

		const files = this.getFilesOnFolder(this.settings.targetFolder);

		for (let i = 0; i < files.length; i++) {	
			let ankiId = await this.getAnkiCardIdFromFile(files[i]);

			try {
				if(ankiId){
					await this.updateExistingCard(ankiId, files[i]);
				} else {
					await this.addNewCard(files[i]);
				}
			} catch (error) {
				new Notice("Error: Could not connect to Anki")
			}
		}
	}

	async addOrUpdateCurentFileCard(){
		let file = this.getCurrentFile();
		if (!file) return;

		let ankiId = await this.getAnkiCardIdFromFile(file);

		try {
			if(ankiId){
				await this.updateExistingCard(ankiId, file);
			} else {
				await this.addNewCard(file);
			}
		} catch (error) {
			new Notice("Error: Could not connect to Anki")
		}
	}

	async deleteCurentFileCard(){
		let file = this.getCurrentFile();
		if (!file) return;

		let ankiId = await this.getAnkiCardIdFromFile(file);

		if (!ankiId) {
			new Notice("Error: Note does not contain anki-id")
			return;
		}

		try {
			await this.deleteExistingCard(ankiId, file);
		} catch (error) {
			new Notice("Error: Could not connect to Anki")
		}
	}

	/// Utils
	getCurrentFile(): TFile | null{
		let editor = this.app.workspace.activeEditor;

		return editor == null ? null : editor?.file
	}

	getFilesOnFolder(folder: string) : TFile[]{
		const files = this.app.vault.getMarkdownFiles().filter(file => file.parent?.path == folder);

		return files;
	}

	async getAnkiCardIdFromFile(file: TFile): Promise<number | null>{
		let noteContent = await this.app.vault.cachedRead(file);

		let m = noteContent.match(/anki-id: \d+/g)?.toString();

		if (!m) return null;

		return Number(m.match(/\d+/))
	}

	extractYamlFromNote(note: string): string[]{	
		let output:string[] = [];
		let yaml = note.match(/---((.|\n)*)---/g)?.toString();

		if(yaml){
			output = [...yaml.replace(/---\n|\n---/g, "").split("\n")];
		}
		
		return output;
	}

	getDeckFromTags(tags: string[]): string{
		let deck = tags[0].slice(1);
		let captalizedLetter = deck.charAt(0).toUpperCase();
		deck = captalizedLetter + deck.slice(1);

		return deck;
	}

	foundExclusionTags(tags: string[]) : boolean {
		let found = false;

		this.settings.excludeTags.forEach(excludedTag => {
			if(tags.find(tag => tag === excludedTag) != undefined){
				found = true;
			}
		})

		return found;
	}

	async getInfoFromFile(file: TFile) : Promise<{ noteTitle: string; noteContent: string; tags: string[]; }>{
		let noteTitle = file.name.substring(0, file.name.length - 3);	
		let noteContent = await this.app.vault.cachedRead(file);

		// Remove YAML from noteContent
		noteContent = noteContent.replace(/---((.|\n)*)---/g, "");
		
		let tags = [...noteContent.matchAll(/#[a-zA-Z0-9À-ÿ]+/g)].map(tag => tag[0]);

		this.settings.ignoreTags.forEach(ignorableTag => {
			tags = tags.filter(tag => tag != ignorableTag)
		})

		return {
			noteTitle, 
			noteContent,
			tags
		}
	}

	async addIdToNote(file: TFile, id: string){
		let noteContent = await this.app.vault.cachedRead(file);
		let yamlArr = this.extractYamlFromNote(noteContent)

		await this.app.vault.process(file, (data) => {
			let noteWithoutYaml = data.replace(/---((.|\n)*)---/g, "");

			yamlArr.push("anki-id: " + id);

			let newData = `---\n${yamlArr.join("\n")}\n---${yamlArr.length == 1 ? "\n":""}${noteWithoutYaml}`

			return newData
		})
	}


	/// ...
	async addNewCard(file: TFile){
		let {noteTitle, noteContent, tags} = await this.getInfoFromFile(file);

		if(this.foundExclusionTags(tags)) return;
		
		let deck = this.settings.defaultDeck;
		if(tags.length > 0){
			deck = this.getDeckFromTags(tags);
		}

		if(!this.createdDecks.includes(deck)){
			await this.addDeckOnAnki(deck);
		}

		if(this.settings.exclusionRegex){
			noteContent = noteContent.replace(this.settings.exclusionRegex, "");
		}
		
		let ankiId = await this.addCardOnAnki(noteTitle, this.htmlConverter.makeHtml(noteContent), deck);
		
		if(ankiId){
			await this.addIdToNote(file, ankiId);
		}

		new Notice(`Card created: ${noteTitle} on ${deck}`);
	}

	async updateExistingCard(ankiId:number, file: TFile){
		let {noteTitle, noteContent, tags} = await this.getInfoFromFile(file);

		if(this.foundExclusionTags(tags)) return;

		let deck = this.settings.defaultDeck;
		if(tags.length > 0){
			deck = this.getDeckFromTags(tags);
		}

		if(this.settings.exclusionRegex){
			noteContent = noteContent.replace(this.settings.exclusionRegex, "");
		}

		this.updateCardOnAnki(ankiId, noteTitle, this.htmlConverter.makeHtml(noteContent), deck);

		new Notice(`Card updated: ${noteTitle} on ${deck}`);
	}

	async deleteExistingCard(ankiId:number, file: TFile){
		this.deleteCardOnAnki(ankiId);

		let noteContent = await this.app.vault.cachedRead(file);

		// Remove anki id on note
		await this.app.vault.process(file, (data) => {
			let yamlArr = this.extractYamlFromNote(noteContent)
			let noteWithoutYaml = data.replace(/---((.|\n)*)---/g, "");

			yamlArr = yamlArr.filter(field => !field.contains("anki-id"));

			let newData = `---\n${yamlArr.join("\n")}\n---${yamlArr.length == 1 ? "\n":""}${noteWithoutYaml}`;

			return newData;
		})

		new Notice(`Card deleted`);
	}


	/// Anki
	async addCardOnAnki(front: string, back: string, deck: string): Promise<string | null> {
		const url = "http://localhost:8765/";

		const body = JSON.stringify({
			action: "addNote",
			version: 6,
			params: {
				"note": {
					"deckName": deck,
					"modelName": "Basic",
					"fields": {
						"Front": front,
						"Back": back
						}    
					}
				}
		});

		let response = await fetch(url, {
			method: "post",
			body
		}).then((response) => {
			return response.json();
		}).catch((error) => {	
			console.log(error);

			return null;
		})

		return response.result;
	}

	async updateCardOnAnki(id: number, front: string, back: string, deck: string): Promise<string | null> {
		const url = "http://localhost:8765/";

		const body = JSON.stringify({
			action: "updateNote",
			version: 6,
			params: {
				"note": {
					"id": id,
					"deckName": deck,
					"modelName": "Basic",
					"fields": {
						"Front": front,
						"Back": back
						}    
					}
				}
		});

		let response = await fetch(url, {
			method: "post",
			body
		}).then((response) => {
			return response.json();
		}).catch((error) => {
			console.log(error);
			return null;
		})

		return response.result;
	}

	async deleteCardOnAnki(id: number): Promise<string | null> {
		const url = "http://localhost:8765/";

		const body = JSON.stringify({
			"action": "deleteNotes",
			"version": 6,
			"params": {
				"notes": [id]
			}
		});

		let response = await fetch(url, {
			method: "post",
			body
		}).then((response) => {
			return response.json();
		}).catch((error) => {
			console.log(error);
			return null;
		})

		return response.result;
	}

	async addDeckOnAnki(name: string): Promise<string | null>{
		const url = "http://localhost:8765/";

		const body = JSON.stringify({
			action: "createDeck",
			version: 6,
			params: {
				"deck": name
			}
		});

		let response = await fetch(url, {
			method: "post",
			body
		}).then((response) => {
			return response.json();
		}).catch((error) => {
			console.log(error);
			return null;
		})

		return response.result;
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: AnkiObsidianIntegrationPlugin;

	constructor(app: App, plugin: AnkiObsidianIntegrationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
		.setName("Target folder")
		.setDesc("Select target folder for file scan")
		.addText((text) =>
			text
			.setPlaceholder("Zettlkasten/Permanent notes")
			.setValue(this.plugin.settings.targetFolder)
			.onChange(async (value) => {
				this.plugin.settings.targetFolder = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName("Default deck")
		.setDesc("Selected deck when there is no valid tags on note during card creation")
		.addText((text) =>
			text
			.setPlaceholder("Default")
			.setValue(this.plugin.settings.defaultDeck)
			.onChange(async (value) => {
				this.plugin.settings.defaultDeck = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Exclusion tags')
		.setDesc('Notes with these tags will NOT be included on card creation')
		.addText(text => text
			.setPlaceholder("#exclude,#WIP,...")
			.setValue(this.plugin.settings.excludeTagsDisplay)
			.onChange(async (value) => {
				this.plugin.settings.excludeTagsDisplay = value;
				this.plugin.settings.excludeTags = this.plugin.settings.excludeTagsDisplay.split(",");

				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Ignore tags')
		.setDesc('Tags that will be ignored at deck creation')
		.addText(text => text
			.setPlaceholder("#ignore,#test,...")
			.setValue(this.plugin.settings.ignoreTagsDisplay)
			.onChange(async (value) => {
				this.plugin.settings.ignoreTagsDisplay = value;
				this.plugin.settings.ignoreTags = this.plugin.settings.ignoreTagsDisplay.split(",");

				await this.plugin.saveSettings();
			}));	

		new Setting(containerEl)
			.setName('Exclusion regex')
			.setDesc('Regex for removing matching text for card creation from the original note')
			.addText(text => text
				.setValue(this.plugin.settings.regexDisplay)
				.onChange(async (value) => {

					this.plugin.settings.regexDisplay = value;

					if(this.plugin.settings.regexDisplay != ""){
						this.plugin.settings.exclusionRegex = new RegExp(value, "g");
					} else {
						this.plugin.settings.exclusionRegex = undefined;
					}

					await this.plugin.saveSettings();
				}));
			

	}
}
