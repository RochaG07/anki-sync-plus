import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import {Converter} from "showdown";

// Remember to rename these classes and interfaces!

interface AnkiObsidianIntegrationSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AnkiObsidianIntegrationSettings = {
	mySetting: 'default'
}

export default class AnkiObsidianIntegrationPlugin extends Plugin {
	settings: AnkiObsidianIntegrationSettings;
	htmlConverter : Converter;

	exclusionRegex: RegExp = /# \*\*((.|\n)*)|---((.|\n)*)---/g;

	async onload() {
		await this.loadSettings();
		this.htmlConverter = new Converter();

		// This creates an icon in the left ribbon.
		const ribbonIconScanVault = this.addRibbonIcon('dice', 'Scan vault on selected folder', async () => {
			//await this.scanVault();
			this.addCurentFile();
		});

		const ribbonIconAddCurrentFile = this.addRibbonIcon('dice', 'Add current note', async () => {
			this.addCurentFile();
		});

		// Perform additional things with the ribbon
		//ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

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

	getCurrentFile(): TFile | null{
		let editor = this.app.workspace.activeEditor;

		return editor == null ? null : editor?.file
	}

	addCurentFile(){
		let file = this.getCurrentFile();

		if (!file) return;

		this.addNewCard(file);
	}


	getFilesOnFolder(folder: string) : TFile[]{
		const files = this.app.vault.getMarkdownFiles().filter(file => file.parent?.path == folder);

		return files;
	}

	getAnkiCardIdFromNote(note: string): number | null{
		let m = note.match(/anki-id: \d+/g)?.toString();

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

	getDeckFromTags(tags: RegExpMatchArray[]): string{
		let deck = tags[0][0].slice(1);
		let captalizedLetter = deck.charAt(0).toUpperCase();
		deck = captalizedLetter + deck.slice(1);

		return deck;
	}

	async scanVault(){
		const files = this.getFilesOnFolder("Target Folder");

		for (let i = 0; i < files.length; i++) {	
			this.addNewCard(files[i]);
		}
	}

	async addNewCard(note: TFile){
		let noteTitle = note.name.substring(0, note.name.length - 3);	
		let noteContent = await this.app.vault.cachedRead(note);

		// Card already exists
		let currentAnkiId = this.getAnkiCardIdFromNote(noteContent);
		if(currentAnkiId) return;


		let tags = [...noteContent.matchAll(/#[a-zA-Z0-9À-ÿ]+/g)];

		let deck = "Padrão";
		if(tags.length > 0){
			deck = this.getDeckFromTags(tags);
		}
		
		let noteContentWithExclusion = noteContent.replace(this.exclusionRegex, "");
		let ankiId = await this.sendCardToAnki(noteTitle, this.htmlConverter.makeHtml(noteContentWithExclusion), deck);

		// Add id from created card on note
		await this.app.vault.process(note, (data) => {
			let yamlArr = this.extractYamlFromNote(noteContent)
			let noteWithoutYaml = data.replace(/---((.|\n)*)---/g, "");

			yamlArr.push("anki-id: " + ankiId);

			let newData = `---\n${yamlArr.join("\n")}\n---${yamlArr.length == 1 ? "\n":""}${noteWithoutYaml}`



			return newData
		})


		// TODO Add id from created card on database

	}


	async sendCardToAnki(front: string, back: string, deck: string): Promise<string | null> {
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
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
