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
		.setName("Attackments folder")
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
			

	}
}
