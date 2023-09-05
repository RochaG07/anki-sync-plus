import AnkiObsidianIntegrationPlugin from 'main';
import { App, PluginSettingTab, Setting } from 'obsidian';


export class settingTab extends PluginSettingTab {
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
		.setName("Attachments folder")
		.setDesc("Select folder for images")
		.addText((text) =>
			text
			.setPlaceholder("Attachments")
			.setValue(this.plugin.settings.attachmentsFolder)
			.onChange(async (value) => {
				this.plugin.settings.attachmentsFolder = value;
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

			new Setting(containerEl)
			.setName('Tags in properties')
			.setDesc('If you activate this setting, it will search for tags within the "tags" field in Props; otherwise, it will search for tags in the rest of the note')
			.addToggle(text => text
				.setValue(this.plugin.settings.tagsInProps)
				.onChange(async () => {
					this.plugin.settings.tagsInProps = !this.plugin.settings.tagsInProps;

					await this.plugin.saveSettings();
					this.display();
			}));
			
			new Setting(containerEl)
			.setName('Excalidraw support')
			.setDesc('Toggle support for excalidraw drawings\n. IMPORTANT: For this feature to work, the option to auto-export has to be enabled as an .svg file on the excalidraw plugin settings')
			.addToggle(text => text
				.setValue(this.plugin.settings.excalidrawSupportEnabled)
				.onChange(async () => {
					this.plugin.settings.excalidrawSupportEnabled = !this.plugin.settings.excalidrawSupportEnabled;

					await this.plugin.saveSettings();
					this.display();
			}));

			if(this.plugin.settings.excalidrawSupportEnabled){
				new Setting(containerEl)
				.setName("Excalidraw attachments folder")
				.setDesc("Select folder for excalidraw auto-exported .svg files")
				.addText((text) =>
					text
					.setPlaceholder("Attachments/Excalidraw")
					.setValue(this.plugin.settings.excalidrawFolder)
					.onChange(async (value) => {
						this.plugin.settings.excalidrawFolder = value;
						await this.plugin.saveSettings();
					}));
			}


	}
}
