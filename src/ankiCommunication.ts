import { normalizePath } from "obsidian";
import { card, imagesToSend } from "./interfaces";
import { convertImageToBase64 } from "./utils";

export async function addCardOnAnki(card: card): Promise<string | null> {
    const url = "http://localhost:8765/";

    const body = JSON.stringify({
        action: "addNote",
        version: 6,
        params: {
            "note": {
                "deckName": card.deck,
                "modelName": "Basic",
                "fields": {
                    "Front": card.front,
                    "Back": card.back
                    }    
                }
            }
    });

    let response = await fetch(url, {
        method: "post",
        body
    }).then((response) => {
        return response.json();
    }).catch((error) => {	
        console.log(error);

        return null;
    })

    return response.result;
}

export async function updateCardOnAnki(id: number, card: card): Promise<string | null> {
    const url = "http://localhost:8765/";

    const body = JSON.stringify({
        action: "updateNote",
        version: 6,
        params: {
            "note": {
                "id": id,
                "deckName": card.deck,
                "modelName": "Basic",
                "fields": {
                    "Front": card.front,
                    "Back": card.back
                    }    
                }
            }
    });

    let response = await fetch(url, {
        method: "post",
        body
    }).then((response) => {
        return response.json();
    }).catch((error) => {
        console.log(error);
        return error;
    })

    return response.error;
}

export async function deleteCardOnAnki(id: number): Promise<string | null> {
    const url = "http://localhost:8765/";

    const body = JSON.stringify({
        "action": "deleteNotes",
        "version": 6,
        "params": {
            "notes": [id]
        }
    });

    let response = await fetch(url, {
        method: "post",
        body
    }).then((response) => {
        return response.json();
    }).catch((error) => {
        console.log(error);
        return null;
    })

    return response.result;
}

export async function addDeckOnAnki(name: string): Promise<string | null>{
    const url = "http://localhost:8765/";

    const body = JSON.stringify({
        action: "createDeck",
        version: 6,
        params: {
            "deck": name
        }
    });

    let response = await fetch(url, {
        method: "post",
        body
    }).then((response) => {
        return response.json();
    }).catch((error) => {
        console.log(error);
        return null;
    })

    return response.result;
}

export async function addImagesOnAnki(images: imagesToSend[]): Promise<string | null> {
    const url = "http://localhost:8765/";

    const actions = await Promise.all(images.map(async image => {
        let path = normalizePath(image.path);

        const data = await convertImageToBase64(path);

        return {
        "action": "storeMediaFile",
        "params": {
          "filename": image.filename,
          "data": data
        }}
    }));

    const body = JSON.stringify({
        "action": "multi",
        "params": {
          "actions": actions
        }
    });

    let response = await fetch(url, {
        method: "post",
        body
    }).then((response) => {
        return response.json();
    }).catch((error) => {	
        console.log(error);

        return null;
    })

    return response.result;
}