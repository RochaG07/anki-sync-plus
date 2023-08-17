import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, getAllTags } from 'obsidian';
import {Converter} from "showdown";

// Remember to rename these classes and interfaces!

interface AnkiObsidianIntegrationSettings {
	targetFolder: string,
	regexDisplayText: string,
	exclusionRegex: RegExp | undefined,
	ignoreTags: string[],
	excludeTags: string[]
}

const DEFAULT_SETTINGS: AnkiObsidianIntegrationSettings = {
	targetFolder: "",
	regexDisplayText: "",
	exclusionRegex: undefined,
	ignoreTags: [],
	excludeTags: []
}

export default class AnkiObsidianIntegrationPlugin extends Plugin {
	settings: AnkiObsidianIntegrationSettings;
	htmlConverter : Converter;

	ignoreTags: string[] = [];
	excludeTags: string[] = [];
	
	async onload() {
		await this.loadSettings();
		this.htmlConverter = new Converter();

		this.ignoreTags.push("#ignore");
		this.excludeTags.push("#exclude");

		// This creates an icon in the left ribbon.
		const ribbonIconTest = this.addRibbonIcon('dice', 'Test', async () => {
			console.log('test');

			console.log(this.settings.exclusionRegex);

		});


		const ribbonIconScanVault = this.addRibbonIcon('dice', 'Add/Update all notes on selected folder', async () => {
			this.scanVault();
		});

		const ribbonIconAddCurrentFile = this.addRibbonIcon('dice', 'Add/Update current note', async () => {
			this.addOrUpdateCurentFileCard();
		});

		const ribbonIconDeleteCurrentFile = this.addRibbonIcon('dice', 'Delete current note', async () => {
			this.deleteCurentFileCard();
		});

		// Perform additional things with the ribbon
		//ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		//const statusBarItemEl = this.addStatusBarItem();
		//statusBarItemEl.setText('Status Bar Text');

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

			if(ankiId){
				this.updateExistingCard(ankiId, files[i]);
			} else {
				this.addNewCard(files[i]);
			}
		}
	}

	async addOrUpdateCurentFileCard(){
		let file = this.getCurrentFile();
		if (!file) return;

		let ankiId = await this.getAnkiCardIdFromFile(file);

		if(ankiId){
			this.updateExistingCard(ankiId, file);
		} else {
			this.addNewCard(file);
		}
		
	}

	async deleteCurentFileCard(){
		let file = this.getCurrentFile();
		if (!file) return;

		let ankiId = await this.getAnkiCardIdFromFile(file);

		if(ankiId){
			this.deleteExistingCard(ankiId, file);
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

		this.excludeTags.forEach(excludedTag => {
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

		this.ignoreTags.forEach(ignorableTag => {
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
		

		let deck = "Padrão";
		if(tags.length > 0){
			deck = this.getDeckFromTags(tags);
		}

		if(this.settings.exclusionRegex){
			noteContent = noteContent.replace(this.settings.exclusionRegex, "");
		}

		let ankiId = await this.addCardOnAnki(noteTitle, this.htmlConverter.makeHtml(noteContent), deck);

		if(ankiId){
			await this.addIdToNote(file, ankiId);
		}
	}

	async updateExistingCard(ankiId:number, file: TFile){
		let {noteTitle, noteContent, tags} = await this.getInfoFromFile(file);

		if(this.foundExclusionTags(tags)) return;

		let deck = "Padrão";
		if(tags.length > 0){
			deck = this.getDeckFromTags(tags);
		}

		if(this.settings.exclusionRegex){
			noteContent = noteContent.replace(this.settings.exclusionRegex, "");
		}

		this.updateCardOnAnki(ankiId, noteTitle, this.htmlConverter.makeHtml(noteContent), deck);
	}

	async deleteExistingCard(ankiId:number, file: TFile){
		this.deleteCardOnAnki(ankiId);

		let noteContent = await this.app.vault.cachedRead(file);

		// Remove anki id on note
		await this.app.vault.process(file, (data) => {
			let yamlArr = this.extractYamlFromNote(noteContent)
			let noteWithoutYaml = data.replace(/---((.|\n)*)---/g, "");

			yamlArr = yamlArr.filter(field => !field.contains("anki-id"))

			let newData = `---\n${yamlArr.join("\n")}\n---${yamlArr.length == 1 ? "\n":""}${noteWithoutYaml}`

			return newData
		})
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
					"modelName": "Básico",
					"fields": {
						"Frente": front,
						"Verso": back
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
					"modelName": "Básico",
					"fields": {
						"Frente": front,
						"Verso": back
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
			.setPlaceholder("/000/...")
			.setValue(this.plugin.settings.targetFolder)
			.onChange(async (value) => {
				this.plugin.settings.targetFolder = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName('Exclusion regex')
			.setDesc('Regex for ... text for the card ...?')
			.addText(text => text
				.setValue(this.plugin.settings.regexDisplayText)
				.onChange(async (value) => {

					this.plugin.settings.regexDisplayText = value;

					if(this.plugin.settings.regexDisplayText != ""){
						this.plugin.settings.exclusionRegex = new RegExp(value, "g");
					} else {
						this.plugin.settings.exclusionRegex = undefined;
					}

					await this.plugin.saveSettings();
				}));
			

	}
}
