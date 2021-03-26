import {DBS, Reference} from "./Reference.js";

class UnificationReference extends Reference {
    idVersion;

    constructor(db, id, comment, idVersion, resourceLink) {
        super(db, id, comment);
        this.idVersion = idVersion;
        this.resourceLink = resourceLink
    }

    static FromBiopax(xref) {
        return new UnificationReference(
            xref["bp:db"],
            xref["bp:id"],
            xref["bp:comment"],
            xref["bp:idVersion"],
        )
    }

    static FromLink(link) {
        if (link.includes("uniprot")) {
            let prefix = "uniprot/"
            let id = link.substring(link.indexOf(prefix) + prefix.length)
            return new UnificationReference(DBS.UniProt, id, null, null, link)
        } else if (link.includes("reactome")) {
            let prefix = "detail/"
            let id = link.substring(link.indexOf(prefix) + prefix.length);
            return new UnificationReference(DBS.Reactome, id, null, null, link)
        } else if (link.includes("chebi")) {
            let prefix = "searchId.do?chebiId=CHEBI:"
            let id = link.substring(link.indexOf(prefix) + prefix.length)
            return new UnificationReference(DBS.ChEBI, id, null, null, link)
        } else {
            throw `Couldn't identify DB from link: ${link}`
        }
    }
}

export {UnificationReference}