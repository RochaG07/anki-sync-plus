import { TFile, Notice, Vault } from "obsidian";
import { getInfoFromFile, foundExclusionTags, getDeckFromTags, getImagesFromNote, convertImagesMDToHtml, addAnkiIdToNote, extractYamlFromNote, removeAnkiIdFromNote, appendSVGToExcalidrawFiles } from "./utils";
import { addCardOnAnki, addDeckOnAnki, addImagesOnAnki, deleteCardOnAnki, updateCardOnAnki } from "./ankiCommunication";
import { Converter } from "showdown";
import { AnkiObsidianIntegrationSettings, imagesToSend } from "./interfaces";
import { getBasePath } from "./getBasePath";



export async function addNewCard( file: TFile, vault: Vault, createdDecks: string[], settings: AnkiObsidianIntegrationSettings){
    let {noteTitle, noteContent, tags} = await getInfoFromFile(file, settings.ignoreTags);
    

    if(foundExclusionTags(tags, settings.excludeTags)) return;		
    
    let deck = settings.defaultDeck;
    if(tags.length > 0){
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

    let images = getImagesFromNote(noteContent, getBasePath(vault), settings.attachmentsFolder, settings.excalidrawFolder);

    if(images.length > 0){
        await addImagesOnAnki(images);
        noteContent = convertImagesMDToHtml(noteContent);
    }

    let htmlConverter = new Converter();
    let ankiId = await addCardOnAnki(noteTitle, htmlConverter.makeHtml(noteContent), deck);

    if(ankiId){
        await addAnkiIdToNote(file, ankiId, vault);
    }

    new Notice(`Card created: ${noteTitle} on ${deck}`);
}

export async function updateExistingCard(ankiId:number, file: TFile, vault: Vault, settings: AnkiObsidianIntegrationSettings){
    let {noteTitle, noteContent, tags} = await getInfoFromFile(file, settings.ignoreTags);

    if(foundExclusionTags(tags, settings.excludeTags)) return;

    let deck = settings.defaultDeck;
    if(tags.length > 0){
        deck = getDeckFromTags(tags);
    }

    if(settings.exclusionRegex){
        noteContent = noteContent.replace(settings.exclusionRegex, "");
    }

    if(settings.excalidrawSupportEnabled){
        noteContent = appendSVGToExcalidrawFiles(noteContent)
    }

    let images = getImagesFromNote(noteContent, getBasePath(vault), settings.attachmentsFolder, settings.excalidrawFolder);

    if(images.length > 0){
        await addImagesOnAnki(images);
        noteContent = convertImagesMDToHtml(noteContent);
    }

    let htmlConverter = new Converter();
 
    let error = await updateCardOnAnki(ankiId, noteTitle, htmlConverter.makeHtml(noteContent), deck);

    if(error != null){
        new Notice(`Card ${noteTitle} was deleted on Anki!`)

        await removeAnkiIdFromNote(file, vault);
    } else {
        new Notice(`Card updated: ${noteTitle} on ${deck}`);
    }  
}

export async function deleteExistingCard(ankiId:number, file: TFile, vault: Vault){
    deleteCardOnAnki(ankiId);

    await removeAnkiIdFromNote(file, vault);

    new Notice(`Card deleted`);
}