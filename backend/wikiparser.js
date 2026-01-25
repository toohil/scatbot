
async function getWikiContent() {
    const fin = "./study_docs/nhs_medicines_2025-12.zim"
    const arc = new Archive(fin)

    for (const entry of arc.iterByPath()) {
        console.log(`entry: ${entry.path} - ${entry.title}`);
    }
}

getWikiContent()