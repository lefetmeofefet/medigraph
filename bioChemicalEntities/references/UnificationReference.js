import {Reference} from "./Reference.js";

class UnificationReference extends Reference {
    idVersion;

    constructor(db, id, comment, idVersion) {
        super(db, id, comment);
        this.idVersion = idVersion;
    }

    static FromBiopax(xref) {
        return new UnificationReference(
            xref["bp:db"],
            xref["bp:id"],
            xref["bp:comment"],
            xref["bp:idVersion"],
        )
    }
}

export {UnificationReference}