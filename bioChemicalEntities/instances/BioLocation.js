class BioLocation {
    cellularLocation;
    cell;
    tissue;
    organ;
    organism;

    constructor({cellularLocation, cell, tissue, organ, organism}) {
        this.cellularLocation = cellularLocation;
        this.cell = cell;
        this.tissue = tissue;
        this.organ = organ;
        this.organism = organism;
    }

    toString() {
        return [
            this.organism,
            this.organ,
            this.tissue,
            this.cell,
            this.cellularLocation,
        ].filter(item => item != null).join("->")
    }
}

export {BioLocation}