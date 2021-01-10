import {Reference} from "./Reference.js";

class PublicationReference extends Reference {
    year;
    title;
    source;
    author;
    url;

    constructor(db, id, comment, year, title, source, author, url) {
        super(db, id, comment);
        this.year = year;
        this.title = title;
        this.source = source;
        this.author = author;
        this.url = url;
    }

    static FromBiopax(xref) {
        return new PublicationReference(
            xref["bp:db"],
            xref["bp:id"],
            xref["bp:comment"],
            xref["bp:year"],
            xref["bp:title"],
            xref["bp:source"],
            xref["bp:author"],
            xref["bp:url"],
        )
    }
}

export {PublicationReference}