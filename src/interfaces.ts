export interface AnkiObsidianIntegrationSettings {
	targetFolder: string,
	attachmentsFolder: string,
	regexDisplay: string,
	ignoreTagsDisplay: string,
	excludeTagsDisplay: string,
	exclusionRegex: RegExp | undefined,
	defaultDeck: string,
	ignoreTags: string[],
	excludeTags: string[],
	excalidrawSupportEnabled: boolean,
	excalidrawFolder: string,

}

export interface imagesToSend {
    filename: string,
    path: string,
}