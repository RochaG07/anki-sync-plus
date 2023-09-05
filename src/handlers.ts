import { Notice, Vault } from 'obsidian';
import { getAnkiCardIdFromFile, getCurrentFile, getFilesOnFolder } from './utils';
import { updateExistingCard, addNewCard, deleteExistingCard } from './operations';
import { AnkiObsidianIntegrationSettings } from './interfaces';

export async function handleScanVault(vault: Vault, settings: AnkiObsidianIntegrationSettings, createdDecks: string[]){
    if(settings.targetFolder === ""){
        new Notice("Target folder needs to be set for this action")
        return;
    }

    const files = getFilesOnFolder(settings.targetFolder, vault);

    for (let i = 0; i < files.length; i++) {	
        let ankiId = await getAnkiCardIdFromFile(await vault.cachedRead(files[i]));

        try {
            if(ankiId){
                await updateExistingCard(
                    ankiId, 
                    files[i],
                    vault,
                    settings
                );
            } else {
                await addNewCard(
                    files[i],
                    vault,
                    createdDecks,
                    settings
                );
            }
        } catch (error) {
            new Notice("Error: Could not connect to Anki");
            return;
        }
    }
}

export async function handleAddOrUpdateSingleFile(vault: Vault, settings: AnkiObsidianIntegrationSettings, createdDecks: string[]){
    let file = getCurrentFile();
    if (!file) return;

    let ankiId = await getAnkiCardIdFromFile(await vault.cachedRead(file));

    try {
        if(ankiId){
            await updateExistingCard(
                ankiId, 
                file,
                vault,
                settings
            );
        } else {
            await addNewCard(
                file,
                vault,
                createdDecks,
                settings
            );
        }

    } catch (error) {			
        new Notice("Error")
    }
}

export async function  handleDeleteSingleFile(vault: Vault){
    let file = getCurrentFile();
    if (!file) return;

    let ankiId = await getAnkiCardIdFromFile(await vault.cachedRead(file));

    if (!ankiId) {
        new Notice("Error: Note does not contain anki-id")
        return;
    }

    try {
        await deleteExistingCard(ankiId, file, vault);
    } catch (error) {
        new Notice("Error: Could not connect to Anki")
    }
}