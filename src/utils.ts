import { FileManager, Notice, TFile, TFolder, Vault, getAllTags } from 'obsidian';
import * as fs from 'fs';
import { AnkiObsidianIntegrationSettings, card, imagesToSend as imageToSend } from './interfaces';
import { addDeckOnAnki, addImagesOnAnki } from './ankiCommunication';
import { Converter } from 'showdown';

export function getCurrentFile(): TFile | null{
    let editor = this.app.workspace.activeEditor;

    return editor == null ? null : editor?.file
}

export function getFilesOnFolder(path: string, vault: Vault) : TFile[]{
    let folder = vault.getAbstractFileByPath(path);

    if (folder instanceof TFolder) {
        let files = folder.children.filter(child => child instanceof TFile);	

        return files as TFile[];	
    }

    return [];
}

export async function getAnkiCardIdFromFile(noteContent: string): Promise<number | null>{
    let m = noteContent.match(/anki-id: \d+/g)?.toString();

    if (!m) return null;

    return Number(m.match(/\d+/))
}

export function getDeckFromTags(tags: string[]): string{


    let deck = tags[0].slice(1).trim();
    let captalizedLetter = deck.charAt(0).toUpperCase();
    deck = captalizedLetter + deck.slice(1);
    deck = deck.replace(/-/g, " ");

    return deck;
}

export function foundExclusionTags(tags: string[], excludeTags: string[]) : boolean {
    let found = false;

    excludeTags.forEach(excludedTag => {
        if(tags.find(tag => tag === excludedTag) != undefined){
            found = true;
        }
    })

    return found;
}

export async function getInfoFromFile(file: TFile, ignoreTags: string[]) : Promise<{ noteTitle: string; noteContent: string; tags: string[]|null; }>{
    let noteTitle = file.name.substring(0, file.name.length - 3);	
    let noteContent = await this.app.vault.cachedRead(file);

    let tags = getAllTags(this.app.metadataCache.getFileCache(file));

    // Back to obsidian uri
    const obUrl = "obsidian://open?vault="
        + encodeURIComponent(this.app.vault.getName())
        + "&file=" + encodeURIComponent(file.path);
    // Remove YAML(Props) for final card
    noteContent = noteContent.replace(/^---((.|\n)*?)---/g, "").concat(`\n\n[🔗${noteTitle}](${obUrl})`);

    ignoreTags.forEach(ignorableTag => {
        if(tags) tags = tags.filter(tag => tag != ignorableTag)
    })

    return {
        noteTitle, 
        noteContent,
        tags
    }
}

export async function addAnkiIdToNote(file: TFile, id: string, fileManager: FileManager){
    await fileManager.processFrontMatter(file, (frontmatter: any) => {
        frontmatter["anki-id"] = id;
    })
}

export async function removeAnkiIdFromNote(file: TFile, fileManager: FileManager){
    await fileManager.processFrontMatter(file, (frontmatter: any) => {
        delete frontmatter["anki-id"];
    })
}

export function appendSVGToExcalidrawFiles(noteContent: string): string{
    noteContent = noteContent.replace(/.excalidraw/gm, ".excalidraw.svg")

    return noteContent;
}	

export function getImagesFromNote(noteContent: string, basePath:string, attachmentsFolder: string, excalidrawFolder: string = ''): imageToSend[]{

    let images = [...noteContent.matchAll(/!\[\[((.|\n)*?)\]\]/g)]
    .filter(match => match[1].match(/(.png|.jpg|.svg)$/))
    .map(match => {
        return {
            filename: match[1],
            path: getImagePath(match[1], basePath, attachmentsFolder, excalidrawFolder)
        }
    });

    return images;
}	

export function getImagePath(filename: string, basePath:string, attachmentsFolder: string, excalidrawFolder: string = '' ): string{
    if(filename.contains(".excalidraw")){
        return `${basePath}\\${excalidrawFolder}\\${filename}`;
    }

    return `${basePath}\\${attachmentsFolder}\\${filename}`;
}

export function convertImagesMDToHtml(noteContent: string): string{
    let output = noteContent.replace(/!\[\[((.|\n)*?)\]\]/g, "<img src='$1'>");

    return output;
}

export async function convertImageToBase64(filePath: string): Promise<string> {
    try {
        const data = await fs.promises.readFile(filePath);
        const base64String = btoa(String.fromCharCode(...new Uint8Array(data)));

        return base64String;
    } catch (error){
        throw error;
    }
}

export async function prepareCard(file:TFile, settings: AnkiObsidianIntegrationSettings, createdDecks: string[], basePath: string): Promise<card> {
    let {noteTitle, noteContent, tags} = await getInfoFromFile(file, settings.ignoreTags); 

    if(tags && foundExclusionTags(tags, settings.excludeTags)) throw new Error("Found exclusion tag, skipping card...");		
    
    let deck = settings.defaultDeck;
    if(tags && tags.length > 0){
        deck = getDeckFromTags(tags);
    }

    if(!createdDecks.includes(deck)){
        await addDeckOnAnki(deck);
    }

    if(settings.exclusionRegex){
        noteContent = noteContent.replace(settings.exclusionRegex, "");
    }

    if(settings.excalidrawSupportEnabled){
        noteContent = appendSVGToExcalidrawFiles(noteContent)
    }

    let images = getImagesFromNote(noteContent, basePath, settings.attachmentsFolder, settings.excalidrawFolder);

    if(images.length > 0){
        try{
            await addImagesOnAnki(images);
        } catch (error){
            new Notice(`Unable to load one or more images for "${noteTitle}"`);
        }
        
        noteContent = convertImagesMDToHtml(noteContent);
    }

    let htmlConverter = new Converter();

    return {
        front: noteTitle,
        back: htmlConverter.makeHtml(noteContent),
        deck
    }
}