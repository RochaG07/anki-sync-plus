import { TFile, Notice, Vault, FileManager } from "obsidian";
import {  addAnkiIdToNote, removeAnkiIdFromNote, prepareCard } from "./utils";
import { addCardOnAnki, deleteCardOnAnki, updateCardOnAnki } from "./ankiCommunication";
import { AnkiObsidianIntegrationSettings, card } from "./interfaces";
import { getBasePath } from "./getBasePath";



export async function addNewCard(file: TFile, vault: Vault, createdDecks: string[], settings: AnkiObsidianIntegrationSettings, fileManager: FileManager){

    let card: card;

    try{
        card = await prepareCard(file, settings, createdDecks, getBasePath(vault))
    } catch (error) {
        console.log(error)
        return;
    }
        
    let ankiId = await addCardOnAnki(card);

    if(ankiId){
        await addAnkiIdToNote(file, ankiId, fileManager);
    }

    new Notice(`Card created: ${card.front} on ${card.deck}`);
}

export async function updateExistingCard(ankiId:number, file: TFile, vault: Vault, createdDecks: string[], settings: AnkiObsidianIntegrationSettings, fileManager: FileManager){
    let card: card;

    try{
        card = await prepareCard(file, settings, createdDecks, getBasePath(vault))
    } catch (error) {
        console.log(error)
        return;
    }
 
    let error = await updateCardOnAnki(ankiId, card);

    if(error != null){
        new Notice(`Card ${card.front} was deleted on Anki!`)

        await removeAnkiIdFromNote(file, fileManager);
    } else {
        new Notice(`Card updated: ${card.front} on ${card.deck}`);
    }  
}

export async function deleteExistingCard(ankiId:number, file: TFile, vault: Vault, fileManager: FileManager){
    deleteCardOnAnki(ankiId);

    await removeAnkiIdFromNote(file, fileManager);

    new Notice(`Card deleted`);
}