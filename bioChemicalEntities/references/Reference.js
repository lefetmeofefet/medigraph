const DBS = {
    Reactome: "Reactome",
    "Reactome Database ID Release 75": "Reactome Database ID Release 75",
    Pubmed: "Pubmed",
    ChEBI: "ChEBI",
    COMPOUND: "COMPOUND",
    Kegg: "Kegg",
    Pubchem: "Pubchem",
    BioCYC: "BioCYC",
    ChemSpider: "ChemSpider",
    Foodb: "Foodb",
    HMDB: "HMDB", // Human metabolome db
    Drugbank: "Drugbank",
    UniProt: "UniProt",
    GeneBank: "GeneBank",
}


const DB_LINK_TEMPLATES = {
    [DBS.Reactome]: id => `https://reactome.org/content/detail/${id}`,
    [DBS["Reactome Database ID Release 75"]]: id => `https://reactome.org/content/detail/${id}`,
    [DBS.Pubmed]: id => `https://pubmed.ncbi.nlm.nih.gov/24085302/${id}/`,
    [DBS.ChEBI]: id => `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:${id}`,
    [DBS.COMPOUND]: id => `https://metacyc.org/META/search-query?type=COMPOUND&name=%20${id}`,
    [DBS.Kegg]: id => `https://www.genome.jp/dbget-bin/www_bget?cpd:${id}`,
    [DBS.Pubchem]: id => ``,
    [DBS.BioCYC]: id => ``,
    [DBS.ChemSpider]: id => ``,
    [DBS.Foodb]: id => ``,
    [DBS.UniProt]: id => `https://www.uniprot.org/uniprot/${id}`,
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

export {Reference, DBS}