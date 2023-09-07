import { TFile, Notice, Vault } from "obsidian";
import { getInfoFromFile, foundExclusionTags, getDeckFromTags, getImagesFromNote, convertImagesMDToHtml, addAnkiIdToNote, extractYamlFromNote, removeAnkiIdFromNote, appendSVGToExcalidrawFiles, prepareCard } from "./utils";
import { addCardOnAnki, addDeckOnAnki, addImagesOnAnki, deleteCardOnAnki, updateCardOnAnki } from "./ankiCommunication";
import { Converter } from "showdown";
import { AnkiObsidianIntegrationSettings, card, imagesToSend } from "./interfaces";
import { getBasePath } from "./getBasePath";



export async function addNewCard( file: TFile, vault: Vault, createdDecks: string[], settings: AnkiObsidianIntegrationSettings){

    let card: card;

    try{
        card = await prepareCard(file, settings, createdDecks, getBasePath(vault))
    } catch (error) {
        console.log(error)
        return;
    }
        
    let ankiId = await addCardOnAnki(card);

    if(ankiId){
        await addAnkiIdToNote(file, ankiId, vault);
    }

    new Notice(`Card created: ${card.front} on ${card.deck}`);
}

export async function updateExistingCard(ankiId:number, file: TFile, vault: Vault, createdDecks: string[], settings: AnkiObsidianIntegrationSettings){
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

        await removeAnkiIdFromNote(file, vault);
    } else {
        new Notice(`Card updated: ${card.front} on ${card.deck}`);
    }  
}

export async function deleteExistingCard(ankiId:number, file: TFile, vault: Vault){
    deleteCardOnAnki(ankiId);

    await removeAnkiIdFromNote(file, vault);

    new Notice(`Card deleted`);
}