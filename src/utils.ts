import { TFile, Vault } from 'obsidian';
import * as fs from 'fs';

export function getCurrentFile(): TFile | null{
    let editor = this.app.workspace.activeEditor;

    return editor == null ? null : editor?.file
}

export function getFilesOnFolder(folder: string, vault: Vault) : TFile[]{
    const files = vault.getMarkdownFiles().filter(file => file.parent?.path == folder);

    return files;
}

export async function getAnkiCardIdFromFile(noteContent: string): Promise<number | null>{
    let m = noteContent.match(/anki-id: \d+/g)?.toString();

    if (!m) return null;

    return Number(m.match(/\d+/))
}

export function extractYamlFromNote(note: string): string[]{	
    let output:string[] = [];
    let yaml = note.match(/^---((.|\n)*?)---/g)?.toString();

    if(yaml){
        output = [...yaml.replace(/---\n|\n---/g, "").split("\n")];
    }
    
    return output;
}

export function getDeckFromTags(tags: string[]): string{
    let deck = tags[0].slice(1);
    let captalizedLetter = deck.charAt(0).toUpperCase();
    deck = captalizedLetter + deck.slice(1);
    deck = deck.replace("-", " ");

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

export async function getInfoFromFile(file: TFile, ignoreTags: string[]) : Promise<{ noteTitle: string; noteContent: string; tags: string[]; }>{
    let noteTitle = file.name.substring(0, file.name.length - 3);	
    let noteContent = await this.app.vault.cachedRead(file);

    // Remove YAML from noteContent
    noteContent = noteContent.replace(/^---((.|\n)*?)---/g, "");
    
    let tags = [...noteContent.matchAll(/ #[a-zA-Z0-9À-ÿ-]+/g)].map(tag => tag[0].trim());

    ignoreTags.forEach(ignorableTag => {
        tags = tags.filter(tag => tag != ignorableTag)
    })

    return {
        noteTitle, 
        noteContent,
        tags
    }
}

export async function addAnkiIdToNote(file: TFile, id: string, vault: Vault){
    let noteContent = await vault.cachedRead(file);
    let yamlArr = extractYamlFromNote(noteContent)

    await vault.process(file, (data) => {
        let noteWithoutYaml = data.replace(/^---((.|\n)*?)---/g, "");

        yamlArr.push("anki-id: " + id);

        let newData = `---\n${yamlArr.join("\n")}\n---${yamlArr.length == 1 ? "\n":""}${noteWithoutYaml}`

        return newData
    })
}

export async function removeAnkiIdFromNote(file: TFile, vault: Vault){
    let noteContent = await vault.cachedRead(file)

    await vault.process(file, (data) => {
        let yamlArr = extractYamlFromNote(noteContent);
        let noteWithoutYaml = data.replace(/^---((.|\n)*?)---/g, "");

        yamlArr = yamlArr.filter(field => !field.contains("anki-id"));

        let newData
        if(yamlArr.length >= 1){
            newData = `---\n${yamlArr.join("\n")}\n---${noteWithoutYaml}`;
        } else {
            newData = noteWithoutYaml;
        }

        return newData;
    })
}

export function getImagesFromNote(noteContent: string): string[]{

    let images = [...noteContent.matchAll(/!\[\[((.|\n)*?)\]\]/g)].map(image => {
        if(image[1].match(/(.excalidraw)$/)){
            return image[1]+".svg"
        }
        
        return image[1];
    });

    images = images.filter(image => image.match(/(.png|.jpg|.svg)$/));

    return images;
}	

export function convertImagesMDToHtml(noteContent: string): string{
    let output = noteContent.replace(/!\[\[((.|\n)*?)\]\]/g, "<img src='$1'>");

    
    output = output.replace(/.excalidraw/g, ".excalidraw.svg");
    

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