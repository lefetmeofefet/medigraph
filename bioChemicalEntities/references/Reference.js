const DB_LINK_TEMPLATES = {
    "Reactome": id => `https://reactome.org/content/detail/${id}`,
    "Reactome Database ID Release 75": id => `https://reactome.org/content/detail/${id}`,
    "Pubmed": id => `https://pubmed.ncbi.nlm.nih.gov/24085302/${id}/`,
    "ChEBI": id => `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:${id}`,
    "COMPOUND": id => `https://metacyc.org/META/search-query?type=COMPOUND&name=%20${id}`
}


class Reference {
    db;
    id;
    comment;
    link;

    constructor(db, id, comment) {
        this.db = db;
        this.id = id;
        this.comment = comment;
        if (!DB_LINK_TEMPLATES.hasOwnProperty(db)) {
            console.warn(`Unexpected reference DB: ${db}`)
            this.link = `${db} - ${id}`
        }
        else {
            this.link = DB_LINK_TEMPLATES[db](id)
        }
    }
}

export {Reference}