import { FileManager, Notice, Vault } from 'obsidian';
import { getAnkiCardIdFromFile, getCurrentFile, getFilesOnFolder } from './utils';
import { updateExistingCard, addNewCard, deleteExistingCard } from './operations';
import { AnkiObsidianIntegrationSettings } from './interfaces';

let isHandlingAction = false;

export async function handleScanVault(vault: Vault, settings: AnkiObsidianIntegrationSettings, createdDecks: string[], fileManager: FileManager){
    if(settings.targetFolder === ""){
        new Notice("Target folder needs to be set for this action")
        return;
    }

    if(isHandlingAction) return;
    isHandlingAction = true;

    const files = getFilesOnFolder(settings.targetFolder, vault);

    for (let i = 0; i < files.length; i++) {	
        let ankiId = await getAnkiCardIdFromFile(await vault.cachedRead(files[i]));

        try {
            if(ankiId){
                await updateExistingCard(
                    ankiId, 
                    files[i],
                    vault,
                    createdDecks,
                    settings,
                    fileManager
                );
            } else {
                await addNewCard(
                    files[i],
                    vault,
                    createdDecks,
                    settings,
                    fileManager
                );
            }
        } catch (error) {
            new Notice("Error: Could not connect to Anki");
            isHandlingAction = false;
            return;
        }
    }

    isHandlingAction = false;
}

export async function handleAddOrUpdateSingleFile(vault: Vault, settings: AnkiObsidianIntegrationSettings, createdDecks: string[], fileManager: FileManager){
    let file = getCurrentFile();
    if (!file) return;

    if(isHandlingAction) return;
    isHandlingAction = true;

    let ankiId = await getAnkiCardIdFromFile(await vault.cachedRead(file));

    try {
        if(ankiId){
            await updateExistingCard(
                ankiId, 
                file,
                vault,
                createdDecks,
                settings,
                fileManager
            );
        } else {
            await addNewCard(
                file,
                vault,
                createdDecks,
                settings,
                fileManager
            );
        }

    } catch (error) {			
        new Notice("Error")
    } finally {
        isHandlingAction = false;
    }
}

export async function  handleDeleteSingleFile(vault: Vault, fileManager: FileManager){
    let file = getCurrentFile();
    if (!file) return;

    if(isHandlingAction) return;
    isHandlingAction = true;

    let ankiId = await getAnkiCardIdFromFile(await vault.cachedRead(file));

    if (!ankiId) {
        new Notice("Error: Note does not contain anki-id")
        return;
    }

    try {
        await deleteExistingCard(ankiId, file, vault, fileManager);
    } catch (error) {
        new Notice("Error: Could not connect to Anki")
    } finally {
        isHandlingAction = false;
    }
}